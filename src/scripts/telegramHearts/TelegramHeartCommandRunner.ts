import type { TrafficLightColor, TrafficLightController } from "../../types.js";
import { delay } from "../../utils/delay.js";

const blinkDelayMs = 250;

export class TelegramHeartCommandRunner {
  private runId = 0;
  private queue = Promise.resolve();

  constructor(private readonly controller: TrafficLightController) {}

  blinkHeart(color: TrafficLightColor): void {
    const runId = this.runId + 1;

    this.runId = runId;
    void this.enqueue(() => this.runBlink(runId, color)).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);

      console.error(message);
    });
  }

  private async runBlink(runId: number, color: TrafficLightColor): Promise<void> {
    for (let index = 0; index < 3; index += 1) {
      if (this.isCancelled(runId)) {
        return;
      }

      await this.controller.turnOff();
      await delay(blinkDelayMs);

      if (this.isCancelled(runId)) {
        return;
      }

      await this.controller.setOnly(color);
      await delay(blinkDelayMs);
    }
  }

  private isCancelled(runId: number): boolean {
    return runId !== this.runId;
  }

  private async enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.catch(() => {}).then(task);

    await this.queue;
  }
}
