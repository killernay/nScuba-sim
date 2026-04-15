/**
 * Gas consumption calculations.
 */

import { ambientPressure } from './gas';

/**
 * Gas consumption rate at depth (litres/min).
 *
 * @param rmv       Respiratory Minute Volume at surface (litres/min, typically 15–25)
 * @param depthM    Current depth in metres
 * @returns Consumption in surface-equivalent litres/min
 */
export function gasConsumptionRate(rmv: number, depthM: number): number {
  return rmv * ambientPressure(depthM);
}

/**
 * Tank pressure drop per time step (bar).
 *
 * @param rmv           RMV at surface (litres/min)
 * @param depthM        Current depth in metres
 * @param cylinderVolL  Cylinder water volume (e.g. 12 for AL80)
 * @param dtMin         Time step in minutes
 * @returns Pressure drop in bar
 */
export function pressureDrop(
  rmv: number,
  depthM: number,
  cylinderVolL: number,
  dtMin: number,
): number {
  const litresConsumed = gasConsumptionRate(rmv, depthM) * dtMin;
  return litresConsumed / cylinderVolL;
}

/**
 * Time remaining on current gas at current depth (minutes).
 *
 * @param tankPressure   Current tank pressure in bar
 * @param reserve        Reserve pressure in bar (e.g. 50)
 * @param rmv            RMV at surface (litres/min)
 * @param depthM         Current depth in metres
 * @param cylinderVolL   Cylinder water volume in litres
 * @returns Usable gas time in minutes
 */
export function timeRemaining(
  tankPressure: number,
  reserve: number,
  rmv: number,
  depthM: number,
  cylinderVolL: number,
): number {
  const usablePressure = Math.max(0, tankPressure - reserve);
  const usableLitres = usablePressure * cylinderVolL;
  const rate = gasConsumptionRate(rmv, depthM);
  if (rate <= 0) return Infinity;
  return usableLitres / rate;
}

/**
 * Calculate Surface Air Consumption rate from dive data.
 *
 * @param barUsed       Pressure consumed during dive (bar)
 * @param cylinderVolL  Cylinder water volume (litres)
 * @param avgDepthM     Average depth during the dive (metres)
 * @param diveTimeMin   Total dive time (minutes)
 * @returns SAC rate in litres/min at surface
 */
export function sacFromDive(
  barUsed: number,
  cylinderVolL: number,
  avgDepthM: number,
  diveTimeMin: number,
): number {
  if (diveTimeMin <= 0) return 0;
  const litresUsed = barUsed * cylinderVolL;
  const avgAmbient = ambientPressure(avgDepthM);
  return litresUsed / (diveTimeMin * avgAmbient);
}
