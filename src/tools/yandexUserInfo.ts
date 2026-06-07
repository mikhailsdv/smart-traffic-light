import "dotenv/config";
import { getYandexAccessToken } from "../providers/yandexAuth.js";

async function main(): Promise<void> {
  const token = await getYandexAccessToken();
  const response = await fetch("https://api.iot.yandex.net/v1.0/user/info", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Yandex request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  console.log(JSON.stringify(JSON.parse(body), null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
