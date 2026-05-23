function parseCsvEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const nextAllowedDevOrigins = parseCsvEnv(
  process.env.NEXT_ALLOWED_DEV_ORIGINS,
);
