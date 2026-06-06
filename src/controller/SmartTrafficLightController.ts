import { trafficLightColors, type TrafficLightColor, type TrafficLightController, type TrafficLightProvider, type TrafficLightState } from "../types.js";

export class SmartTrafficLightController implements TrafficLightController {
  constructor(private readonly provider: TrafficLightProvider) {}

  async set(state: TrafficLightState): Promise<void> {
    await Promise.all(
      trafficLightColors.map((color) => this.provider.setLight(color, state[color])),
    );
  }

  async setOnly(color: TrafficLightColor): Promise<void> {
    await this.set({
      red: color === "red",
      yellow: color === "yellow",
      green: color === "green",
    });
  }

  async turnOff(): Promise<void> {
    await this.set({
      red: false,
      yellow: false,
      green: false,
    });
  }
}
