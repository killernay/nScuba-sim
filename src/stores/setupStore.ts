import { create } from 'zustand';
import { GAS_PRESETS, TANK_PRESETS } from '../types';
import type { GasMix, TankConfig } from '../types';

interface SetupState {
  step: number; // 1-4: tank, gas, diver, computer
  tank: TankConfig;
  startingPressure: number;
  gasMix: GasMix;
  decoGas: GasMix | null;
  sacRate: number;
  gfLow: number;
  gfHigh: number;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setTank: (tank: TankConfig) => void;
  setStartingPressure: (bar: number) => void;
  setGasMix: (mix: GasMix) => void;
  setDecoGas: (mix: GasMix | null) => void;
  setSacRate: (rate: number) => void;
  setGradientFactors: (low: number, high: number) => void;
}

export const useSetupStore = create<SetupState>((set) => ({
  step: 1,
  tank: TANK_PRESETS[1], // 12L default
  startingPressure: 200,
  gasMix: GAS_PRESETS.AIR,
  decoGas: null,
  sacRate: 15,
  gfLow: 40,
  gfHigh: 85,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  setTank: (tank) => set({ tank }),
  setStartingPressure: (bar) => set({ startingPressure: bar }),
  setGasMix: (mix) => set({ gasMix: mix }),
  setDecoGas: (mix) => set({ decoGas: mix }),
  setSacRate: (rate) => set({ sacRate: rate }),
  setGradientFactors: (low, high) => set({ gfLow: low, gfHigh: high }),
}));
