export const trafficLightColors = ["red", "yellow", "green"] as const;

export type TrafficLightColor = (typeof trafficLightColors)[number];

export type TrafficLightState = Record<TrafficLightColor, boolean>;

export interface TrafficLightProvider {
  setLight(color: TrafficLightColor, enabled: boolean): Promise<void>;
}

export interface TrafficLightController {
  set(state: TrafficLightState): Promise<void>;
  setOnly(color: TrafficLightColor): Promise<void>;
  turnOff(): Promise<void>;
}

export interface TrafficLightScript {
  name: string;
  run(controller: TrafficLightController): Promise<void>;
}
