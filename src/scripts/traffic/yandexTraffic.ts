const requestTimeoutMs = 10_000;

export interface YandexTrafficInfo {
  level: number;
  hint: string | null;
  time: string | null;
}

function getTagValue(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`))?.[1]?.trim() ?? null;
}

export async function getYandexTrafficInfo(regionId: string): Promise<YandexTrafficInfo> {
  const url = new URL("https://export.yandex.ru/bar/reginfo.xml");

  url.searchParams.set("region", regionId);

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Yandex traffic request failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const traffic = xml.match(/<traffic\b[\s\S]*?<\/traffic>/)?.[0] ?? "";
  const levelText = getTagValue(traffic, "level");
  const level = Number(levelText);

  if (!levelText || !Number.isInteger(level)) {
    throw new Error(`No Yandex traffic data for region ${regionId}`);
  }

  return {
    level,
    hint: traffic.match(/<hint lang="ru">([^<]*)<\/hint>/)?.[1]?.trim() ?? null,
    time: getTagValue(traffic, "time"),
  };
}
