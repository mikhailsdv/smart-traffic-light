export type Delay = (ms: number, signal?: AbortSignal) => Promise<void>;

export const delay: Delay = (ms, signal) => {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const finish = (): void => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timeout = setTimeout(finish, ms);

    signal?.addEventListener("abort", finish, { once: true });
  });
};
