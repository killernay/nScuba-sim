/**
 * Gas physics calculations for diving.
 */
import type { GasMix } from './types';

// ─── Water vapour pressure in the lungs (bar) ─────────────────────
const WATER_VAPOUR_PRESSURE = 0.0627;

// ─── Ambient pressure ─────────────────────────────────────────────
/** Absolute ambient pressure at depth (bar). Assumes sea-level surface. */
export function ambientPressure(depthM: number): number {
  return 1.0 + depthM / 10.0;
}

// ─── Partial pressures ───────────────────────────────────────────
/** Partial pressure of O2 at depth. */
export function ppo2(fo2: number, depthM: number): number {
  return fo2 * ambientPressure(depthM);
}

/** Partial pressure of N2 at depth. */
export function ppn2(fn2: number, depthM: number): number {
  return fn2 * ambientPressure(depthM);
}

// ─── Maximum Operating Depth ─────────────────────────────────────
/** MOD in metres for a given FO2 and PPO2 limit (default 1.4 bar). */
export function mod(fo2: number, ppo2Limit = 1.4): number {
  return (ppo2Limit / fo2 - 1.0) * 10.0;
}

// ─── Equivalent Air Depth ────────────────────────────────────────
/** EAD in metres — the depth on air that gives the same PPN2. */
export function ead(fn2: number, depthM: number): number {
  const ppN2 = fn2 * ambientPressure(depthM);
  // Air fn2 = 0.79
  return (ppN2 / 0.79 - 1.0) * 10.0;
}

// ─── Equivalent Narcotic Depth ───────────────────────────────────
/**
 * END in metres.
 * Narcotic fraction = everything except helium (O2 + N2 are narcotic).
 * END = depth at which air would give the same narcotic partial pressure.
 */
export function end(fhe: number, depthM: number): number {
  const narcoticFraction = 1.0 - fhe;
  const narcoticPP = narcoticFraction * ambientPressure(depthM);
  // Air is fully narcotic (narcotic fraction = 1.0)
  return (narcoticPP / 1.0 - 1.0) * 10.0;
}

// ─── Alveolar pressure ──────────────────────────────────────────
/**
 * Alveolar (inspired) inert-gas partial pressure.
 * Schreiner equation form: pAlv = (pAmb - pH2O) * fGas
 */
export function alveolarPressure(pAmb: number, fGas: number): number {
  return (pAmb - WATER_VAPOUR_PRESSURE) * fGas;
}

// ─── Common gas mix presets ──────────────────────────────────────
export const AIR: GasMix = { fo2: 0.21, fn2: 0.79, fhe: 0.0, label: 'Air' };
export const EAN32: GasMix = { fo2: 0.32, fn2: 0.68, fhe: 0.0, label: 'EAN32' };
export const EAN36: GasMix = { fo2: 0.36, fn2: 0.64, fhe: 0.0, label: 'EAN36' };
export const EAN40: GasMix = { fo2: 0.40, fn2: 0.60, fhe: 0.0, label: 'EAN40' };
export const EAN50: GasMix = { fo2: 0.50, fn2: 0.50, fhe: 0.0, label: 'EAN50' };
export const EAN80: GasMix = { fo2: 0.80, fn2: 0.20, fhe: 0.0, label: 'EAN80' };
export const OXYGEN: GasMix = { fo2: 1.0, fn2: 0.0, fhe: 0.0, label: 'O2' };
export const TX2135: GasMix = { fo2: 0.21, fn2: 0.44, fhe: 0.35, label: 'Tx21/35' };
export const TX1845: GasMix = { fo2: 0.18, fn2: 0.37, fhe: 0.45, label: 'Tx18/45' };
