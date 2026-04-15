import { useState, useEffect } from 'react';
import { useDiveStore } from '../../stores/diveStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { WATER_DENSITY_MAP } from '../../types';
import { useTranslation } from 'react-i18next';
import { keys } from '../../input';
import { ZHL16C_N2, ZHL16C_He } from '../../engine/buhlmann';

function WarningColor(value: number, yellowAt: number, redAt: number, invert = false): string {
  if (invert) {
    if (value <= redAt) return 'text-red-500 flash';
    if (value <= yellowAt) return 'text-yellow-400';
    return 'text-green-400';
  }
  if (value >= redAt) return 'text-red-500 flash';
  if (value >= yellowAt) return 'text-yellow-400';
  return 'text-green-400';
}

function NdlBar({ ndl, maxNdl = 60 }: { ndl: number; maxNdl?: number }) {
  const pct = Math.max(0, Math.min(100, (ndl / maxNdl) * 100));
  const color = ndl <= 5 ? 'bg-red-500' : ndl <= 10 ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="w-full h-2 bg-[var(--ocean-light)] rounded-full overflow-hidden">
      <div className={`h-full ${color} bar-transition rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Rule of Thirds tank display:
 * 1/3 OUT (green)  -> gas for outbound journey
 * 1/3 BACK (yellow) -> gas for return journey
 * 1/3 RESERVE (red) -> emergency, don't touch!
 * Turn dive at 2/3. Surface with 1/3.
 */
function RuleOfThirdsBar({ pressure, max = 200 }: { pressure: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (pressure / max) * 100));
  const oneThird = 100 / 3;
  const twoThirds = 200 / 3;

  return (
    <div className="w-full">
      {/* Bar with three zones */}
      <div className="w-full h-4 bg-[var(--ocean-light)] rounded-full overflow-hidden relative">
        {/* Third markers */}
        <div className="absolute top-0 bottom-0 border-r border-dashed border-white/30" style={{ left: `${oneThird}%` }} />
        <div className="absolute top-0 bottom-0 border-r border-dashed border-white/30" style={{ left: `${twoThirds}%` }} />

        {/* Fill -- color changes based on which third we're in */}
        <div
          className={`h-full bar-transition rounded-full ${
            pct > twoThirds ? 'bg-green-500' :
            pct > oneThird ? 'bg-yellow-400' :
            'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex text-[8px] mt-1">
        <div className="flex-1 text-center text-red-400">
          RESERVE
        </div>
        <div className="flex-1 text-center text-yellow-400">
          ← BACK
        </div>
        <div className="flex-1 text-center text-green-400">
          OUT →
        </div>
      </div>

      {/* Current zone indicator */}
      <div className={`text-[9px] font-bold text-center mt-1 ${
        pct > twoThirds ? 'text-green-400' :
        pct > oneThird ? 'text-yellow-400' :
        pct > 0 ? 'text-red-400 flash' : 'text-red-600'
      }`}>
        {pct > twoThirds ? '● OUTBOUND — keep exploring' :
         pct > oneThird ? '● TURN DIVE — head back now!' :
         pct > 0 ? '● RESERVE — ascend immediately!' :
         '● EMPTY'}
      </div>
    </div>
  );
}

// ─── Safety Stop Panel ─────────────────────────────────────────
function SafetyStopPanel() {
  const safetyStop = useDiveStore((s) => s.safetyStop);
  const depth = useDiveStore((s) => s.depth);
  const safetyStopCompleted = useDiveStore((s) => s.safetyStopCompleted);
  const safetyStopSkipped = useDiveStore((s) => s.safetyStopSkipped);

  // Only show when safety stop is required and diver is above 10m (ascending)
  if (!safetyStop.required) return null;
  // Don't show if completed and diver moved on
  if (safetyStopCompleted && !safetyStop.active) {
    return (
      <div className="hud-panel absolute top-[340px] left-1/2 -translate-x-1/2 w-[360px] px-5 py-3 border-2 border-green-500/60">
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl text-green-400">&#10003;</span>
          <span className="text-lg font-bold text-green-400">SAFETY STOP COMPLETE</span>
        </div>
      </div>
    );
  }

  // Show skipped warning
  if (safetyStopSkipped) {
    return (
      <div className="hud-panel absolute top-[340px] left-1/2 -translate-x-1/2 w-[360px] px-5 py-3 border-2 border-red-500 flash">
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl text-red-400">&#9888;</span>
          <span className="text-lg font-bold text-red-400">SAFETY STOP SKIPPED</span>
        </div>
        <div className="text-[10px] text-red-300/70 text-center mt-1">
          Risk of DCS increased — always complete your safety stop
        </div>
      </div>
    );
  }

  // Only show the panel when diver is shallower than ~8m (approaching/at stop)
  if (depth > 8) return null;

  const total = 180; // 3 minutes
  const elapsed = total - safetyStop.remaining;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const mins = Math.floor(safetyStop.remaining / 60);
  const secs = Math.floor(safetyStop.remaining % 60);
  const inZone = depth >= 4 && depth <= 6;
  const tooShallow = depth < 4;
  const tooDeep = depth > 6;
  const drifted = !inZone && safetyStop.required && depth <= 8;

  return (
    <div className={`hud-panel absolute top-[340px] left-1/2 -translate-x-1/2 w-[360px] px-5 py-3 border-2 ${
      safetyStop.active ? 'border-green-500/60' : drifted ? 'border-yellow-400/60' : 'border-[var(--cyan-accent)]/40'
    }`}>
      <div className="text-xs text-[var(--cyan-dim)] opacity-70 mb-1 text-center">SAFETY STOP</div>

      <div className="flex items-center justify-center gap-3 mb-2">
        <span className={`text-2xl font-mono font-bold ${safetyStop.active ? 'text-green-400' : 'text-yellow-400'}`}>
          5m
        </span>
        <span className="text-gray-500">—</span>
        <span className={`text-3xl font-mono font-bold ${safetyStop.active ? 'text-green-400' : 'text-yellow-400'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-[var(--ocean-light)] rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-green-500 bar-transition rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Status */}
      {drifted && (
        <div className={`text-xs text-center font-bold ${tooShallow ? 'text-yellow-400' : 'text-orange-400'}`}>
          {tooShallow ? '▲ Too shallow — descend to 5m' : '▼ Too deep — ascend to 5m'}
          <div className="text-[9px] text-gray-500 mt-1">Timer paused — stay between 4-6m</div>
        </div>
      )}
      {safetyStop.active && (
        <div className="text-[10px] text-green-400/70 text-center">
          Hold depth 4-6m — timer counting down
        </div>
      )}
      {!safetyStop.active && !drifted && (
        <div className="text-[10px] text-gray-500 text-center">
          Ascend to 5m to begin safety stop
        </div>
      )}
    </div>
  );
}

// ─── Deco Stop Display ─────────────────────────────────────────
function DecoStopPanel() {
  const ndl = useDiveStore((s) => s.ndl);
  const decoStops = useDiveStore((s) => s.decoStops);
  const ceiling = useDiveStore((s) => s.ceiling);
  const depth = useDiveStore((s) => s.depth);

  if (ndl > 0 || decoStops.length === 0) return null;

  const ceilingViolation = ceiling > 0 && depth < ceiling;

  return (
    <div className={`hud-panel absolute top-[340px] left-1/2 -translate-x-1/2 w-[400px] px-5 py-4 border-2 ${
      ceilingViolation ? 'border-red-500 flash' : 'border-red-500/70'
    }`} style={{ background: 'rgba(60, 10, 10, 0.85)' }}>
      <div className="text-xs text-red-400 font-bold mb-2 text-center tracking-wider">
        DECO REQUIRED
      </div>

      {/* Ceiling depth */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-[10px] text-red-300 opacity-70">CEILING</span>
        <span className={`text-2xl font-mono font-bold ${ceilingViolation ? 'text-red-400 flash' : 'text-red-300'}`}>
          {ceiling.toFixed(1)}m
        </span>
        <span className="text-[10px] text-red-300 opacity-50">DO NOT ASCEND ABOVE</span>
      </div>

      {ceilingViolation && (
        <div className="text-center mb-3 py-2 bg-red-600/40 rounded flash">
          <div className="text-lg font-bold text-red-300">CEILING VIOLATION</div>
          <div className="text-[10px] text-red-200">DESCEND IMMEDIATELY — DCS risk extreme</div>
        </div>
      )}

      {/* Stop list */}
      <div className="space-y-1">
        {decoStops.map((stop, i) => (
          <div key={i} className="flex items-center justify-between bg-red-900/40 px-3 py-1 rounded">
            <span className="text-sm font-mono text-red-200">{stop.depth}m</span>
            <div className="flex-1 mx-3 h-px bg-red-500/30" />
            <span className="text-sm font-mono text-red-200 font-bold">{stop.duration} min</span>
          </div>
        ))}
      </div>

      <div className="text-[9px] text-red-400/60 text-center mt-2">
        Complete all stops on ascent — skipping causes DCS
      </div>
    </div>
  );
}

// ─── Tissue Saturation Display ─────────────────────────────────
function TissueLoadingPanel() {
  // Throttle: only update every 500ms to prevent lag
  const [snapshot, setSnapshot] = useState({ tissues: [] as number[], depth: 0, gfHigh: 85 });
  useEffect(() => {
    const interval = setInterval(() => {
      const s = useDiveStore.getState();
      setSnapshot({ tissues: s.tissues, depth: s.depth, gfHigh: s.gfHigh });
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const { tissues, depth, gfHigh } = snapshot;
  if (tissues.length === 0) return null;

  // Calculate tissue loading as % of M-value for each compartment
  const NUM = 16;
  const pAmb = 1.0 + depth / 10.0;

  const loadings = [];
  for (let i = 0; i < NUM; i++) {
    const pN2 = tissues[i];
    const pHe = tissues[i + NUM];
    const pTotal = pN2 + pHe;

    // M-value at current depth (tolerated inert gas pressure)
    const aN2 = ZHL16C_N2[i][1];
    const bN2 = ZHL16C_N2[i][2];
    const aHe = ZHL16C_He[i][1];
    const bHe = ZHL16C_He[i][2];

    let a: number, b: number;
    if (pTotal > 0) {
      a = (pN2 * aN2 + pHe * aHe) / pTotal;
      b = (pN2 * bN2 + pHe * bHe) / pTotal;
    } else {
      a = aN2;
      b = bN2;
    }

    // M-value at current ambient pressure
    const mValue = a + pAmb / b;
    // Apply GF
    const mValueGf = pAmb + (mValue - pAmb) * (gfHigh / 100);
    const loading = mValueGf > 0 ? (pTotal / mValueGf) * 100 : 0;

    loadings.push(Math.max(0, loading));
  }

  function barColor(pct: number): string {
    if (pct > 100) return 'bg-red-500 flash';
    if (pct > 80) return 'bg-red-500';
    if (pct > 50) return 'bg-yellow-400';
    return 'bg-green-500';
  }

  return (
    <div className="hud-panel absolute bottom-8 left-8 w-[280px] px-4 py-3">
      <div className="text-[10px] text-[var(--cyan-dim)] opacity-70 mb-1">
        TISSUE LOADING
      </div>
      <div className="text-[8px] text-gray-500 mb-2">
        16 compartments: fast (left) to slow (right) — % of M-value with GF {gfHigh}%
      </div>
      <div className="flex items-end gap-[2px] h-12">
        {loadings.map((pct, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col justify-end relative group"
            style={{ height: '100%' }}
          >
            <div
              className={`w-full rounded-t-[1px] bar-transition ${barColor(pct)}`}
              style={{
                height: `${Math.min(100, pct)}%`,
                opacity: pct > 100 ? 1 : 0.8,
              }}
            />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-black/90 text-[8px] text-white px-1 py-0.5 rounded whitespace-nowrap">
                T{i + 1}: {pct.toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex justify-between mt-1 text-[7px] text-gray-600">
        <span>T1 (5min)</span>
        <span>T16 (635min)</span>
      </div>
      <div className="flex gap-2 mt-1 text-[7px]">
        <span className="text-green-400">● &lt;50%</span>
        <span className="text-yellow-400">● 50-80%</span>
        <span className="text-red-400">● &gt;80%</span>
      </div>
    </div>
  );
}

// ─── Ascent Rate Gauge (vertical) ──────────────────────────────
function AscentRateGauge() {
  const ascentRate = useDiveStore((s) => s.ascentRate);
  const { t } = useTranslation('dive');

  // Gauge spans -5 (descending) to 20 (ascending fast)
  const minRate = -5;
  const maxRate = 20;
  const clampedRate = Math.max(minRate, Math.min(maxRate, ascentRate));

  // Position: 0% = bottom (max descent), 100% = top (max ascent)
  const pct = ((clampedRate - minRate) / (maxRate - minRate)) * 100;

  // Zone boundaries as percentages
  const zeroLine = ((0 - minRate) / (maxRate - minRate)) * 100;
  const greenTop = ((9 - minRate) / (maxRate - minRate)) * 100;
  const yellowTop = ((15 - minRate) / (maxRate - minRate)) * 100;

  const isAscending = ascentRate > 0.5;
  const isDescending = ascentRate < -0.5;

  function rateColor(): string {
    const absRate = Math.abs(ascentRate);
    if (absRate > 15) return 'text-red-500';
    if (absRate > 9) return 'text-yellow-400';
    return 'text-green-400';
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Direction arrow */}
      <div className={`text-sm ${isAscending ? (ascentRate > 9 ? 'text-red-400' : 'text-green-400') : 'text-gray-600'}`}>
        {isAscending ? '▲' : ''}
      </div>

      {/* Vertical gauge */}
      <div className="w-6 h-28 rounded relative overflow-hidden" style={{ background: 'rgba(13,33,55,0.6)' }}>
        {/* Red zone: 15-20 m/min */}
        <div
          className="absolute left-0 right-0 bg-red-500/30"
          style={{ top: `${100 - yellowTop}%`, bottom: `${100 - yellowTop + (yellowTop - greenTop)}%`, height: `${100 - yellowTop}%` }}
        />
        {/* Yellow zone: 9-15 m/min */}
        <div
          className="absolute left-0 right-0 bg-yellow-400/20"
          style={{ top: `${100 - yellowTop}%`, height: `${yellowTop - greenTop}%` }}
        />
        {/* Green zone: 0-9 m/min */}
        <div
          className="absolute left-0 right-0 bg-green-500/15"
          style={{ top: `${100 - greenTop}%`, height: `${greenTop - zeroLine}%` }}
        />

        {/* Zero line (neutral) */}
        <div
          className="absolute left-0 right-0 h-px bg-white/30"
          style={{ top: `${100 - zeroLine}%` }}
        />

        {/* Current rate indicator */}
        <div
          className={`absolute left-0 right-0 h-1 rounded bar-transition ${
            Math.abs(ascentRate) > 15 ? 'bg-red-500' :
            Math.abs(ascentRate) > 9 ? 'bg-yellow-400' :
            'bg-green-400'
          }`}
          style={{ top: `${100 - pct}%` }}
        />

        {/* Zone labels on the gauge */}
        <div className="absolute right-0.5 text-[6px] text-red-400/60" style={{ top: '2px' }}>18</div>
        <div className="absolute right-0.5 text-[6px] text-yellow-400/60" style={{ top: `${100 - yellowTop}%` }}>15</div>
        <div className="absolute right-0.5 text-[6px] text-green-400/60" style={{ top: `${100 - greenTop}%` }}>9</div>
        <div className="absolute right-0.5 text-[6px] text-white/40" style={{ top: `${100 - zeroLine}%` }}>0</div>
      </div>

      {/* Direction arrow down */}
      <div className={`text-sm ${isDescending ? 'text-blue-400' : 'text-gray-600'}`}>
        {isDescending ? '▼' : ''}
      </div>

      {/* Rate value */}
      <div className={`text-xs font-mono font-bold ${rateColor()}`}>
        {ascentRate.toFixed(0)}
      </div>
      <div className="text-[7px] text-gray-500">m/min</div>
    </div>
  );
}

/** Throttled dive state — updates 10x/sec instead of 60x */
function useDiveSnapshot() {
  const [snap, setSnap] = useState(useDiveStore.getState());
  useEffect(() => {
    const interval = setInterval(() => setSnap(useDiveStore.getState()), 100);
    return () => clearInterval(interval);
  }, []);
  return snap;
}

export function DiveComputer() {
  const { t } = useTranslation('dive');
  const s = useDiveSnapshot(); // 10fps instead of 60fps re-render

  const setBcdInflating = useDiveStore.getState().setBcdInflating;
  const setBcdDeflating = useDiveStore.getState().setBcdDeflating;
  const setFinKickUp = useDiveStore.getState().setFinKickUp;
  const setFinKickDown = useDiveStore.getState().setFinKickDown;
  const autoNeutral = useDiveStore.getState().autoNeutral;
  const waterType = useSettingsStore((s) => s.waterType);
  const waterDensity = WATER_DENSITY_MAP[waterType];

  const inDeco = s.ndl <= 0 && s.decoStops.length > 0;

  return (
    <>
      {/* Left Panel — Depth & NDL/DECO */}
      <div className="hud-panel absolute top-8 left-8 w-80 p-5">
        {/* Surface/Underwater indicator */}
        {s.depth < 0.5 && (
          <div className="text-xs text-yellow-400 mb-2 text-center py-1 bg-yellow-400/10 rounded">
            SURFACE — {s.depth < 0.1 ? 'At Surface' : 'Near Surface'}
          </div>
        )}

        <div className="text-xs text-[var(--cyan-dim)] opacity-70 mb-1">{t('depth')}</div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-5xl font-mono font-bold ${s.depth < 0.5 ? 'text-yellow-300' : ''}`}>
            {s.depth.toFixed(1)}
          </span>
          <span className="text-lg text-[var(--cyan-dim)] opacity-60">{t('units.meters')}</span>
          <span className="ml-auto text-xs text-gray-500">
            MAX {s.maxDepth.toFixed(1)} {t('units.meters')}
          </span>
        </div>
        {/* Pressure bar display */}
        <div className="text-[10px] text-gray-500">
          P<sub>amb</sub> = {(1 + s.depth / 10).toFixed(2)} bar ({(1 + s.depth / 10).toFixed(1)} ATM)
        </div>

        <div className="border-t border-[var(--ocean-light)] my-3" />

        {/* NDL or DECO display */}
        {inDeco ? (
          <>
            <div className="text-xs text-red-400 font-bold mb-1 tracking-wider">DECO OBLIGATION</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[10px] text-red-300 opacity-70">CEILING</span>
              <span className="text-2xl font-mono font-bold text-red-400">{s.ceiling.toFixed(1)}m</span>
            </div>
            <div className="text-[10px] text-red-300/60 mb-2">
              {s.decoStops.map((stop, i) => (
                <span key={i} className="mr-2">{stop.depth}m: {stop.duration}min</span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs text-[var(--cyan-dim)] opacity-70 mb-1">{t('ndlFull')}</div>
            <div className={`text-3xl font-mono font-bold mb-2 ${WarningColor(s.ndl, 10, 5, true)}`}>
              {s.ndl > 99 ? '99+' : s.ndl} <span className="text-sm opacity-60">{t('units.minutes')}</span>
            </div>
            <NdlBar ndl={s.ndl} />
          </>
        )}

        <div className="border-t border-[var(--ocean-light)] my-3" />

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] text-[var(--cyan-dim)] opacity-60">GAS</div>
            <div className="text-lg font-mono">{s.gasMix.label}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--cyan-dim)] opacity-60">PPO2</div>
            <div className={`text-lg font-mono ${WarningColor(s.currentPpo2, 1.2, 1.4)}`}>
              {s.currentPpo2.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--cyan-dim)] opacity-60">MOD</div>
            <div className="text-lg font-mono opacity-80">
              {((s.gasMix.fo2 > 0 ? (1.4 / s.gasMix.fo2 - 1) * 10 : 0)).toFixed(0)}{t('units.meters')}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--ocean-light)] my-3" />

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] text-[var(--cyan-dim)] opacity-60">CNS</div>
            <div className={`text-base font-mono ${WarningColor(s.cns, 75, 100)}`}>{s.cns.toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--cyan-dim)] opacity-60">{t('temperature')}</div>
            <div className="text-base font-mono opacity-80">{s.temperature}{t('units.celsius')}</div>
            <div className={`text-[9px] mt-1 ${waterType === 'seawater' ? 'text-blue-400' : 'text-green-400'}`}>
              {waterType === 'seawater' ? '🌊' : '🌿'} {waterDensity} kg/L
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--cyan-dim)] opacity-60">{t('ascentRate')}</div>
            <div className={`text-base font-mono ${WarningColor(Math.abs(s.ascentRate), 9, 18)}`}>
              {s.ascentRate.toFixed(0)} {t('units.metersPerMin')}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Tank & Time */}
      <div className="hud-panel absolute top-8 right-8 w-72 p-5">
        <div className="text-xs text-[var(--cyan-dim)] opacity-70 mb-1">TANK PRESSURE</div>
        <div className="flex items-baseline gap-3">
          <div className={`text-4xl font-mono font-bold ${WarningColor(s.tankPressure, 100, 50, true)}`}>
            {Math.round(s.tankPressure)}
          </div>
          <div className="text-sm opacity-60">{t('units.bar')}</div>
          <div className="text-sm font-mono text-gray-400 ml-auto">
            {Math.round(s.tankPressure * s.cylinderVolumeL)} L
          </div>
        </div>
        {/* Rule of Thirds tank bar */}
        <RuleOfThirdsBar pressure={s.tankPressure} max={s.startingPressure} />
        <div className="flex justify-between text-[9px] text-gray-600 mt-1">
          <span>{s.cylinderVolumeL}L tank</span>
          <span>Turn: {Math.round(s.startingPressure * 2 / 3)} bar</span>
          <span>Reserve: {Math.round(s.startingPressure / 3)} bar</span>
        </div>

        {/* Gas Used counter */}
        <div className="border-t border-[var(--ocean-light)] my-2" />
        <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
          <div>
            <div className="text-gray-500">Used</div>
            <div className="text-base font-mono text-orange-400">
              {Math.round(s.startingPressure - s.tankPressure)} bar
            </div>
            <div className="text-gray-600">
              {Math.round((s.startingPressure - s.tankPressure) * s.cylinderVolumeL)} L
            </div>
          </div>
          <div>
            <div className="text-gray-500">Remaining</div>
            <div className="text-base font-mono text-green-400">
              {Math.round(s.tankPressure)} bar
            </div>
            <div className="text-gray-600">
              {Math.round(s.tankPressure * s.cylinderVolumeL)} L
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--ocean-light)] my-3" />

        <div className="text-xs text-[var(--cyan-dim)] opacity-70 mb-1">{t('diveTime')}</div>
        <div className="text-3xl font-mono">
          {Math.floor(s.diveTime / 60).toString().padStart(2, '0')}:
          {Math.floor(s.diveTime % 60).toString().padStart(2, '0')}
        </div>

        <div className="border-t border-[var(--ocean-light)] my-3" />

        {/* Gas consumption — Boyle's Law education */}
        <div className="text-xs text-[var(--cyan-dim)] opacity-70 mb-1">GAS CONSUMPTION</div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-[9px] text-gray-500">SAC (surface)</div>
            <div className="text-sm font-mono">{s.sacRate} L/min</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500">At {s.depth.toFixed(0)}m ({(1 + s.depth / 10).toFixed(1)} bar)</div>
            <div className={`text-sm font-mono ${s.depth > 20 ? 'text-yellow-400' : 'text-white'}`}>
              {(s.sacRate * (1 + s.depth / 10)).toFixed(1)} L/min
            </div>
          </div>
        </div>
        <div className="text-[8px] text-gray-600 mt-1 text-center">
          {s.depth > 1
            ? `${s.sacRate} × ${(1 + s.depth / 10).toFixed(1)} bar = ${(s.sacRate * (1 + s.depth / 10)).toFixed(0)} L/min (×${(1 + s.depth / 10).toFixed(1)} surface)`
            : `Boyle's Law: SAC × P_amb = consumption at depth`}
        </div>
        {s.depth > 1 && (
          <div className="text-[8px] text-yellow-400/60 mt-1 text-center">
            Bar/min: {(s.sacRate * (1 + s.depth / 10) / s.cylinderVolumeL).toFixed(2)} bar/min from {s.cylinderVolumeL}L tank
          </div>
        )}

        <div className="border-t border-[var(--ocean-light)] my-3" />
        <div className="text-[10px] text-[var(--cyan-accent)] opacity-40 text-center">
          COMPUTER: Default Educational
        </div>
      </div>

      {/* Bottom Bar — Ascent Rate Gauge + Safety Stop + Controls */}
      <div className="hud-panel absolute bottom-8 left-1/2 -translate-x-1/2 w-[700px] px-6 py-3 flex items-center justify-between">
        {/* Ascent Rate Visual Gauge (left side of bottom bar) */}
        <AscentRateGauge />

        <div className="text-xs text-gray-500 text-center">
          {s.safetyStop.active ? (
            <span className="text-[var(--cyan-accent)]">
              {t('safetyStop')}: {Math.ceil(s.safetyStop.remaining)}s @ 5{t('units.meters')}
            </span>
          ) : s.safetyStop.required ? (
            s.safetyStopCompleted
              ? <span className="text-green-400">Safety Stop Complete &#10003;</span>
              : `${t('safetyStop')}: ${t('pending', { ns: 'bwraf', defaultValue: 'pending' })}`
          ) : (
            t('noDecoRequired')
          )}
        </div>

        <div className="flex gap-3">
          <button
            className="text-xs text-[var(--cyan-accent)] pointer-events-auto hover:underline"
            onClick={() => useDiveStore.getState().setSpeed(s.speed === 1 ? 5 : s.speed === 5 ? 30 : 1)}
          >
            {s.speed}x
          </button>
          <button
            className="text-xs text-red-400 pointer-events-auto hover:underline"
            onClick={() => useDiveStore.getState().endDive()}
          >
            END
          </button>
        </div>
      </div>

      {/* Safety Stop prominent panel (center screen) */}
      <SafetyStopPanel />

      {/* Deco Stop panel (center screen, replaces safety stop when in deco) */}
      <DecoStopPanel />

      {/* Tissue Loading mini chart (bottom left) */}
      <TissueLoadingPanel />

      {/* Right side control panel — Swim + BCD */}
      <div className="absolute right-6 bottom-28 flex gap-4 pointer-events-auto select-none">

        {/* Swim Up/Down (fin kick) */}
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-12 h-12 rounded-lg bg-[var(--glass-bg)] border border-[var(--green-safe)] flex items-center justify-center text-[var(--green-safe)] hover:bg-[var(--green-safe)]/20 active:bg-[var(--green-safe)]/40 transition-all"
            onPointerDown={() => setFinKickUp(true)}
            onPointerUp={() => setFinKickUp(false)}
            onPointerLeave={() => setFinKickUp(false)}
            title="Fin kick up (Space)"
          >
            <span className="text-lg">&#9650;</span>
          </button>
          <div className="text-[8px] text-[var(--green-safe)] opacity-60">SWIM</div>
          <button
            className="w-12 h-12 rounded-lg bg-[var(--glass-bg)] border border-[var(--green-safe)] flex items-center justify-center text-[var(--green-safe)] hover:bg-[var(--green-safe)]/20 active:bg-[var(--green-safe)]/40 transition-all"
            onPointerDown={() => setFinKickDown(true)}
            onPointerUp={() => setFinKickDown(false)}
            onPointerLeave={() => setFinKickDown(false)}
            title="Fin kick down (Shift)"
          >
            <span className="text-lg">&#9660;</span>
          </button>
        </div>

        {/* Auto-neutral button */}
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-14 h-14 rounded-full bg-[var(--glass-bg)] border-2 border-green-500 flex items-center justify-center text-green-400 text-xs font-bold hover:bg-green-500/20 active:bg-green-500/40 transition-all"
            onClick={autoNeutral}
            title="Auto Neutral Buoyancy (N)"
          >
            <span>N</span>
          </button>
          <div className="text-[8px] text-green-400 opacity-60 text-center leading-tight">AUTO<br/>NEUTRAL</div>
        </div>

        {/* BCD inflate/deflate */}
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-12 h-12 rounded-lg bg-[var(--glass-bg)] border border-[var(--cyan-accent)] flex items-center justify-center text-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/20 active:bg-[var(--cyan-accent)]/40 transition-all"
            onPointerDown={() => setBcdInflating(true)}
            onPointerUp={() => setBcdInflating(false)}
            onPointerLeave={() => setBcdInflating(false)}
            title="Inflate BCD"
          >
            <span className="text-xl font-bold">+</span>
          </button>
          <div className="text-center">
            <div className="text-[8px] text-[var(--cyan-dim)] opacity-60">BCD</div>
            <div className="w-8 h-20 bg-[var(--ocean-light)]/50 rounded-sm overflow-hidden relative mx-auto mt-1">
              <div
                className="absolute bottom-0 left-0 right-0 bg-[var(--cyan-accent)] opacity-60 bar-transition"
                style={{ height: `${(s.bcdActualVolume / 18) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white">
                {s.bcdActualVolume.toFixed(1)}
              </div>
            </div>
          </div>
          <button
            className="w-12 h-12 rounded-lg bg-[var(--glass-bg)] border border-[var(--cyan-accent)] flex items-center justify-center text-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/20 active:bg-[var(--cyan-accent)]/40 transition-all"
            onPointerDown={() => setBcdDeflating(true)}
            onPointerUp={() => setBcdDeflating(false)}
            onPointerLeave={() => setBcdDeflating(false)}
            title="Deflate BCD"
          >
            <span className="text-xl font-bold">-</span>
          </button>
        </div>
      </div>

      {/* Action indicators — center screen arrows */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-1">
        {s.finKickUp && (
          <div className="text-[var(--green-safe)] text-3xl animate-bounce">&#9650;</div>
        )}
        {s.bcdInflating && (
          <div className="text-[var(--cyan-accent)] text-xs">BCD +</div>
        )}
        {s.bcdDeflating && (
          <div className="text-[var(--cyan-accent)] text-xs">BCD -</div>
        )}
        {s.finKickDown && (
          <div className="text-[var(--green-safe)] text-3xl animate-bounce">&#9660;</div>
        )}
      </div>

      {/* Buoyancy indicator — shows if positive/negative/neutral */}
      <div className="absolute left-1/2 bottom-36 -translate-x-1/2 pointer-events-none text-center">
        <div className={`text-xs font-mono ${
          s.netBuoyancy > 5 ? 'text-yellow-400' :
          s.netBuoyancy < -5 ? 'text-orange-400' :
          'text-green-400'
        }`}>
          {s.netBuoyancy > 5 ? '▲ Positive' :
           s.netBuoyancy < -5 ? '▼ Negative' :
           '● Neutral'}
          {' '}({s.netBuoyancy.toFixed(0)}N)
        </div>
      </div>

      {/* Active keys indicator */}
      <KeyIndicator />

      {/* Controls hint */}
      <div className="absolute bottom-28 left-8 text-[10px] text-gray-600 pointer-events-none">
        W/S Swim · A/D Turn · Space Up · Shift Down · N Neutral · BCD +/- · Mouse orbit
      </div>

      {/* Warnings overlay */}
      {s.activeWarnings.filter(w => w.severity === 'critical').map((w) => (
        <div
          key={w.type}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/80 border-2 border-red-500 rounded-xl px-8 py-4 flash pointer-events-none"
        >
          <div className="text-2xl font-bold text-red-400">{w.message}</div>
        </div>
      ))}
    </>
  );
}

/** Shows which keys are currently pressed -- debug + feedback */
function KeyIndicator() {
  const [activeKeys, setActiveKeys] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveKeys(keys.size > 0 ? Array.from(keys).join(' ') : '');
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (!activeKeys) return null;
  return (
    <div className="absolute bottom-40 left-8 pointer-events-none">
      <div className="flex gap-1">
        {Array.from(keys).map((k) => (
          <span key={k} className="px-2 py-1 bg-[var(--cyan-accent)]/20 border border-[var(--cyan-accent)]/50 rounded text-[var(--cyan-accent)] text-xs font-mono">
            {k.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
