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
  await exchangeYandexCode(getCode(process.argv.slice(2)));
  console.log("Yandex tokens saved to .tokens/yandex.json");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
