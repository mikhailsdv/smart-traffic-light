import type { TrafficLightProvider } from "../types.js";
import { TasmotaProvider } from "./TasmotaProvider.js";
import { YandexProvider } from "./YandexProvider.js";

export type ProviderName = "tasmota" | "yandex";

export function createProvider(name: string): TrafficLightProvider {
  switch (name) {
    case "tasmota":
      return new TasmotaProvider();
    case "yandex":
      return new YandexProvider();
    default:
      throw new Error(`Unknown traffic light provider: ${name}`);
  }
}
