import { getRequiredEnv } from "../../env.js";
import type { TrafficLightColor } from "../../types.js";
import { createIndicatorScript } from "../createIndicatorScript.js";
import { getYandexTrafficInfo } from "./yandexTraffic.js";

function getColorByTrafficLevel(level: number): TrafficLightColor {
  if (level <= 3) {
    return "green";
  }

  if (level <= 6) {
    return "yellow";
  }

  return "red";
}

export const trafficScript = createIndicatorScript({
  name: "traffic",
  pollIntervalMs: 5 * 60_000,
  retryIntervalMs: 60_000,
  createReader() {
    const regionId = getRequiredEnv("TRAFFIC_REGION_ID");

    return async () => {
      const traffic = await getYandexTrafficInfo(regionId);

      return {
        color: getColorByTrafficLevel(traffic.level),
        description: `Traffic ${traffic.level}/10 at ${traffic.time ?? "?"} (${traffic.hint ?? "no hint"})`,
      };
    };
  },
});
