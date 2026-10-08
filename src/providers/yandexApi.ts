import { getYandexAccessToken } from "./yandexAuth.js";

const baseUrl = "https://api.iot.yandex.net";
const requestTimeoutMs = 10_000;

interface YandexApiResponse {
  request_id?: string;
  status?: string;
  message?: string;
}

interface YandexActionResult {
  status: "DONE" | "ERROR";
  error_code?: string;
  error_message?: string;
}

interface YandexCapabilityActionResult {
  type: string;
  state?: {
    instance: string;
    action_result?: YandexActionResult;
  };
}

interface YandexDeviceActionResult {
  id: string;
  capabilities?: YandexCapabilityActionResult[];
}

export interface YandexDeviceActionsResponse extends YandexApiResponse {
  devices?: YandexDeviceActionResult[];
}

interface YandexIotRequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function formatRequestId(response: YandexApiResponse | undefined): string {
  return response?.request_id ? ` (request_id: ${response.request_id})` : "";
}

function formatActionResult(result: YandexActionResult | undefined): string {
  if (!result) {
    return "no action_result";
  }

  const code = result.error_code ?? result.status;

  return result.error_message ? `${code}: ${result.error_message}` : code;
}

async function sendYandexIotRequest(path: string, options: YandexIotRequestOptions, token: string): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(new URL(path, baseUrl), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? null : JSON.stringify(options.body),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}

export async function requestYandexIot<T>(path: string, options: YandexIotRequestOptions = {}): Promise<T> {
  let response = await sendYandexIotRequest(path, options, await getYandexAccessToken());

  if (response.status === 401) {
    response = await sendYandexIotRequest(path, options, await getYandexAccessToken(true));
  }

  const text = await response.text();
  const body = parseJson(text) as YandexApiResponse | undefined;

  if (!response.ok || body?.status !== "ok") {
    const details = body?.message ?? text;

    throw new Error(`Yandex request failed: ${response.status} ${response.statusText}${details ? `: ${details}` : ""}${formatRequestId(body)}`);
  }

  return body as T;
}

export function assertYandexActionsDone(response: YandexDeviceActionsResponse, deviceIds: string[]): void {
  const failures: string[] = [];
  const devicesById = new Map((response.devices ?? []).map((device) => [device.id, device]));

  for (const deviceId of deviceIds) {
    const device = devicesById.get(deviceId);

    if (!device?.capabilities?.length) {
      failures.push(`${deviceId}: no action result`);
      continue;
    }

    for (const capability of device.capabilities) {
      const result = capability.state?.action_result;

      if (result?.status !== "DONE") {
        failures.push(`${deviceId} ${capability.type}: ${formatActionResult(result)}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Yandex action failed: ${failures.join("; ")}${formatRequestId(response)}`);
  }
}
