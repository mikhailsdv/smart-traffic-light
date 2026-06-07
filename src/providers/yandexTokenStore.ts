import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface StoredYandexTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

const tokenStorePath = resolve(".tokens/yandex.json");

export async function readYandexTokens(): Promise<StoredYandexTokens> {
  try {
    return JSON.parse(await readFile(tokenStorePath, "utf8")) as StoredYandexTokens;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export async function writeYandexTokens(tokens: StoredYandexTokens): Promise<void> {
  await mkdir(dirname(tokenStorePath), { recursive: true });
  await writeFile(tokenStorePath, `${JSON.stringify(tokens, null, 2)}\n`);
}
