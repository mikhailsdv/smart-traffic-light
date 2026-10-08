import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { SmartTrafficLightController } from "../controller/SmartTrafficLightController.js";
import { createProvider, isProviderName, providerNames, type ProviderName } from "../providers/createProvider.js";
import { trafficLightColors, type TrafficLightColor, type TrafficLightProvider, type TrafficLightState } from "../types.js";
import { WebScriptRunner } from "./scriptRunner.js";
import { trafficLightUi } from "./ui.js";

const port = Number(process.env.PORT ?? 3_000);
const providers = new Map<ProviderName, TrafficLightProvider>();
const pendingStateReads = new Map<ProviderName, Promise<TrafficLightState>>();
const webScriptNames = ["cycle", "happyBirthday"];
const scriptRunner = new WebScriptRunner();
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

class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
  }
}

function readJson(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();

  if (contentType !== "application/json") {
    return Promise.reject(new HttpError(415, "Content-Type must be application/json"));
  }

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

function getProvider(name: ProviderName): TrafficLightProvider {
  const cachedProvider = providers.get(name);

  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = createProvider(name);

  providers.set(name, provider);

  return provider;
}

function toProviderName(provider: unknown): ProviderName {
  if (provider === undefined || provider === null) {
    return "tasmota";
  }

  if (typeof provider !== "string" || !isProviderName(provider)) {
    throw new HttpError(400, `Provider must be one of: ${providerNames.join(", ")}`);
  }

  return provider;
}

function parseProviderName(value: unknown): ProviderName {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("provider" in value)) {
    return "tasmota";
  }

  return toProviderName(value.provider);
}

function getStatus(): { lamps: TrafficLightState; script: string | null } {
  return { lamps: state, script: scriptRunner.scriptName };
}

function parseScriptName(value: unknown): string {
  const script = value && typeof value === "object" && "script" in value ? value.script : undefined;

  if (typeof script !== "string" || !webScriptNames.includes(script)) {
    throw new HttpError(400, `Script must be one of: ${webScriptNames.join(", ")}`);
  }

  return script;
}

function trackState(provider: TrafficLightProvider): TrafficLightProvider {
  const setState = provider.setState?.bind(provider);
  const tracked: TrafficLightProvider = {
    async setLight(color, enabled) {
      await provider.setLight(color, enabled);
      state[color] = enabled;
    },
  };

  if (setState) {
    tracked.setState = async (nextState) => {
      await setState(nextState);
      Object.assign(state, nextState);
    };
  }

  return tracked;
}

async function handleScriptStart(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson(request);
  const provider = getProvider(parseProviderName(body));

  await scriptRunner.start(parseScriptName(body), trackState(provider));
  sendJson(response, 200, getStatus());
}

async function handleScriptStop(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const provider = getProvider(parseProviderName(await readJson(request)));

  await scriptRunner.stop();
  await new SmartTrafficLightController(provider).turnOff();
  Object.assign(state, { red: false, yellow: false, green: false });
  sendJson(response, 200, getStatus());
}

async function readProviderState(name: ProviderName): Promise<TrafficLightState> {
  const provider = getProvider(name);

  if (!provider.getState || scriptRunner.scriptName) {
    return state;
  }

  let pending = pendingStateReads.get(name);

  if (!pending) {
    pending = provider.getState().finally(() => {
      pendingStateReads.delete(name);
    });
    pendingStateReads.set(name, pending);
  }

  const lamps = await pending;

  if (!scriptRunner.scriptName) {
    Object.assign(state, lamps);
  }

  return state;
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

function isFullState(patch: Partial<TrafficLightState>): patch is TrafficLightState {
  return trafficLightColors.every((color) => patch[color] !== undefined);
}

async function handleToggle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson(request);
  const provider = getProvider(parseProviderName(body));
  const patch = parseStatePatch(body);

  await scriptRunner.stop();

  if (provider.setState && isFullState(patch)) {
    await provider.setState(patch);
    Object.assign(state, patch);
    sendJson(response, 200, getStatus());
    return;
  }

  for (const color of trafficLightColors) {
    const enabled = patch[color];

    if (enabled === undefined) {
      continue;
    }

    await provider.setLight(color, enabled);
    state[color] = enabled;
  }

  sendJson(response, 200, getStatus());
}

const server = createServer((request, response) => {
  void (async () => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(response, trafficLightUi);
      return;
    }

    if (request.method === "GET" && url.pathname === "/status") {
      await readProviderState(toProviderName(url.searchParams.get("provider")));
      sendJson(response, 200, getStatus());
      return;
    }

    if (request.method === "POST" && url.pathname === "/scripts/start") {
      await handleScriptStart(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/scripts/stop") {
      await handleScriptStop(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/toggle") {
      await handleToggle(request, response);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  })().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = error instanceof HttpError ? error.statusCode : 500;

    sendJson(response, statusCode, { error: message });
  });
});

server.listen(port, () => {
  console.log(`Traffic light UI: http://localhost:${port}`);
});
