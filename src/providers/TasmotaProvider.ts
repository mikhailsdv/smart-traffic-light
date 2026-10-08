import { getRequiredEnv } from "../env.js";
import { trafficLightColors, type TrafficLightColor, type TrafficLightProvider, type TrafficLightState } from "../types.js";

const defaultChannelByColor: Record<TrafficLightColor, string> = {
  red: "Power1",
  yellow: "Power2",
  green: "Power3",
};

const requestTimeoutMs = 5_000;

function getPowerCommand(color: TrafficLightColor, enabled: boolean): string {
  return `${defaultChannelByColor[color]} ${enabled ? "ON" : "OFF"}`;
}

export class TasmotaProvider implements TrafficLightProvider {
  private readonly baseUrl: string;

  constructor(host = getRequiredEnv("TASMOTA_HOST")) {
    this.baseUrl = host.startsWith("http://") || host.startsWith("https://")
      ? host
      : `http://${host}`;
  }

  async setLight(color: TrafficLightColor, enabled: boolean): Promise<void> {
    await this.sendCommand(getPowerCommand(color, enabled));
  }

  async setState(state: TrafficLightState): Promise<void> {
    const commands = trafficLightColors.map((color) => getPowerCommand(color, state[color]));

    await this.sendCommand(`Backlog0 ${commands.join("; ")}`);
  }

  async getState(): Promise<TrafficLightState> {
    const response = await this.sendCommand("State") as Record<string, unknown>;
    const state = {} as TrafficLightState;

    for (const color of trafficLightColors) {
      state[color] = response[defaultChannelByColor[color].toUpperCase()] === "ON";
    }

    return state;
  }

  private async sendCommand(command: string): Promise<unknown> {
    const url = new URL("/cm", this.baseUrl);

    url.searchParams.set("cmnd", command);

    const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });

    if (!response.ok) {
      throw new Error(`Tasmota request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
