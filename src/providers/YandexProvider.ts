import { getRequiredEnv } from "../env.js";
import { trafficLightColors, type TrafficLightColor, type TrafficLightProvider, type TrafficLightState } from "../types.js";
import { assertYandexActionsDone, getYandexOnOffState, requestYandexIot, type YandexDeviceActionsResponse, type YandexDeviceStateResponse } from "./yandexApi.js";

const deviceEnvByColor: Record<TrafficLightColor, string> = {
  red: "YANDEX_RED_DEVICE_ID",
  yellow: "YANDEX_YELLOW_DEVICE_ID",
  green: "YANDEX_GREEN_DEVICE_ID",
};

type LightAction = readonly [TrafficLightColor, boolean];

export class YandexProvider implements TrafficLightProvider {
  async setLight(color: TrafficLightColor, enabled: boolean): Promise<void> {
    await this.sendActions([[color, enabled]]);
  }

  async setState(state: TrafficLightState): Promise<void> {
    await this.sendActions(trafficLightColors.map((color) => [color, state[color]]));
  }

  async getState(): Promise<TrafficLightState> {
    const devices = await Promise.all(trafficLightColors.map((color) => {
      const deviceId = getRequiredEnv(deviceEnvByColor[color]);

      return requestYandexIot<YandexDeviceStateResponse>(`/v1.0/devices/${encodeURIComponent(deviceId)}`);
    }));
    const state = {} as TrafficLightState;

    trafficLightColors.forEach((color, index) => {
      const device = devices[index];

      state[color] = device ? getYandexOnOffState(device) : false;
    });

    return state;
  }

  private async sendActions(lights: LightAction[]): Promise<void> {
    const devices = lights.map(([color, enabled]) => ({
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
    }));
    const response = await requestYandexIot<YandexDeviceActionsResponse>("/v1.0/devices/actions", {
      method: "POST",
      body: { devices },
    });

    assertYandexActionsDone(response, devices.map((device) => device.id));
  }
}
