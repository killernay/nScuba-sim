/**
 * nScuba-sim Dive Physics Engine
 *
 * Pure TypeScript modules — no React dependency.
 */

// Core types
export type {
  GasMix,
  TissueState,
  DecoStop,
  Warning,
  ProfilePoint,
} from './types';

// Gas physics
export {
  ambientPressure,
  ppo2,
  ppn2,
  mod,
  ead,
  end,
  alveolarPressure,
  AIR,
  EAN32,
  EAN36,
  EAN40,
  EAN50,
  EAN80,
  OXYGEN,
  TX2135,
  TX1845,
} from './gas';

// Bühlmann ZHL-16C decompression
export {
  ZHL16C_N2,
  ZHL16C_He,
  createInitialTissues,
  updateTissues,
  updateAllTissues,
  getCeilingBar,
  getCeilingDepth,
  getNdl,
  getDecoStops,
} from './buhlmann';

// Gas consumption
export {
  gasConsumptionRate,
  pressureDrop,
  timeRemaining,
  sacFromDive,
} from './consumption';

// Buoyancy physics
export {
  wetsuitVolumeAtDepth,
  bcdVolumeAtDepth,
  netBuoyancy,
} from './buoyancy';

// Narcosis model
export { narcosisFactor } from './narcosis';

// CNS O2 toxicity
export {
  cnsRatePerMinute,
  updateCns,
} from './cns';

// Unit conversions
export {
  metersToFeet,
  feetToMeters,
  barToPsi,
  psiToBar,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  litersToTubicFeet,
} from './units';
