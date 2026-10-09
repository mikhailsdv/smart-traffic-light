const requestTimeoutMs = 10_000;

interface WaqiResponse {
  status: string;
  data: unknown;
}

interface WaqiFeed {
  aqi?: unknown;
  dominentpol?: string;
  city?: { name?: string };
  time?: { s?: string };
}

export interface AirQualityInfo {
  aqi: number;
  dominantPollutant: string | null;
  station: string | null;
  time: string | null;
}

export async function getWaqiAirQuality(city: string, token: string): Promise<AirQualityInfo> {
  const url = new URL(`https://api.waqi.info/feed/${encodeURI(city)}/`);

  url.searchParams.set("token", token);

  const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });

  if (!response.ok) {
    throw new Error(`WAQI request failed: ${response.status} ${response.statusText}`);
  }

  const body = await response.json() as WaqiResponse;

  if (body.status !== "ok" || !body.data || typeof body.data !== "object") {
    throw new Error(`WAQI request failed: ${typeof body.data === "string" ? body.data : body.status}`);
  }

  const feed = body.data as WaqiFeed;

  if (typeof feed.aqi !== "number") {
    throw new Error(`No WAQI air quality data for ${city}`);
  }

  return {
    aqi: feed.aqi,
    dominantPollutant: feed.dominentpol ?? null,
    station: feed.city?.name ?? null,
    time: feed.time?.s ?? null,
  };
}
