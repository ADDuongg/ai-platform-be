const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Parse Nest/JWT-style durations like `15m`, `7d` into seconds. */
export function parseDurationToSeconds(value: string, fallbackSeconds = 900): number {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) {
    return fallbackSeconds;
  }
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return amount * (UNIT_SECONDS[unit] ?? 1);
}

export function parseDurationToMs(value: string, fallbackMs = 900_000): number {
  return parseDurationToSeconds(value, Math.floor(fallbackMs / 1000)) * 1000;
}
