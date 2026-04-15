export type DivePhase =
  | 'setup'
  | 'predive'
  | 'surface'
  | 'descending'
  | 'diving'
  | 'ascending'
  | 'safety_stop'
  | 'deco_stop'
  | 'surfaced'
  | 'postdive';

export type WarningSeverity = 'info' | 'caution' | 'warning' | 'critical';

export interface GasMix {
  fo2: number;
  fn2: number;
  fhe: number;
  label: string;
}

export interface DecoStop {
  depth: number;
  duration: number;
}

export interface Warning {
  type: string;
  severity: WarningSeverity;
  message: string;
}

export interface ProfilePoint {
  time: number;
  depth: number;
  tankPressure: number;
  ndl: number;
  ppo2: number;
}

export interface SafetyStopState {
  required: boolean;
  active: boolean;
  remaining: number; // seconds
  depth: number;
}

export type TankMaterial = 'aluminum' | 'steel';

export interface TankConfig {
  volumeL: number;
  label: string;
  count: number; // 1 for single, 2 for doubles
  material: TankMaterial;
  weightKg: number;       // empty weight
  buoyancyFullL: number;  // displacement volume (liters) when full
  buoyancyEmptyL: number; // displacement volume (liters) when empty
}

export interface DiveComputerProps {
  depth: number;
  maxDepth: number;
  diveTime: number;
  ndl: number;
  tankPressure: number;
  gasMix: GasMix;
  ppo2: number;
  ascentRate: number;
  temperature: number;
  safetyStop: SafetyStopState | null;
  decoStops: DecoStop[];
  cns: number;
  warnings: Warning[];
  ceiling: number;
}

export interface DiveComputerSkin {
  id: string;
  name: string;
  brand: string;
  component: React.FC<DiveComputerProps>;
  thumbnail?: string;
}

export type UnitSystem = 'metric' | 'imperial';
export type WaterType = 'seawater' | 'freshwater';

export const WATER_DENSITY_MAP: Record<WaterType, number> = {
  seawater: 1.025,
  freshwater: 1.0,
};

export const GAS_PRESETS: Record<string, GasMix> = {
  AIR: { fo2: 0.21, fn2: 0.79, fhe: 0, label: 'Air' },
  EAN32: { fo2: 0.32, fn2: 0.68, fhe: 0, label: 'EANx32' },
  EAN36: { fo2: 0.36, fn2: 0.64, fhe: 0, label: 'EANx36' },
  EAN40: { fo2: 0.40, fn2: 0.60, fhe: 0, label: 'EANx40' },
  EAN50: { fo2: 0.50, fn2: 0.50, fhe: 0, label: 'EANx50' },
  EAN80: { fo2: 0.80, fn2: 0.20, fhe: 0, label: 'EANx80' },
  O2: { fo2: 1.0, fn2: 0, fhe: 0, label: 'O₂' },
  TRIMIX_21_35: { fo2: 0.21, fn2: 0.44, fhe: 0.35, label: 'Tx 21/35' },
};

export const TANK_PRESETS: TankConfig[] = [
  { volumeL: 10, label: 'AL 10L', count: 1, material: 'aluminum', weightKg: 11.5, buoyancyFullL: 9.5, buoyancyEmptyL: 10.5 },
  { volumeL: 12, label: 'AL 12L', count: 1, material: 'aluminum', weightKg: 14.0, buoyancyFullL: 11.0, buoyancyEmptyL: 12.0 },
  { volumeL: 15, label: 'AL 15L', count: 1, material: 'aluminum', weightKg: 16.5, buoyancyFullL: 13.5, buoyancyEmptyL: 14.8 },
  { volumeL: 18, label: 'AL 18L', count: 1, material: 'aluminum', weightKg: 19.0, buoyancyFullL: 16.0, buoyancyEmptyL: 17.5 },
  { volumeL: 10, label: 'ST 10L', count: 1, material: 'steel', weightKg: 13.5, buoyancyFullL: 8.5, buoyancyEmptyL: 9.0 },
  { volumeL: 12, label: 'ST 12L', count: 1, material: 'steel', weightKg: 16.0, buoyancyFullL: 10.0, buoyancyEmptyL: 10.5 },
];
