import { SmartTrafficLightController } from "../controller/SmartTrafficLightController.js";
import { getTrafficLightScript } from "../scripts/index.js";
import type { TrafficLightProvider } from "../types.js";

interface RunningScript {
  name: string;
  abortController: AbortController;
  done: Promise<void>;
}

export class WebScriptRunner {
  private running: RunningScript | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  get scriptName(): string | null {
    return this.running?.name ?? null;
  }

  start(name: string, provider: TrafficLightProvider): Promise<void> {
    return this.lock(async () => {
      const script = getTrafficLightScript(name);

      await this.stopRunning();

      const abortController = new AbortController();
      const running: RunningScript = { name, abortController, done: Promise.resolve() };

      running.done = script.run(new SmartTrafficLightController(provider), abortController.signal)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);

          console.error(`Script ${name} failed: ${message}`);
        })
        .finally(() => {
          if (this.running === running) {
            this.running = null;
          }
        });
      this.running = running;
    });
  }

  stop(): Promise<void> {
    return this.lock(() => this.stopRunning());
  }

  private async stopRunning(): Promise<void> {
    const running = this.running;

    if (!running) {
      return;
    }

    running.abortController.abort();
    await running.done;
  }

  private lock<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);

    this.queue = result.catch(() => {});

    return result;
  }
}
