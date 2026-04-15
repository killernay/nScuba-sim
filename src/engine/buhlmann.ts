/**
 * Bühlmann ZHL-16C decompression algorithm.
 *
 * Full 16-compartment model with Gradient Factor support.
 * Tissue state layout: indices 0–15 = N2, indices 16–31 = He.
 */

import { ambientPressure, alveolarPressure } from './gas';

// ─── ZHL-16C Nitrogen compartment parameters ────────────────────
// Each row: [halflife (min), a coefficient (bar), b coefficient]
export const ZHL16C_N2 = [
  //  t½        a          b
  [   5.0,   1.1696,   0.5578 ],  // compartment 1
  [   8.0,   1.0000,   0.6514 ],  // 2
  [  12.5,   0.8618,   0.7222 ],  // 3
  [  18.5,   0.7562,   0.7825 ],  // 4
  [  27.0,   0.6667,   0.8126 ],  // 5
  [  38.3,   0.5600,   0.8434 ],  // 6
  [  54.3,   0.4947,   0.8693 ],  // 7
  [  77.0,   0.4500,   0.8910 ],  // 8
  [ 109.0,   0.4187,   0.9092 ],  // 9
  [ 146.0,   0.3798,   0.9222 ],  // 10
  [ 187.0,   0.3497,   0.9319 ],  // 11
  [ 239.0,   0.3223,   0.9403 ],  // 12
  [ 305.0,   0.2971,   0.9477 ],  // 13
  [ 390.0,   0.2737,   0.9544 ],  // 14
  [ 498.0,   0.2523,   0.9602 ],  // 15
  [ 635.0,   0.2327,   0.9653 ],  // 16
] as const;

// ─── ZHL-16C Helium compartment parameters ──────────────────────
export const ZHL16C_He = [
  [   1.88,  1.6189,  0.4770 ],
  [   3.02,  1.3830,  0.5747 ],
  [   4.72,  1.1919,  0.6527 ],
  [   6.99,  1.0458,  0.7223 ],
  [  10.21,  0.9220,  0.7582 ],
  [  14.48,  0.8205,  0.7957 ],
  [  20.53,  0.7305,  0.8279 ],
  [  29.11,  0.6502,  0.8553 ],
  [  41.20,  0.5950,  0.8757 ],
  [  55.19,  0.5545,  0.8903 ],
  [  70.69,  0.5333,  0.8997 ],
  [  90.34,  0.5189,  0.9073 ],
  [ 115.29,  0.5181,  0.9122 ],
  [ 147.42,  0.5176,  0.9171 ],
  [ 188.24,  0.5172,  0.9217 ],
  [ 240.03,  0.5119,  0.9267 ],
] as const;

const NUM_COMPARTMENTS = 16;
const LN2 = Math.LN2;

// ─── Create initial tissue state ────────────────────────────────
/**
 * Initialise tissue compartments to surface equilibrium.
 * Assumes breathing air (fn2 = 0.79) at 1 bar.
 */
export function createInitialTissues(): number[] {
  const surfaceN2 = alveolarPressure(1.0, 0.79); // ~0.7424 bar
  const tissues: number[] = new Array(NUM_COMPARTMENTS * 2);
  for (let i = 0; i < NUM_COMPARTMENTS; i++) {
    tissues[i] = surfaceN2;       // N2
    tissues[i + NUM_COMPARTMENTS] = 0.0; // He
  }
  return tissues;
}

// ─── Haldane equation ───────────────────────────────────────────
/**
 * Update tissue loadings via the Haldane exponential equation.
 *
 * P_tissue(t) = P_alv + (P_tissue(0) - P_alv) * exp(-k * t)
 * where k = ln(2) / halflife
 *
 * @param tissues  Current tissue pressures for one gas (16 values)
 * @param pAlv     Alveolar (inspired) partial pressure of the gas
 * @param dtMin    Time interval in minutes
 * @param halftimes Array of 16 half-times in minutes
 * @returns New tissue pressures
 */
export function updateTissues(
  tissues: number[],
  pAlv: number,
  dtMin: number,
  halftimes: number[],
): number[] {
  const result = new Array(tissues.length);
  for (let i = 0; i < tissues.length; i++) {
    const k = LN2 / halftimes[i];
    result[i] = pAlv + (tissues[i] - pAlv) * Math.exp(-k * dtMin);
  }
  return result;
}

