/**
 * Buoyancy physics for diving simulation.
 */

import { ambientPressure } from './gas';

/** Density of seawater in kg/m³ */
const SEAWATER_DENSITY = 1025;

/** Gravitational acceleration m/s² */
const G = 9.81;

/**
 * Wetsuit neoprene volume at depth due to Boyle's Law compression.
 *
 * V_depth = V_surface * (P_surface / P_depth)
 *
 * @param surfaceVolL  Wetsuit gas volume at surface (litres)
 * @param depthM       Current depth (metres)
 * @returns Compressed volume in litres
 */
export function wetsuitVolumeAtDepth(surfaceVolL: number, depthM: number): number {
  const pSurface = 1.0; // 1 bar
  const pDepth = ambientPressure(depthM);
  return surfaceVolL * (pSurface / pDepth);
}

/**
 * BCD air volume at a given depth, accounting for Boyle's Law.
 *
 * Air added at one depth expands/compresses when depth changes.
 *
 * @param airAddedL     Volume of air added to BCD (litres at depth of addition)
 * @param depthAddedM   Depth where air was added (metres)
 * @param currentDepthM Current depth (metres)
 * @returns BCD air volume at current depth (litres)
 */
export function bcdVolumeAtDepth(
  airAddedL: number,
  depthAddedM: number,
  currentDepthM: number,
): number {
  const pAdded = ambientPressure(depthAddedM);
  const pCurrent = ambientPressure(currentDepthM);
  return airAddedL * (pAdded / pCurrent);
}

/**
 * Net buoyancy force in Newtons.
 *
 * Positive = buoyant (ascending), Negative = heavy (descending).
 *
 * Model:
 *  - Diver weight (gravity force) = mass * g
 *  - Displaced water volume = diver body (~80L fixed) + wetsuit vol + BCD vol
 *  - Buoyancy force = displaced_volume * water_density * g
 *  - Lead adds weight but negligible volume
 *
 * @param diverMassKg        Diver mass including gear (kg)
 * @param bcdVolumeL         Current BCD air volume (litres, already adjusted for depth)
 * @param wetsuitSurfaceVolL Wetsuit gas volume at surface (litres)
 * @param leadWeightKg       Lead weight mass (kg)
 * @param depthM             Current depth (metres)
 * @returns Net buoyancy in Newtons
 */
export function netBuoyancy(
  diverMassKg: number,
  bcdVolumeL: number,
  wetsuitSurfaceVolL: number,
  leadWeightKg: number,
  depthM: number,
): number {
  // Approximate diver body volume (litres) from mass, assuming body density ~1.062 kg/L
  const bodyVolL = diverMassKg / 1.062;

  // Wetsuit volume compressed at depth
  const wsVolL = wetsuitVolumeAtDepth(wetsuitSurfaceVolL, depthM);

  // Total displaced volume in m³ (litres -> m³: divide by 1000)
  const totalDisplacedM3 = (bodyVolL + wsVolL + bcdVolumeL) / 1000.0;

  // Buoyancy force (upward)
  const buoyancyForce = totalDisplacedM3 * SEAWATER_DENSITY * G;

  // Weight force (downward): diver + lead
  const weightForce = (diverMassKg + leadWeightKg) * G;

  return buoyancyForce - weightForce;
}
