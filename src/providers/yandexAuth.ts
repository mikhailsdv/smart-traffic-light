import { getRequiredEnv } from "../env.js";

interface YandexTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface YandexTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const scopes = ["iot:view", "iot:control"];
const requestTimeoutMs = 10_000;

let cachedTokens: YandexTokens | null = null;
let pendingRefresh: Promise<string> | null = null;

function getYandexCredentials(): string {
  return Buffer
    .from(`${getRequiredEnv("YANDEX_CLIENT_ID")}:${getRequiredEnv("YANDEX_CLIENT_SECRET")}`)
    .toString("base64");
}

function getExpiresAt(expiresIn?: number): number {
  return Date.now() + (expiresIn ?? 3_600) * 1_000;
}

export function createYandexOAuthUrl(): string {
  const url = new URL("https://oauth.yandex.ru/authorize");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getRequiredEnv("YANDEX_CLIENT_ID"));
  url.searchParams.set("scope", scopes.join(" "));

  return url.href;
}

async function requestYandexToken(params: Record<string, string>): Promise<YandexTokenResponse> {
  const response = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getYandexCredentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`Yandex token request failed: ${response.status} ${response.statusText}\n${responseBody}`);
  }

  return JSON.parse(responseBody) as YandexTokenResponse;
}

export async function exchangeYandexCode(code: string): Promise<string> {
  const tokenResponse = await requestYandexToken({
    grant_type: "authorization_code",
    code,
  });

  if (!tokenResponse.refresh_token) {
    throw new Error("Yandex token response does not contain refresh_token");
  }

  return tokenResponse.refresh_token;
}

export async function getYandexAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedTokens && cachedTokens.expiresAt > Date.now() + 60_000) {
    return cachedTokens.accessToken;
  }

  pendingRefresh ??= refreshYandexAccessToken().finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

async function refreshYandexAccessToken(): Promise<string> {
  const refreshToken = cachedTokens?.refreshToken ?? getRequiredEnv("YANDEX_REFRESH_TOKEN");
  const tokenResponse = await requestYandexToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  cachedTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token ?? refreshToken,
    expiresAt: getExpiresAt(tokenResponse.expires_in),
  };

  return cachedTokens.accessToken;
}
