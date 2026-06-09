import { TelegramHeartTrafficLightBot } from "../telegram/TelegramHeartTrafficLightBot.js";
import type { TrafficLightScript } from "../types.js";

export const telegramHeartsScript: TrafficLightScript = {
  name: "telegram-hearts",
  async run(controller) {
    const bot = new TelegramHeartTrafficLightBot(controller);

    await bot.start();
    await new Promise<never>(() => {});
  },
};
