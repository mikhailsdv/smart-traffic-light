import { Dispatcher, filters } from "@mtcute/dispatcher";
import { TelegramClient } from "@mtcute/node";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getRequiredEnv, getRequiredNumberEnv } from "../env.js";
import type { TrafficLightController } from "../types.js";
import { showQr } from "../utils/showQr.js";
import { getTrafficLightColorByHeart } from "./hearts.js";
import { TelegramHeartCommandRunner } from "./TelegramHeartCommandRunner.js";

const sessionPath = resolve(".sessions/telegram.session");

export class TelegramHeartTrafficLightBot {
  private tg: TelegramClient | null = null;
  private dp: Dispatcher | null = null;
  private readonly runner: TelegramHeartCommandRunner;

  constructor(
    private readonly controller: TrafficLightController,
    private readonly apiId = getRequiredNumberEnv("TELEGRAM_API_ID"),
    private readonly apiHash = getRequiredEnv("TELEGRAM_API_HASH"),
    private readonly chatId = getRequiredNumberEnv("TELEGRAM_CHAT_ID"),
  ) {
    this.runner = new TelegramHeartCommandRunner(this.controller);
  }

  async start(): Promise<void> {
    await mkdir(dirname(sessionPath), { recursive: true });

    this.tg = new TelegramClient({
      apiId: this.apiId,
      apiHash: this.apiHash,
      storage: sessionPath,
    });
    this.dp = Dispatcher.for(this.tg);

    const self = await this.tg.start({
      qrCodeHandler: async (url: string, expires: Date) => {
        console.log(`Telegram QR code expires at ${expires.toISOString()}`);
        await showQr(url);
      },
    });

    console.log(`Telegram userbot logged in as ${self.displayName}`);
    console.log(`Listening for heart commands from ${this.chatId}`);

    this.dp.onNewMessage(filters.userId(this.chatId), async (message) => {
      if (message.media?.type === "dice") {
        const color = getTrafficLightColorByHeart(message.media.emoji);

        if (!color) {
          console.log(`Ignored Telegram animation: ${message.media.emoji}`);
          return;
        }

        console.log(`Telegram heart animation: ${message.media.emoji} -> ${color}`);
        this.runner.blinkHeart(color);
        return;
      }

      const color = getTrafficLightColorByHeart(message.text);

      if (!color) {
        console.log(`Ignored Telegram message: ${message.text}`);
        return;
      }

      console.log(`Telegram heart command: ${message.text} -> ${color}`);
      this.runner.blinkHeart(color);
    });
  }
}