// ─── Full tissue update (N2 + He) ───────────────────────────────
/**
 * Update all 32 tissue compartments for a given depth, gas, and time step.
 */
export function updateAllTissues(
  tissues: number[],
  depthM: number,
  fn2: number,
  fhe: number,
  dtMin: number,
): number[] {
  const pAmb = ambientPressure(depthM);
  const pAlvN2 = alveolarPressure(pAmb, fn2);
  const pAlvHe = alveolarPressure(pAmb, fhe);

  const n2Halftimes = ZHL16C_N2.map(c => c[0]);
  const heHalftimes = ZHL16C_He.map(c => c[0]);

  const n2Tissues = updateTissues(
    tissues.slice(0, NUM_COMPARTMENTS),
    pAlvN2,
    dtMin,
    n2Halftimes,
  );
  const heTissues = updateTissues(
    tissues.slice(NUM_COMPARTMENTS),
    pAlvHe,
    dtMin,
    heHalftimes,
  );

  return [...n2Tissues, ...heTissues];
}

// ─── Gradient Factor interpolation ──────────────────────────────
/**
 * Gradient Factor at a given ambient pressure.
 * Linear interpolation between GF-Low (at first-stop depth) and
 * GF-High (at the surface).
 */
function gfAtPressure(
  pAmb: number,
  firstStopPressure: number,
  gfLow: number,
  gfHigh: number,
): number {
  if (firstStopPressure <= 1.0) return gfHigh;
  const fraction = (pAmb - 1.0) / (firstStopPressure - 1.0);
  return gfHigh + (gfLow - gfHigh) * fraction;
}

// ─── Ceiling calculation ────────────────────────────────────────
/**
 * Minimum tolerable ambient pressure (bar) across all compartments.
 * Uses the Bühlmann equation: P_tol = (P_tissue - a) * b
 * with combined N2+He a/b coefficients weighted by gas loading.
 *
 * @param tissues  32-element tissue state
 * @param gf       Gradient Factor to apply (0–1), default 1.0
 */
export function getCeilingBar(tissues: number[], gf = 1.0): number {
  let maxPtol = 0;

  for (let i = 0; i < NUM_COMPARTMENTS; i++) {
    const pN2 = tissues[i];
    const pHe = tissues[i + NUM_COMPARTMENTS];
    const pTotal = pN2 + pHe;

    if (pTotal <= 0) continue;

    // Weighted a and b coefficients (Bühlmann combined gas)
    const a = (pN2 * ZHL16C_N2[i][1] + pHe * ZHL16C_He[i][1]) / pTotal;
    const b = (pN2 * ZHL16C_N2[i][2] + pHe * ZHL16C_He[i][2]) / pTotal;

    // Tolerated ambient pressure without GF
    const pTolBuhl = (pTotal - a) * b;

    // Apply Gradient Factor: raise the ceiling (more conservative)
    // P_tol_gf = pAmb_current + (pTolBuhl - pAmb_current) / gf
    // Simplified: at the ceiling itself pAmb = pTol, so:
    // pTol_gf = (pTotal - a * gf) / (gf / b - gf + 1)
    const pTolGf = (pTotal - a * gf) / (gf / b - gf + 1.0);

    if (pTolGf > maxPtol) {
      maxPtol = pTolGf;
    }
  }

  return maxPtol;
}

/**
 * Ceiling depth in metres. Never below 0.
 */
export function getCeilingDepth(tissues: number[], gf = 1.0): number {
  const ceilingBar = getCeilingBar(tissues, gf);
  const depthM = (ceilingBar - 1.0) * 10.0;
  return Math.max(0, depthM);
}

// ─── NDL (No-Decompression Limit) ──────────────────────────────
/**
 * Calculate the time in minutes until any tissue compartment
 * reaches its M-value (surfacing ceiling = 0 m).
 *
 * @param tissues  Current 32-element tissue state
 * @param depth    Current depth in metres
 * @param fn2      Nitrogen fraction of breathing gas
 * @param gfHigh   GF-High value (default 1.0 = full M-values)
 * @returns NDL in minutes, capped at 999
 */
