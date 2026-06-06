import { getRequiredEnv } from "../env.js";
import type { TrafficLightColor, TrafficLightProvider } from "../types.js";

const defaultChannelByColor: Record<TrafficLightColor, string> = {
  red: "Power1",
  yellow: "Power2",
  green: "Power3",
};

export class TasmotaProvider implements TrafficLightProvider {
  private readonly baseUrl: string;

  constructor(host = getRequiredEnv("TASMOTA_HOST")) {
    this.baseUrl = host.startsWith("http://") || host.startsWith("https://")
      ? host
      : `http://${host}`;
  }

  async setLight(color: TrafficLightColor, enabled: boolean): Promise<void> {
    const channel = defaultChannelByColor[color];
    const command = `${channel} ${enabled ? "ON" : "OFF"}`;
    const url = new URL("/cm", this.baseUrl);

    url.searchParams.set("cmnd", command);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Tasmota request failed: ${response.status} ${response.statusText}`);
    }
  }
}
