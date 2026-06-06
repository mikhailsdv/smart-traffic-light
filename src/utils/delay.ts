export type Delay = (ms: number) => Promise<void>;

export const delay: Delay = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
