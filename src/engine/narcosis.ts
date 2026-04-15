/**
 * Nitrogen narcosis model.
 *
 * Based on partial pressure of nitrogen (PPN2).
 * Narcosis onset at PPN2 ~2.4 bar (~24m on air), severe at ~5.5 bar (~60m on air).
 */

import { ppn2 } from './gas';

/** PPN2 threshold for onset of narcosis (bar) */
const NARCOSIS_ONSET = 2.4;

/** PPN2 threshold for severe narcosis (bar) */
const NARCOSIS_SEVERE = 5.5;

/**
 * Narcosis factor from 0.0 (clear-headed) to 1.0 (severely narcosed).
 *
 * Linear ramp between onset and severe thresholds.
 *
 * @param depthM  Current depth in metres
 * @param fn2     Nitrogen fraction of breathing gas
 * @returns Narcosis factor 0.0–1.0
 */
export function narcosisFactor(depthM: number, fn2: number): number {
  const currentPPN2 = ppn2(fn2, depthM);

  if (currentPPN2 <= NARCOSIS_ONSET) return 0.0;
  if (currentPPN2 >= NARCOSIS_SEVERE) return 1.0;

  return (currentPPN2 - NARCOSIS_ONSET) / (NARCOSIS_SEVERE - NARCOSIS_ONSET);
}