export function getNdl(
  tissues: number[],
  depth: number,
  fn2: number,
  gfHigh = 1.0,
): number {
  const pAmb = ambientPressure(depth);
  const pAlvN2 = alveolarPressure(pAmb, fn2);
  // Assume fhe = 0 for NDL calculation (recreational diving)
  const fhe = 1.0 - fn2 - (pAmb > 0 ? 0 : 0); // placeholder, typically fn2+fo2=1 for no-He
  const pAlvHe = 0;

  let minTime = 999;

  for (let i = 0; i < NUM_COMPARTMENTS; i++) {
    const pN2 = tissues[i];
    const pHe = tissues[i + NUM_COMPARTMENTS];

    // M-value at surface (1 bar) with GF-High
    const aN2 = ZHL16C_N2[i][1];
    const bN2 = ZHL16C_N2[i][2];
    const aHe = ZHL16C_He[i][1];
    const bHe = ZHL16C_He[i][2];

    // For N2 compartment: max tolerated N2 loading at surface
    // P_tol = a + 1.0 / b  (M-value at surface = 1 bar)
    // With GF: P_tol_gf = 1.0 + (a + 1.0/b - 1.0) * gfHigh
    const mValueN2 = aN2 + 1.0 / bN2;
    const maxN2 = 1.0 + (mValueN2 - 1.0) * gfHigh;

    // Time for N2 tissue to reach max loading
    if (pAlvN2 > pN2) {
      const kN2 = LN2 / ZHL16C_N2[i][0];
      // P_tissue(t) = pAlv + (P0 - pAlv) * exp(-k*t)
      // Solve for t when P_tissue = maxN2, considering He loading stays
      const targetN2 = maxN2 - pHe; // rough: He offgasses slowly
      if (targetN2 <= pN2) {
        minTime = 0;
        break;
      }
      if (pAlvN2 > targetN2) {
        const t = -Math.log((targetN2 - pAlvN2) / (pN2 - pAlvN2)) / kN2;
        if (t < minTime) minTime = t;
      }
      // else: tissue can never reach target at this depth = infinite NDL
    }
  }

  return Math.max(0, Math.floor(minTime));
}

// ─── Decompression stops ────────────────────────────────────────
/**
 * Calculate required decompression stops using GF Low/High.
 *
 * @param tissues   Current 32-element tissue state
 * @param currentDepthM  Current depth
 * @param fn2       N2 fraction of deco gas
 * @param fhe       He fraction of deco gas
 * @param gfLow     Gradient Factor Low (e.g. 0.30)
 * @param gfHigh    Gradient Factor High (e.g. 0.85)
 * @param ascentRate Ascent rate in m/min (default 9)
 */
export function getDecoStops(
  tissues: number[],
  currentDepthM: number,
  fn2: number,
  fhe: number,
  gfLow = 1.0,
  gfHigh = 1.0,
  ascentRate = 9,
): { stops: Array<{ depth: number; duration: number }>; tissues: number[] } {
  const stops: Array<{ depth: number; duration: number }> = [];
  let currentTissues = [...tissues];
  let depth = currentDepthM;

  // Find the first stop (ceiling depth rounded up to nearest 3m)
  const firstCeiling = getCeilingDepth(currentTissues, gfLow);
  let firstStopDepth = Math.ceil(firstCeiling / 3) * 3;
  const firstStopPressure = ambientPressure(firstStopDepth);

  // Ascend to each 3m stop
  while (depth > 0) {
    const targetDepth = Math.max(firstStopDepth, 0);
    const nextStop = depth > 3 ? Math.max(depth - 3, 0) : 0;

    // Calculate current GF for this depth
    const pAmb = ambientPressure(depth);
    const gf = gfAtPressure(pAmb, firstStopPressure, gfLow, gfHigh);

    const ceiling = getCeilingDepth(currentTissues, gf);

    if (ceiling <= nextStop) {
      // Can ascend — simulate ascent time
      const ascentTime = 3 / ascentRate; // minutes to ascend 3m
      currentTissues = updateAllTissues(currentTissues, depth - 1.5, fn2, fhe, ascentTime);
      depth = nextStop;
    } else {
      // Must wait at this depth
      let stopTime = 0;
      while (getCeilingDepth(currentTissues, gf) > nextStop && stopTime < 999) {
        currentTissues = updateAllTissues(currentTissues, depth, fn2, fhe, 1);
        stopTime += 1;
      }
      if (stopTime > 0) {
        stops.push({ depth, duration: stopTime });
      }
      // Now ascend
      const ascentTime = 3 / ascentRate;
      currentTissues = updateAllTissues(currentTissues, depth - 1.5, fn2, fhe, ascentTime);
      depth = nextStop;
    }

    if (depth <= 0) break;
  }

  return { stops, tissues: currentTissues };
}
