import { greenScript } from "./green.js";
import type { TrafficLightScript } from "../types.js";

export const trafficLightScripts: TrafficLightScript[] = [
  greenScript,
];

export function getTrafficLightScript(name: string): TrafficLightScript {
  const script = trafficLightScripts.find((item) => item.name === name);

  if (!script) {
    throw new Error(`Unknown script: ${name}. Available scripts: ${trafficLightScripts.map((item) => item.name).join(", ")}`);
  }

  return script;
}
