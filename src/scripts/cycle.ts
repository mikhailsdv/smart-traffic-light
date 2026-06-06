import type { TrafficLightColor, TrafficLightScript } from "../types.js";
import { delay } from "../utils/delay.js";

const colors: TrafficLightColor[] = ["red", "yellow", "green"];
const delayMs = 500;

export const cycleScript: TrafficLightScript = {
  name: "cycle",
  async run(controller) {
    while (true) {
      for (const color of colors) {
        await controller.setOnly(color);
        await delay(delayMs);
        await controller.turnOff();
      }
    }
  },
};
