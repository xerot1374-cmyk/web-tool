function parseCsvEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const nextServerActionsAllowedOrigins = parseCsvEnv(
  process.env.NEXT_SERVER_ACTIONS_ALLOWED_ORIGINS,
);
