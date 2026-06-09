import type { TrafficLightColor, TrafficLightScript, TrafficLightState } from "../types.js";
import { delay } from "../utils/delay.js";

type LampPair = readonly [TrafficLightColor, TrafficLightColor];

const delayMs = 3_000;
const pairs: LampPair[] = [
  ["red", "yellow"],
  ["red", "green"],
  ["yellow", "green"],
];

function getRandomPairCandidate(): LampPair {
  const pair = pairs[Math.floor(Math.random() * pairs.length)];

  if (!pair) {
    throw new Error("No lamp pairs configured");
  }

  return pair;
}

function getRandomPair(previousPair: LampPair | null): LampPair {
  let pair = getRandomPairCandidate();

  while (previousPair && pair[0] === previousPair[0] && pair[1] === previousPair[1]) {
    pair = getRandomPairCandidate();
  }

  return pair;
}

function getState(pair: LampPair): TrafficLightState {
  return {
    red: pair.includes("red"),
    yellow: pair.includes("yellow"),
    green: pair.includes("green"),
  };
}

export const happyBirthdayScript: TrafficLightScript = {
  name: "happyBirthday",
  async run(controller) {
    let previousPair: LampPair | null = null;

    while (true) {
      const pair = getRandomPair(previousPair);

      console.log(`Turning on ${pair.join(" + ")}`);
      await controller.set(getState(pair));
      previousPair = pair;
      await delay(delayMs);
    }
  },
};
