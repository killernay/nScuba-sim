/**
 * Central Nervous System (CNS) oxygen toxicity tracking.
 *
 * Based on NOAA PPO2 time-limit table.
 * CNS% accumulates during exposure and tracks toward the 100% convulsion threshold.
 */

/**
 * NOAA Oxygen Exposure Limits table.
 * Each entry: [maxPPO2, singleExposureLimitMinutes]
 *
 * For PPO2 values between entries, we interpolate.
 * Below 0.60 bar PPO2, CNS accumulation is considered negligible.
 */
const NOAA_CNS_TABLE: [number, number][] = [
  [0.60,  720],
  [0.64,  570],
  [0.68,  480],
  [0.72,  420],
  [0.76,  360],
  [0.80,  300],
  [0.84,  270],
  [0.88,  240],
  [0.92,  210],
  [0.96,  180],
  [1.00,  150],
  [1.04,  135],
  [1.08,  120],
  [1.12,  110],
  [1.16,  100],
  [1.20,   90],
  [1.24,   80],
  [1.28,   75],
  [1.32,   68],
  [1.36,   63],
  [1.40,   57],
  [1.44,   52],
  [1.48,   46],
  [1.52,   43],
  [1.56,   40],
  [1.60,   38],
];

/**
 * CNS accumulation rate in % per minute for a given PPO2.
 *
 * Rate = 100 / timeLimit (where timeLimit is in minutes from NOAA table).
 *
 * @param ppo2  Partial pressure of O2 (bar)
 * @returns CNS percentage accumulated per minute
 */
export function cnsRatePerMinute(ppo2: number): number {
  if (ppo2 < 0.60) return 0;

  // Above table maximum — extrapolate from last entry (very dangerous)
  if (ppo2 >= 1.60) {
    return 100 / 38; // ~2.63%/min
  }

  // Find bounding entries and interpolate
  for (let i = 0; i < NOAA_CNS_TABLE.length - 1; i++) {
    const [p1, t1] = NOAA_CNS_TABLE[i];
    const [p2, t2] = NOAA_CNS_TABLE[i + 1];

    if (ppo2 >= p1 && ppo2 < p2) {
      // Linear interpolation of the time limit
      const fraction = (ppo2 - p1) / (p2 - p1);
      const timeLimit = t1 + (t2 - t1) * fraction;
      return 100 / timeLimit;
    }
  }

  // Exact match on last entry
  return 100 / 38;
}

/**
 * Update cumulative CNS oxygen toxicity.
 *
 * @param currentCns  Current CNS% (0–…, alarm at 100%)
 * @param ppo2        Current partial pressure of O2 (bar)
 * @param dtMin       Time step in minutes
 * @returns Updated CNS%
 */
export function updateCns(currentCns: number, ppo2: number, dtMin: number): number {
  const rate = cnsRatePerMinute(ppo2);
  return currentCns + rate * dtMin;
}
