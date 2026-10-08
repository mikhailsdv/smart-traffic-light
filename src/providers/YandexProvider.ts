import { getRequiredEnv } from "../env.js";
import { trafficLightColors, type TrafficLightColor, type TrafficLightProvider, type TrafficLightState } from "../types.js";
import { getYandexAccessToken } from "./yandexAuth.js";

const deviceEnvByColor: Record<TrafficLightColor, string> = {
  red: "YANDEX_RED_DEVICE_ID",
  yellow: "YANDEX_YELLOW_DEVICE_ID",
  green: "YANDEX_GREEN_DEVICE_ID",
};

const requestTimeoutMs = 10_000;

type LightAction = readonly [TrafficLightColor, boolean];

export class YandexProvider implements TrafficLightProvider {
  async setLight(color: TrafficLightColor, enabled: boolean): Promise<void> {
    await this.sendActions([[color, enabled]]);
  }

  async setState(state: TrafficLightState): Promise<void> {
    await this.sendActions(trafficLightColors.map((color) => [color, state[color]]));
  }

  private async sendActions(lights: LightAction[]): Promise<void> {
    const body = JSON.stringify({
      devices: lights.map(([color, enabled]) => ({
        id: getRequiredEnv(deviceEnvByColor[color]),
        actions: [
          {
            type: "devices.capabilities.on_off",
            state: {
              instance: "on",
              value: enabled,
            },
          },
        ],
      })),
    });

    let response = await this.postActions(body, await getYandexAccessToken());

    if (response.status === 401) {
      response = await this.postActions(body, await getYandexAccessToken(true));
    }

    if (!response.ok) {
      throw new Error(`Yandex request failed: ${response.status} ${response.statusText}`);
    }
  }

  private async postActions(body: string, token: string): Promise<Response> {
    return fetch("https://api.iot.yandex.net/v1.0/devices/actions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  }
}
