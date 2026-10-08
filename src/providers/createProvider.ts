import type { TrafficLightProvider } from "../types.js";
import { TasmotaProvider } from "./TasmotaProvider.js";
import { YandexProvider } from "./YandexProvider.js";

export const providerNames = ["tasmota", "yandex"] as const;

export type ProviderName = (typeof providerNames)[number];

export function isProviderName(value: string): value is ProviderName {
  return providerNames.includes(value as ProviderName);
}

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
