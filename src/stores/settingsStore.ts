import { create } from 'zustand';
import type { UnitSystem, WaterType } from '../types';

interface SettingsState {
  language: string;
  unitSystem: UnitSystem;
  waterType: WaterType;
  weightKg: number;
  selectedSkin: string;
  musicEnabled: boolean;
  soundEnabled: boolean;
  setLanguage: (lang: string) => void;
  setUnitSystem: (system: UnitSystem) => void;
  setWaterType: (type: WaterType) => void;
  setWeightKg: (kg: number) => void;
  setSelectedSkin: (skinId: string) => void;
  toggleMusic: () => void;
  toggleSound: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  unitSystem: 'metric',
  waterType: 'seawater',
  weightKg: 7,
  selectedSkin: 'default',
  musicEnabled: true,
  soundEnabled: true,
  setLanguage: (lang) => set({ language: lang }),
  setUnitSystem: (system) => set({ unitSystem: system }),
  setWaterType: (type) => set({ waterType: type }),
  setWeightKg: (kg) => set({ weightKg: kg }),
  setSelectedSkin: (skinId) => set({ selectedSkin: skinId }),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
}));
