import type { TrafficLightColor } from "../types.js";

const colorByHeart = new Map<string, TrafficLightColor>([
  ["❤", "red"],
  ["💛", "yellow"],
  ["💚", "green"],
]);

export function getTrafficLightColorByHeart(value: string): TrafficLightColor | null {
  return colorByHeart.get(value.trim().replaceAll("\uFE0F", "")) ?? null;
}
