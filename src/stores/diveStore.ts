import { create } from 'zustand';
import type { DivePhase, GasMix, DecoStop, Warning, ProfilePoint, SafetyStopState } from '../types';
import {
  ambientPressure, ppo2, mod,
  createInitialTissues, updateAllTissues, getCeilingDepth, getNdl,
  getDecoStops,
  pressureDrop,
  narcosisFactor,
  cnsRatePerMinute,
} from '../engine';
import { useSettingsStore } from './settingsStore';
import { WATER_DENSITY_MAP } from '../types';

// ─── Physical constants ─────────────────────────────────────────
const SEABED_DEPTH = 40;       // max dive depth (m)
const BCD_MAX_VOLUME = 18;     // max BCD bladder capacity (liters)
const BCD_INFLATE_RATE = 2.0;  // liters/sec of actual volume added at current depth
const BCD_DEFLATE_RATE = 3.0;  // liters/sec released (dump valve faster)
const DIVER_MASS = 75;         // kg body only
const WETSUIT_SURFACE_VOL = 10;// 5mm wetsuit neoprene buoyancy at surface (liters)
const LEAD_WEIGHT_KG = 7;      // lead on weight belt
const TANK_WEIGHT_KG = 14;     // 12L aluminum tank full
const TANK_BUOYANCY_L = 11;    // tank displacement volume (liters)
// Water density read from settings at runtime
const GRAVITY = 9.81;
const DRAG_COEFF = 15;         // water drag
const SLOW_DRAG_BONUS = 80;    // extra drag when moving slow — helps settle to neutral
const FIN_KICK_FORCE = 60;     // Newtons vertical from fin kick

// ─── Boyle's Law helpers ────────────────────────────────────────
// P1 * V1 = P2 * V2
// We track BCD air as "surface-equivalent liters" (volume at 1 bar)
// Actual volume at depth = surfaceEquiv / P_amb

function bcdActualVolume(surfaceEquivL: number, depthM: number): number {
  return surfaceEquivL / ambientPressure(depthM);
}

function bcdMaxSurfaceEquiv(depthM: number): number {
  // Max physical volume is 18L at any depth
  // Surface equivalent = 18L * P_amb
  return BCD_MAX_VOLUME * ambientPressure(depthM);
}

/**
 * Calculate net buoyancy in Newtons.
 * Positive = floats up, Negative = sinks.
 *
 * Buoyancy = (displaced_volume * water_density * g) - (total_mass * g)
 */
function calcNetBuoyancy(depthM: number, bcdSurfaceEquivL: number, waterDensity: number): number {
  const pAmb = ambientPressure(depthM);
  const weightKg = useSettingsStore.getState().weightKg;

  // Wetsuit: neoprene compresses with depth (Boyle's Law)
  const wetsuitVol = WETSUIT_SURFACE_VOL / pAmb;

  // BCD: actual volume at this depth
  const bcdVol = bcdSurfaceEquivL / pAmb;

  // Body volume (human body density ~1.062 kg/L in seawater — slightly negative)
  const bodyVol = DIVER_MASS / 1.062;

  // Total displacement volume (liters)
  const totalDisplacedL = bodyVol + wetsuitVol + bcdVol + TANK_BUOYANCY_L;

  // Forces
  const buoyancy = totalDisplacedL * waterDensity * GRAVITY;
  const totalWeight = (DIVER_MASS + weightKg + TANK_WEIGHT_KG) * GRAVITY;

  return buoyancy - totalWeight;
}

// ─── State ──────────────────────────────────────────────────────

interface DiveState {
  phase: DivePhase;
  depth: number;
  maxDepth: number;
  temperature: number;
  ascentRate: number;       // m/min, positive = ascending
  verticalVelocity: number; // m/s, positive = sinking
  diveTime: number;
  speed: number;

  tankPressure: number;
  startingPressure: number;
  cylinderVolumeL: number;
  gasMix: GasMix;
  currentPpo2: number;
  cns: number;

  // BCD — stored as surface-equivalent liters (Boyle's Law)
  bcdAirSurfaceEquiv: number;
  bcdActualVolume: number;   // display: actual liters at current depth
  bcdInflating: boolean;
  bcdDeflating: boolean;
  finKickUp: boolean;
  finKickDown: boolean;
  netBuoyancy: number;

