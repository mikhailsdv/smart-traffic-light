import { getRequiredEnv } from "../../env.js";
import type { TrafficLightColor } from "../../types.js";
import { createIndicatorScript } from "../createIndicatorScript.js";
import { getWaqiAirQuality } from "./waqiAirQuality.js";

function getColorByAqi(aqi: number): TrafficLightColor {
  if (aqi <= 50) {
    return "green";
  }

  if (aqi <= 100) {
    return "yellow";
  }

  return "red";
}

export const airQualityScript = createIndicatorScript({
  name: "airQuality",
  pollIntervalMs: 10 * 60_000,
  retryIntervalMs: 60_000,
  createReader() {
    const city = getRequiredEnv("AIR_QUALITY_CITY");
    const token = getRequiredEnv("WAQI_TOKEN");

    return async () => {
      const air = await getWaqiAirQuality(city, token);

      return {
        color: getColorByAqi(air.aqi),
        description: `AQI ${air.aqi} (${air.dominantPollutant ?? "?"}) at ${air.station ?? city}, ${air.time ?? "?"}`,
      };
    };
  },
});
