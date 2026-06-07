import type { TrafficLightColor, TrafficLightScript } from "../types.js";
import { delay } from "../utils/delay.js";

const colors: TrafficLightColor[] = ["red", "yellow", "green"];
const delayMs = 3_000;

export const cycleScript: TrafficLightScript = {
  name: "cycle",
  async run(controller) {
    while (true) {
      for (const color of colors) {
        console.log(`Turning on ${color}`);
        await controller.setOnly(color);
        console.log(`Waiting ${delayMs}ms`);
        await delay(delayMs);
        console.log("Turning off");
        await controller.turnOff();
        console.log("Turned off");
      }
    }
  },
};
