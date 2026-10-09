import { getRequiredEnv } from "../env.js";
import { getYandexTrafficInfo } from "../traffic/yandexTraffic.js";
import type { TrafficLightColor, TrafficLightScript } from "../types.js";
import { delay } from "../utils/delay.js";

const pollIntervalMs = 5 * 60_000;
const retryIntervalMs = 60_000;

function getColorByTrafficLevel(level: number): TrafficLightColor {
  if (level <= 3) {
    return "green";
  }

  if (level <= 6) {
    return "yellow";
  }

  return "red";
}

export const trafficScript: TrafficLightScript = {
  name: "traffic",
  async run(controller, signal) {
    const regionId = getRequiredEnv("TRAFFIC_REGION_ID");

    while (!signal.aborted) {
      try {
        const traffic = await getYandexTrafficInfo(regionId);
        const color = getColorByTrafficLevel(traffic.level);

        if (signal.aborted) {
          return;
        }

        console.log(`Traffic ${traffic.level}/10 at ${traffic.time ?? "?"} (${traffic.hint ?? "no hint"}) -> ${color}`);
        await controller.setOnly(color);
        await delay(pollIntervalMs, signal);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.error(`Traffic update failed: ${message}`);

        if (signal.aborted) {
          return;
        }

        await controller.turnOff();
        await delay(retryIntervalMs, signal);
      }
    }
  },
};
