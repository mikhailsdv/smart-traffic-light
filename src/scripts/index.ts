import { airQualityScript } from "./airQuality.js";
import { cycleScript } from "./cycle.js";
import { happyBirthdayScript } from "./happyBirthday.js";
import { telegramHeartsScript } from "./telegramHearts.js";
import { trafficScript } from "./traffic.js";
import type { TrafficLightScript } from "../types.js";

export const trafficLightScripts: TrafficLightScript[] = [
  cycleScript,
  happyBirthdayScript,
  telegramHeartsScript,
  trafficScript,
  airQualityScript,
];

export function getTrafficLightScript(name: string): TrafficLightScript {
  const script = trafficLightScripts.find((item) => item.name === name);

  if (!script) {
    throw new Error(`Unknown script: ${name}. Available scripts: ${trafficLightScripts.map((item) => item.name).join(", ")}`);
  }

  return script;
}
