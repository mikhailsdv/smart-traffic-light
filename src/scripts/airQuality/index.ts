import { getRequiredEnv, getRequiredNumberEnv } from "../../env.js";
import type { TrafficLightColor } from "../../types.js";
import { createIndicatorScript } from "../createIndicatorScript.js";
import { getIqairAirQuality, parseIqairUrl, type AirQualityLocation } from "./iqairAirQuality.js";

function getColorByAqi(aqi: number): TrafficLightColor {
  if (aqi <= 50) {
    return "green";
  }

  if (aqi <= 100) {
    return "yellow";
  }

  return "red";
}

function getAirQualityLocation(): AirQualityLocation {
  if (process.env.AIR_QUALITY_LAT || process.env.AIR_QUALITY_LON) {
    return {
      type: "coordinates",
      lat: getRequiredNumberEnv("AIR_QUALITY_LAT"),
      lon: getRequiredNumberEnv("AIR_QUALITY_LON"),
    };
  }

  return parseIqairUrl(getRequiredEnv("AIR_QUALITY_IQAIR_URL"));
}

export const airQualityScript = createIndicatorScript({
  name: "airQuality",
  pollIntervalMs: 10 * 60_000,
  retryIntervalMs: 60_000,
  createReader() {
    const location = getAirQualityLocation();
    const apiKey = getRequiredEnv("IQAIR_API_KEY");

    return async () => {
      const air = await getIqairAirQuality(location, apiKey);

      return {
        color: getColorByAqi(air.aqi),
        description: `AQI ${air.aqi} (${air.dominantPollutant ?? "?"}) at ${air.station ?? "?"}, ${air.time ?? "?"}`,
      };
    };
  },
});
