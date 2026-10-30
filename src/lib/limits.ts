/**
 * Largest values the app accepts. Anything above is a typo (99999 lb) and
 * would wreck records and stats for good, so inputs stop at these.
 */
export const LIMITS = {
  /** 1000 kg ≈ 2205 lb, above any leg press sled. */
  weightKg: 1000,
  reps: 1000,
  /** 24 hours. */
  durationSec: 86_400,
  /** 1000 km. */
  distanceM: 1_000_000,
  calories: 20_000,
  steps: 200_000,
} as const;
