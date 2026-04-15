/**
 * Core types for nScuba-sim dive physics engine.
 */

/** Gas mixture definition */
export interface GasMix {
  fo2: number; // fraction of oxygen (0–1)
  fn2: number; // fraction of nitrogen (0–1)
  fhe: number; // fraction of helium (0–1)
  label: string;
}

/**
 * Tissue compartment state.
 * Indices 0–15: N2 tissue pressures (bar) for compartments 1–16
 * Indices 16–31: He tissue pressures (bar) for compartments 1–16
 */
export type TissueState = number[];

/** Decompression stop */
export interface DecoStop {
  depth: number;   // meters
  duration: number; // minutes
}

/** Warning generated during simulation */
export interface Warning {
  type: string;
  severity: 'info' | 'caution' | 'warning' | 'critical';
  message: string;
}

/** A single point in a dive profile */
export interface ProfilePoint {
  time: number;         // seconds from dive start
  depth: number;        // meters
  tankPressure: number; // bar
  ndl: number;          // no-decompression limit in minutes
  ppo2: number;         // partial pressure of O2 in bar
}
