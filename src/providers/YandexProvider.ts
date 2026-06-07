import { getRequiredEnv } from "../env.js";
import type { TrafficLightColor, TrafficLightProvider } from "../types.js";
import { getYandexAccessToken } from "./yandexAuth.js";

const deviceEnvByColor: Record<TrafficLightColor, string> = {
  red: "YANDEX_RED_DEVICE_ID",
  yellow: "YANDEX_YELLOW_DEVICE_ID",
  green: "YANDEX_GREEN_DEVICE_ID",
};

export class YandexProvider implements TrafficLightProvider {
  private readonly tokenPromise = getYandexAccessToken();

  async setLight(color: TrafficLightColor, enabled: boolean): Promise<void> {
    const deviceId = getRequiredEnv(deviceEnvByColor[color]);
    const token = await this.tokenPromise;
    const response = await fetch("https://api.iot.yandex.net/v1.0/devices/actions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        devices: [
          {
            id: deviceId,
            actions: [
              {
                type: "devices.capabilities.on_off",
                state: {
                  instance: "on",
                  value: enabled,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Yandex request failed: ${response.status} ${response.statusText}`);
    }
  }
}
