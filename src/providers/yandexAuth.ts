import { getRequiredEnv } from "../env.js";
import { readYandexTokens, writeYandexTokens, type StoredYandexTokens } from "./yandexTokenStore.js";

interface YandexTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

const scopes = ["iot:view", "iot:control"];
const requestTimeoutMs = 10_000;

let cachedTokens: StoredYandexTokens | null = null;
let pendingRefresh: Promise<string> | null = null;

function getYandexCredentials(): string {
  return Buffer
    .from(`${getRequiredEnv("YANDEX_CLIENT_ID")}:${getRequiredEnv("YANDEX_CLIENT_SECRET")}`)
    .toString("base64");
}

function getExpiresAt(expiresIn?: number): number {
  return Date.now() + (expiresIn ?? 3_600) * 1_000;
}

function toStoredYandexTokens(response: YandexTokenResponse, previousTokens: StoredYandexTokens = {}): StoredYandexTokens {
  const refreshToken = response.refresh_token ?? previousTokens.refreshToken;
  const tokens: StoredYandexTokens = {
    accessToken: response.access_token,
    expiresAt: getExpiresAt(response.expires_in),
  };

  if (refreshToken) {
    tokens.refreshToken = refreshToken;
  }

  return tokens;
}

export function createYandexOAuthUrl(): string {
  const url = new URL("https://oauth.yandex.ru/authorize");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getRequiredEnv("YANDEX_CLIENT_ID"));
  url.searchParams.set("scope", scopes.join(" "));

  return url.href;
}

export async function exchangeYandexCode(code: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
  });

  const response = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getYandexCredentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`Yandex token request failed: ${response.status} ${response.statusText}\n${responseBody}`);
  }

  cachedTokens = toStoredYandexTokens(JSON.parse(responseBody) as YandexTokenResponse);
  await writeYandexTokens(cachedTokens);
}

export async function getYandexAccessToken(forceRefresh = false): Promise<string> {
  cachedTokens ??= await readYandexTokens();

  if (!forceRefresh && cachedTokens.accessToken && cachedTokens.expiresAt && cachedTokens.expiresAt > Date.now() + 60_000) {
    return cachedTokens.accessToken;
  }

  pendingRefresh ??= refreshYandexAccessToken(cachedTokens).finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

async function refreshYandexAccessToken(storedTokens: StoredYandexTokens): Promise<string> {
  const refreshToken = storedTokens.refreshToken ?? process.env.YANDEX_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("Missing Yandex refresh token. Run npm run yandex:oauth-url and npm run yandex:exchange-code -- <code>");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getYandexCredentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`Yandex token request failed: ${response.status} ${response.statusText}\n${responseBody}`);
  }

  const tokenResponse = JSON.parse(responseBody) as YandexTokenResponse;
  const tokens = toStoredYandexTokens(tokenResponse, storedTokens);

  cachedTokens = tokens;
  await writeYandexTokens(tokens);

  return tokenResponse.access_token;
}
