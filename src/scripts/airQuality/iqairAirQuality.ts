const requestTimeoutMs = 10_000;

export type AirQualityLocation =
  | { type: "place"; country: string; state: string; city: string; station: string | null }
  | { type: "coordinates"; lat: number; lon: number };

interface IqairResponse {
  status: string;
  data: unknown;
}

interface IqairPlace {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  current?: {
    pollution?: {
      ts?: string;
      aqius?: unknown;
      mainus?: string;
    };
  };
}

export interface AirQualityInfo {
  aqi: number;
  dominantPollutant: string | null;
  station: string | null;
  time: string | null;
}

function slugToName(slug: string): string {
  return decodeURIComponent(slug)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function parseIqairUrl(value: string): AirQualityLocation {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid IQAir URL: ${value}`);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const start = segments.findIndex((segment) => segment === "air-quality" || segment === "air-quality-map") + 1;
  const [country, state, city, station] = segments.slice(start);

  if (!url.hostname.endsWith("iqair.com") || start === 0 || !country || !state || !city || segments.length > start + 4) {
    throw new Error(`IQAir URL must look like https://www.iqair.com/air-quality[-map]/<country>/<state>/<city>[/<station>]: ${value}`);
  }

  return {
    type: "place",
    country: slugToName(country),
    state: slugToName(state),
    city: slugToName(city),
    station: station ? slugToName(station) : null,
  };
}

function getLocationName(location: AirQualityLocation): string {
  return location.type === "place"
    ? [location.station, location.city, location.state, location.country].filter(Boolean).join(", ")
    : `${location.lat},${location.lon}`;
}

function getErrorMessage(body: IqairResponse): string {
  if (body.data && typeof body.data === "object" && "message" in body.data) {
    return String(body.data.message);
  }

  return body.status;
}

function createRequestUrl(location: AirQualityLocation): URL {
  if (location.type === "coordinates") {
    const url = new URL("https://api.airvisual.com/v2/nearest_city");

    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lon));

    return url;
  }

  const url = new URL(location.station ? "https://api.airvisual.com/v2/station" : "https://api.airvisual.com/v2/city");

  if (location.station) {
    url.searchParams.set("station", location.station);
  }

  url.searchParams.set("city", location.city);
  url.searchParams.set("state", location.state);
  url.searchParams.set("country", location.country);

  return url;
}

export async function getIqairAirQuality(location: AirQualityLocation, apiKey: string): Promise<AirQualityInfo> {
  const url = createRequestUrl(location);

  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
  const body = await response.json().catch(() => null) as IqairResponse | null;

  if (!response.ok || !body || body.status !== "success" || !body.data || typeof body.data !== "object") {
    const reason = body ? getErrorMessage(body) : response.statusText;

    throw new Error(`IQAir request for ${getLocationName(location)} failed: ${response.status} ${reason}`);
  }

  const place = body.data as IqairPlace;
  const pollution = place.current?.pollution;

  if (typeof pollution?.aqius !== "number") {
    throw new Error(`No IQAir air quality data for ${getLocationName(location)}`);
  }

  return {
    aqi: pollution.aqius,
    dominantPollutant: pollution.mainus ?? null,
    station: [place.name, place.city, place.state, place.country].filter(Boolean).join(", ") || null,
    time: pollution.ts ?? null,
  };
}
