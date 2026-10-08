import "dotenv/config";
import { requestYandexIot } from "../providers/yandexApi.js";

async function main(): Promise<void> {
  const userInfo = await requestYandexIot<unknown>("/v1.0/user/info");

  console.log(JSON.stringify(userInfo, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
