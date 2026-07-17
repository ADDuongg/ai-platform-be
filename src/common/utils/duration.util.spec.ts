import { parseDurationToMs, parseDurationToSeconds } from './duration.util';

describe('duration.util', () => {
  it('parses jwt-style durations', () => {
    expect(parseDurationToSeconds('15m')).toBe(900);
    expect(parseDurationToSeconds('7d')).toBe(604800);
    expect(parseDurationToSeconds('bogus', 42)).toBe(42);
    expect(parseDurationToMs('15m')).toBe(900_000);
  });
});
