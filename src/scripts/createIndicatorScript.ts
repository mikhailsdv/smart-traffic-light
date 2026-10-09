import type { TrafficLightColor, TrafficLightScript } from "../types.js";
import { delay } from "../utils/delay.js";

export interface IndicatorReading {
  color: TrafficLightColor;
  description: string;
}

interface IndicatorScriptOptions {
  name: string;
  pollIntervalMs: number;
  retryIntervalMs: number;
  createReader(): () => Promise<IndicatorReading>;
}

export function createIndicatorScript(options: IndicatorScriptOptions): TrafficLightScript {
  return {
    name: options.name,
    async run(controller, signal) {
      const read = options.createReader();

      while (!signal.aborted) {
        try {
          const reading = await read();

          if (signal.aborted) {
            return;
          }

          console.log(`${reading.description} -> ${reading.color}`);
          await controller.setOnly(reading.color);
          await delay(options.pollIntervalMs, signal);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          console.error(`${options.name} update failed: ${message}`);

          if (signal.aborted) {
            return;
          }

          await controller.turnOff();
          await delay(options.retryIntervalMs, signal);
        }
      }
    },
  };
}
