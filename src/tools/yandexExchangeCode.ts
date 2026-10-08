import "dotenv/config";
import { exchangeYandexCode } from "../providers/yandexAuth.js";

function getCode(argv: string[]): string {
  const code = argv[0];

  if (!code) {
    throw new Error("Usage: npm run yandex:exchange-code -- <code>");
  }

  return code;
}

async function main(): Promise<void> {
  const refreshToken = await exchangeYandexCode(getCode(process.argv.slice(2)));

  console.log("Put this value into .env:");
  console.log(`YANDEX_REFRESH_TOKEN=${refreshToken}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
