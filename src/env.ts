export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getRequiredNumberEnv(name: string): number {
  const value = Number(getRequiredEnv(name));

  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable must be a number: ${name}`);
  }

  return value;
}
