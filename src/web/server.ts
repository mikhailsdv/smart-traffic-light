import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createProvider, type ProviderName } from "../providers/createProvider.js";
import { trafficLightColors, type TrafficLightColor, type TrafficLightProvider, type TrafficLightState } from "../types.js";
import { trafficLightUi } from "./ui.js";

const port = Number(process.env.PORT ?? 3_000);
const providers = new Map<ProviderName, TrafficLightProvider>();
const state: TrafficLightState = {
  red: false,
  yellow: false,
  green: false,
};

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendHtml(response: ServerResponse, body: string): void {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(body);
}

function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function isTrafficLightColor(value: string): value is TrafficLightColor {
  return trafficLightColors.includes(value as TrafficLightColor);
}

function isProviderName(value: string): value is ProviderName {
  return value === "tasmota" || value === "yandex";
}

function getProvider(name: ProviderName): TrafficLightProvider {
  const cachedProvider = providers.get(name);

  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = createProvider(name);

  providers.set(name, provider);

  return provider;
}

function parseProviderName(value: unknown): ProviderName {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("provider" in value)) {
    return "tasmota";
  }

  const provider = value.provider;

  if (typeof provider !== "string" || !isProviderName(provider)) {
    throw new Error("Provider must be tasmota or yandex");
  }

  return provider;
}

function parseStatePatch(value: unknown): Partial<TrafficLightState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be an object");
  }

  const patch: Partial<TrafficLightState> = {};

  for (const [key, enabled] of Object.entries(value)) {
    if (key === "provider") {
      continue;
    }

    if (!isTrafficLightColor(key)) {
      throw new Error(`Unknown lamp: ${key}`);
    }

    if (typeof enabled !== "boolean") {
      throw new Error(`Lamp value must be boolean: ${key}`);
    }

    patch[key] = enabled;
  }

  return patch;
}

async function handleToggle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson(request);
  const provider = getProvider(parseProviderName(body));
  const patch = parseStatePatch(body);

  for (const color of trafficLightColors) {
    const enabled = patch[color];

    if (enabled === undefined) {
      continue;
    }

    await provider.setLight(color, enabled);
    state[color] = enabled;
  }

  sendJson(response, 200, state);
}

const server = createServer((request, response) => {
  void (async () => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(response, trafficLightUi);
      return;
    }

    if (request.method === "GET" && url.pathname === "/status") {
      sendJson(response, 200, state);
      return;
    }

    if (request.method === "POST" && url.pathname === "/toggle") {
      await handleToggle(request, response);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  })().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    sendJson(response, 500, { error: message });
  });
});

server.listen(port, () => {
  console.log(`Traffic light UI: http://localhost:${port}`);
});