  tissues: number[];
  ndl: number;
  ceiling: number;
  decoStops: DecoStop[];
  gfLow: number;
  gfHigh: number;
  sacRate: number;
  narcosisLevel: number;
  safetyStop: SafetyStopState;
  safetyStopCompleted: boolean;
  safetyStopSkipped: boolean;
  activeWarnings: Warning[];
  profileLog: ProfilePoint[];

  initDive: (config: {
    tankPressure: number;
    cylinderVolumeL: number;
    gasMix: GasMix;
    sacRate: number;
    gfLow: number;
    gfHigh: number;
  }) => void;
  tick: (dt: number) => void;
  setPhase: (phase: DivePhase) => void;
  setBcdInflating: (v: boolean) => void;
  setBcdDeflating: (v: boolean) => void;
  setFinKickUp: (v: boolean) => void;
  setFinKickDown: (v: boolean) => void;
  autoNeutral: () => void; // auto-adjust BCD for neutral buoyancy at current depth
  setSpeed: (speed: number) => void;
  endDive: () => void;
}

export const useDiveStore = create<DiveState>((set, get) => ({
  phase: 'setup',
  depth: 0,
  maxDepth: 0,
  temperature: 28,
  ascentRate: 0,
  verticalVelocity: 0,
  diveTime: 0,
  speed: 1,
  tankPressure: 200,
  startingPressure: 200,
  cylinderVolumeL: 12,
  gasMix: { fo2: 0.21, fn2: 0.79, fhe: 0, label: 'Air' },
  currentPpo2: 0.21,
  cns: 0,
  bcdAirSurfaceEquiv: 6,  // start with some air
  bcdActualVolume: 6,
  bcdInflating: false,
  bcdDeflating: false,
  finKickUp: false,
  finKickDown: false,
  netBuoyancy: 0,
  tissues: createInitialTissues(),
  ndl: 99,
  ceiling: 0,
  decoStops: [],
  gfLow: 40,
  gfHigh: 85,
  sacRate: 15,
  narcosisLevel: 0,
  safetyStop: { required: false, active: false, remaining: 180, depth: 5 },
  safetyStopCompleted: false,
  safetyStopSkipped: false,
  activeWarnings: [],
  profileLog: [],

  initDive: (config) => set({
    phase: 'descending',
    depth: 0.5,
    maxDepth: 0,
    diveTime: 0,
    verticalVelocity: 0,
    tankPressure: config.tankPressure,
    startingPressure: config.tankPressure,
    cylinderVolumeL: config.cylinderVolumeL,
    gasMix: config.gasMix,
    sacRate: config.sacRate,
    gfLow: config.gfLow,
    gfHigh: config.gfHigh,
    tissues: createInitialTissues(),
    ndl: 99, ceiling: 0, cns: 0,
    currentPpo2: config.gasMix.fo2,
    // Start with ~3L surface-equiv air → at surface actual ~3L → slightly negative buoyancy
    bcdAirSurfaceEquiv: 3,
    bcdActualVolume: 3,
    bcdInflating: false, bcdDeflating: false,
    finKickUp: false, finKickDown: false,
    netBuoyancy: 0,
    activeWarnings: [], profileLog: [],
    safetyStop: { required: false, active: false, remaining: 180, depth: 5 },
    safetyStopCompleted: false,
    safetyStopSkipped: false,
  }),

  tick: (dt) => {
    const s = get();
    if (s.phase === 'setup' || s.phase === 'postdive' || s.phase === 'predive') return;

    const dtSec = dt * s.speed;
    const dtMin = dtSec / 60;
    const pAmb = ambientPressure(s.depth);

    // ═══════════════════════════════════════════════════════════
    // BCD AIR (Boyle's Law: P1·V1 = P2·V2)
    // bcdAirSurfaceEquiv = total air measured at 1 bar
    // actual volume at depth = surfaceEquiv / P_amb
    // ═══════════════════════════════════════════════════════════
    let newBcdAir = s.bcdAirSurfaceEquiv;

    if (s.bcdInflating) {
      // Inflate: add air from tank at current depth pressure
      // Adding 1L of actual volume at depth requires P_amb liters of surface-equiv air
      const addedSurfaceEquiv = BCD_INFLATE_RATE * dtSec * pAmb;
      const maxSurfEquiv = bcdMaxSurfaceEquiv(s.depth);
      newBcdAir = Math.min(maxSurfEquiv, newBcdAir + addedSurfaceEquiv);

      // Inflating BCD uses tank air! Each actual liter at depth = P_amb surface-liters
      // converted to bar: surface_liters_used / cylinder_volume
      // (This is a small amount but realistic)
    }
    if (s.bcdDeflating) {
      // Deflate: dump valve releases air at current depth
      const removedSurfaceEquiv = BCD_DEFLATE_RATE * dtSec * pAmb;
      newBcdAir = Math.max(0, newBcdAir - removedSurfaceEquiv);
    }

    // NOTE: we do NOT manually adjust bcdAir for depth change!
    // The surface-equiv stays constant — the ACTUAL VOLUME changes
    // automatically via bcdActualVolume() because P_amb changes.
    // This IS Boyle's Law in action:
    //   - Descend → P_amb increases → actual volume decreases → less buoyancy → sink more
    //   - Ascend → P_amb decreases → actual volume increases → more buoyancy → rise faster!

    // ═══════════════════════════════════════════════════════════
    // BUOYANCY + FIN KICK PHYSICS
    // ═══════════════════════════════════════════════════════════
    const waterDensity = WATER_DENSITY_MAP[useSettingsStore.getState().waterType];
    const buoyancyN = calcNetBuoyancy(s.depth, newBcdAir, waterDensity);

    // Fin kick force
    let finForceN = 0;
    if (s.finKickUp) finForceN = -FIN_KICK_FORCE;   // upward = negative velocity
    if (s.finKickDown) finForceN = FIN_KICK_FORCE;

    // Total vertical acceleration
    const accelBuoyancy = -buoyancyN / DIVER_MASS;
    const accelKick = finForceN / DIVER_MASS;

    // Water drag — quadratic + linear damping for stability
    const spd = Math.abs(s.verticalVelocity);
    const quadDrag = -Math.sign(s.verticalVelocity) * DRAG_COEFF * spd * spd / DIVER_MASS;
    // Extra linear drag at slow speeds — helps settle to neutral buoyancy
    const linearDrag = -s.verticalVelocity * SLOW_DRAG_BONUS / DIVER_MASS;
    const accelDrag = quadDrag + linearDrag;

    let newVelocity = s.verticalVelocity + (accelBuoyancy + accelKick + accelDrag) * dtSec;

    // Dead zone — if velocity is tiny and buoyancy is near neutral, stop completely
    if (Math.abs(newVelocity) < 0.005 && Math.abs(buoyancyN) < 3) {
      newVelocity = 0;
    }
    newVelocity = Math.max(-0.6, Math.min(0.6, newVelocity)); // cap ~36 m/min

    // New depth — hard clamp at surface and seabed
    let newDepth = s.depth + newVelocity * dtSec;
    if (newDepth <= 0) {
      newDepth = 0;
      newVelocity = Math.max(0, newVelocity);
    }
    if (newDepth >= SEABED_DEPTH - 0.5) {
      // Stop 0.5m above seabed (diver stands on sand, not sinks into it)
      newDepth = SEABED_DEPTH - 0.5;
      newVelocity = 0; // full stop, not just clamp — prevents "stuck" feeling
    }

    const newBcdActual = bcdActualVolume(newBcdAir, newDepth);
    const currentAscentRate = -newVelocity * 60; // m/min, positive = ascending

    // ═══════════════════════════════════════════════════════════
    // GAS CONSUMPTION (follows sim time — speed = time acceleration)
    // ═══════════════════════════════════════════════════════════
    const currentPpo2Val = ppo2(s.gasMix.fo2, newDepth);
    const barUsed = pressureDrop(s.sacRate, newDepth, s.cylinderVolumeL, dtMin);
    const newTankPressure = Math.max(0, s.tankPressure - barUsed);

    // ═══════════════════════════════════════════════════════════
    // DECO / TISSUES
    // ═══════════════════════════════════════════════════════════
    const newTissues = updateAllTissues(s.tissues, newDepth, s.gasMix.fn2, s.gasMix.fhe, dtMin);
    const gfH = s.gfHigh / 100;
    const newCeiling = getCeilingDepth(newTissues, gfH);
    const newNdl = getNdl(newTissues, newDepth, s.gasMix.fn2, gfH);

    const narcosis = narcosisFactor(newDepth, s.gasMix.fn2);
    const cnsRate = cnsRatePerMinute(currentPpo2Val);
    const newCns = Math.min(300, s.cns + cnsRate * dtMin);

    // ═══════════════════════════════════════════════════════════
    // DECO STOPS (when NDL exhausted)
    // ═══════════════════════════════════════════════════════════
    // Deco stops — expensive, only recalc every 5 sim-seconds
    let newDecoStops = s.decoStops;
    const shouldCalcDeco = newNdl <= 0 && Math.floor(newDiveTime / 5) > Math.floor(s.diveTime / 5);
    if (shouldCalcDeco) {
      try {
        const result = getDecoStops(newTissues, newDepth, s.gasMix.fn2, s.gasMix.fhe, s.gfLow / 100, s.gfHigh / 100);
        newDecoStops = result.stops;
      } catch {
        // keep previous if calc fails
      }
    } else if (newNdl > 0) {
      newDecoStops = [];
    }

    // ═══════════════════════════════════════════════════════════
    // SAFETY STOP
    // ═══════════════════════════════════════════════════════════
    const newSafetyStop = { ...s.safetyStop };
    let newSafetyStopCompleted = s.safetyStopCompleted;
    let newSafetyStopSkipped = s.safetyStopSkipped;
    if (newDepth > 10) newSafetyStop.required = true;
    if (newSafetyStop.required && newDepth >= 4 && newDepth <= 6 && currentAscentRate >= 0) {
      newSafetyStop.active = true;
      newSafetyStop.remaining = Math.max(0, newSafetyStop.remaining - dtSec);
      if (newSafetyStop.remaining <= 0) {
        newSafetyStopCompleted = true;
      }
    } else {
      newSafetyStop.active = false;
    }
    // Detect skipped safety stop: required, not completed, diver surfaces
    if (newSafetyStop.required && !newSafetyStopCompleted && newDepth < 2 && s.depth >= 2) {
      newSafetyStopSkipped = true;
    }

    // ═══════════════════════════════════════════════════════════
    // WARNINGS
    // ═══════════════════════════════════════════════════════════
    const warnings: Warning[] = [];
    const oneThird = s.startingPressure / 3;
    const twoThirds = s.startingPressure * 2 / 3;
    if (newTankPressure < oneThird) warnings.push({ type: 'reserve_air', severity: 'critical', message: 'RESERVE — Ascend Now!' });
    else if (newTankPressure < twoThirds) warnings.push({ type: 'turn_dive', severity: 'warning', message: 'TURN DIVE — Head Back' });
    if (currentPpo2Val > 1.6) warnings.push({ type: 'ppo2_critical', severity: 'critical', message: 'PPO₂ Critical' });
    else if (currentPpo2Val > 1.4) warnings.push({ type: 'ppo2_high', severity: 'warning', message: 'PPO₂ High' });
    if (currentAscentRate > 18) warnings.push({ type: 'fast_ascent', severity: 'critical', message: 'Ascent Too Fast!' });
    else if (currentAscentRate > 9) warnings.push({ type: 'ascent_caution', severity: 'caution', message: 'Slow Down' });
    if (newNdl <= 0) {
      warnings.push({ type: 'ndl_expired', severity: 'warning', message: 'Deco Required' });
      if (newCeiling > 0 && newDepth < newCeiling) {
        warnings.push({ type: 'ceiling_violation', severity: 'critical', message: 'CEILING VIOLATION' });
      }
    } else if (newNdl <= 5) {
      warnings.push({ type: 'ndl_low', severity: 'caution', message: 'NDL Low' });
    }
    if (newDepth > mod(s.gasMix.fo2)) warnings.push({ type: 'mod_exceeded', severity: 'critical', message: 'MOD Exceeded' });
    // Runaway ascent warning
    if (currentAscentRate > 12 && newBcdActual > 5) {
      warnings.push({ type: 'dump_bcd', severity: 'warning', message: 'Dump BCD Air!' });
    }
    // Safety stop skipped warning
    if (newSafetyStopSkipped) {
      warnings.push({ type: 'safety_stop_skipped', severity: 'warning', message: 'Safety Stop Skipped!' });
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE
    // ═══════════════════════════════════════════════════════════
    let newPhase: DivePhase = s.phase;
    if (newDepth <= 0.1 && s.depth > 0.5) newPhase = 'surfaced';
    else if (newVelocity > 0.02) newPhase = 'descending';
    else if (newVelocity < -0.02) newPhase = 'ascending';
    else if (newSafetyStop.active) newPhase = 'safety_stop';
    else if (newDepth > 0.5) newPhase = 'diving';

    // Profile log
    const newDiveTime = s.diveTime + dtSec;
    const shouldLog = Math.floor(newDiveTime / 5) > Math.floor(s.diveTime / 5);
    const newProfileLog = shouldLog
      ? [...s.profileLog, { time: newDiveTime, depth: newDepth, tankPressure: newTankPressure, ndl: newNdl, ppo2: currentPpo2Val }]
      : s.profileLog;

    set({
      phase: newPhase,
      depth: newDepth,
      maxDepth: Math.max(s.maxDepth, newDepth),
      verticalVelocity: newVelocity,
      ascentRate: currentAscentRate,
      diveTime: newDiveTime,
      tankPressure: newTankPressure,
      currentPpo2: currentPpo2Val,
      cns: newCns,
      bcdAirSurfaceEquiv: newBcdAir,
      bcdActualVolume: newBcdActual,
      netBuoyancy: buoyancyN,
      tissues: newTissues,
      ndl: newNdl,
      ceiling: newCeiling,
      decoStops: newDecoStops,
      narcosisLevel: narcosis,
      safetyStop: newSafetyStop,
      safetyStopCompleted: newSafetyStopCompleted,
      safetyStopSkipped: newSafetyStopSkipped,
      activeWarnings: warnings,
      profileLog: newProfileLog,
    });
  },

  setPhase: (phase) => set({ phase }),
  setBcdInflating: (v) => set({ bcdInflating: v }),
  setBcdDeflating: (v) => set({ bcdDeflating: v }),
  setFinKickUp: (v) => set({ finKickUp: v }),
  setFinKickDown: (v) => set({ finKickDown: v }),

  // Auto-neutral: calculate exact BCD air for 0 buoyancy at current depth
  autoNeutral: () => {
    const s = get();
    const waterDensity = WATER_DENSITY_MAP[useSettingsStore.getState().waterType];
    const pAmb = ambientPressure(s.depth);
    const wetsuitVol = WETSUIT_SURFACE_VOL / pAmb;
    const bodyVol = DIVER_MASS / 1.062;
    const weightKg = useSettingsStore.getState().weightKg;
    const totalWeight = (DIVER_MASS + weightKg + TANK_WEIGHT_KG) * GRAVITY;

    // Solve: (bodyVol + wetsuitVol + bcdVol + TANK_BUOYANCY_L) * waterDensity * g = totalWeight
    // bcdVol = totalWeight / (waterDensity * g) - bodyVol - wetsuitVol - TANK_BUOYANCY_L
    const neededBcdVol = totalWeight / (waterDensity * GRAVITY) - bodyVol - wetsuitVol - TANK_BUOYANCY_L;
    const clampedVol = Math.max(0, Math.min(BCD_MAX_VOLUME, neededBcdVol));

    // Convert actual volume at depth to surface-equivalent
    const surfEquiv = clampedVol * pAmb;

    set({
      bcdAirSurfaceEquiv: surfEquiv,
      bcdActualVolume: clampedVol,
      verticalVelocity: 0, // stop movement
    });
  },

  setSpeed: (speed) => set({ speed }),
  endDive: () => set({ phase: 'postdive' }),
}));
