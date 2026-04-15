import { useRef, useEffect, useCallback } from 'react';
import { useDiveStore } from '../../stores/diveStore';
import type { ProfilePoint } from '../../types';

// ─── Helpers ────────────────────────────────────────────────────

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Grade logic ────────────────────────────────────────────────

interface GradeResult {
  letter: 'A' | 'B' | 'C' | 'F';
  color: string;
}

function computeGrade(
  violations: ViolationEntry[],
  safetyStopDone: boolean,
  maxAscentRate: number,
  outOfAir: boolean,
  ceilingBreach: boolean,
): GradeResult {
  if (outOfAir || ceilingBreach || maxAscentRate > 18) {
    return { letter: 'F', color: '#f44336' };
  }
  const hasModExceed = violations.some((v) => v.type === 'mod');
  if (!safetyStopDone || hasModExceed) {
    return { letter: 'C', color: '#ff9800' };
  }
  if (maxAscentRate > 12) {
    return { letter: 'B', color: '#ffeb3b' };
  }
  return { letter: 'A', color: '#4caf50' };
}

// ─── Violation detection ────────────────────────────────────────

interface ViolationEntry {
  type: 'fast_ascent' | 'mod';
  time: number;
  depth: number;
}

function detectViolations(log: ProfilePoint[], gasFo2: number): ViolationEntry[] {
  const violations: ViolationEntry[] = [];
  const modDepth = Math.floor((1.4 / gasFo2 - 1) * 10);

  for (let i = 1; i < log.length; i++) {
    const prev = log[i - 1];
    const cur = log[i];
    const dt = (cur.time - prev.time) / 60; // minutes
    if (dt <= 0) continue;
    const ascentRate = (prev.depth - cur.depth) / dt;
    if (ascentRate > 12) {
      violations.push({ type: 'fast_ascent', time: cur.time, depth: cur.depth });
    }
    if (cur.depth > modDepth) {
      violations.push({ type: 'mod', time: cur.time, depth: cur.depth });
    }
  }
  return violations;
}

// ─── Instructor notes ───────────────────────────────────────────

function generateNotes(
  sacRate: number,
  maxAscentRate: number,
  safetyStopDone: boolean,
  maxDepth: number,
  _endNdl: number,
  violations: ViolationEntry[],
): string[] {
  const notes: string[] = [];

  // Gas consumption
  if (sacRate < 12) {
    notes.push('Excellent air consumption. Your SAC rate is well within recreational norms.');
  } else if (sacRate < 18) {
    notes.push('Your gas consumption is within normal range. Practice relaxed breathing to improve further.');
  } else {
    notes.push('High gas consumption detected. Focus on slow, deep breathing and reducing exertion underwater.');
  }

  // Ascent rate
  if (maxAscentRate > 18) {
    notes.push('CRITICAL: Your ascent rate exceeded 18 m/min. This dramatically increases decompression sickness risk. Always ascend slowly.');
  } else if (maxAscentRate > 12) {
    notes.push('Your ascent rate was momentarily fast. Try to maintain a steady 9 m/min or slower ascent.');
  } else {
    notes.push('Good ascent rate control throughout the dive.');
  }

  // Safety stop
  if (safetyStopDone) {
    notes.push('Safety stop completed successfully. Good practice even when not mandatory.');
  } else {
    notes.push('Safety stop was not completed. Always perform a 3-minute stop at 5 meters before surfacing.');
  }

  // Depth / NDL
  if (maxDepth > 30) {
    notes.push(`Deep dive to ${maxDepth.toFixed(1)}m significantly reduces NDL. Plan deeper dives carefully and monitor nitrogen loading.`);
  } else if (maxDepth > 18) {
    notes.push('Good depth management within standard recreational limits.');
  }

  // Tip
  if (violations.length === 0) {
    notes.push('Overall excellent dive profile. Keep up the disciplined approach.');
  } else {
    notes.push(`${violations.length} violation(s) detected. Review each event and practice corrective techniques.`);
  }

  return notes;
}

// ─── Canvas drawing ─────────────────────────────────────────────

function drawProfile(
  canvas: HTMLCanvasElement,
  log: ProfilePoint[],
  violations: ViolationEntry[],
  safetyStopDone: boolean,
  maxDepth: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || log.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const PAD_L = 55;
  const PAD_R = 15;
  const PAD_T = 20;
  const PAD_B = 35;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const maxTime = log[log.length - 1].time;
  const depthCeil = Math.ceil(Math.max(maxDepth + 2, 10) / 5) * 5;

  const xOf = (t: number) => PAD_L + (t / maxTime) * plotW;
  const yOf = (d: number) => PAD_T + (d / depthCeil) * plotH;

  // Background
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(79,195,247,0.12)';
  ctx.lineWidth = 0.5;
  for (let d = 0; d <= depthCeil; d += 5) {
    const y = yOf(d);
    ctx.beginPath();
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(W - PAD_R, y);
    ctx.stroke();
  }
  const timeStep = maxTime > 600 ? 120 : maxTime > 300 ? 60 : 30;
  for (let t = 0; t <= maxTime; t += timeStep) {
    const x = xOf(t);
    ctx.beginPath();
    ctx.moveTo(x, PAD_T);
    ctx.lineTo(x, H - PAD_B);
    ctx.stroke();
  }

  // Safety stop dashed line at 5m
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(76,175,80,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_L, yOf(5));
  ctx.lineTo(W - PAD_R, yOf(5));
  ctx.stroke();
  ctx.setLineDash([]);

  // Shaded area under curve
  const gradient = ctx.createLinearGradient(0, PAD_T, 0, H - PAD_B);
  gradient.addColorStop(0, 'rgba(0,229,255,0.08)');
  gradient.addColorStop(1, 'rgba(0,100,200,0.25)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(xOf(log[0].time), yOf(0));
  for (const p of log) {
    ctx.lineTo(xOf(p.time), yOf(p.depth));
  }
  ctx.lineTo(xOf(log[log.length - 1].time), yOf(0));
  ctx.closePath();
  ctx.fill();

  // Depth line
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < log.length; i++) {
    const x = xOf(log[i].time);
    const y = yOf(log[i].depth);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Deco zones (ndl <= 0 → red background)
  for (let i = 0; i < log.length - 1; i++) {
    if (log[i].ndl <= 0) {
      const x1 = xOf(log[i].time);
      const x2 = xOf(log[i + 1].time);
      ctx.fillStyle = 'rgba(244,67,54,0.15)';
      ctx.fillRect(x1, PAD_T, x2 - x1, plotH);
    }
  }

  // Violation red dots
  for (const v of violations) {
    const x = xOf(v.time);
    const y = yOf(v.depth);
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Safety stop green dot (find point around 5m near end)
  if (safetyStopDone) {
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].depth >= 4 && log[i].depth <= 6) {
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(xOf(log[i].time), yOf(log[i].depth), 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  // Axes labels
  ctx.fillStyle = '#667788';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let d = 0; d <= depthCeil; d += 5) {
    ctx.fillText(`${d}m`, PAD_L - 6, yOf(d));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = 0; t <= maxTime; t += timeStep) {
    ctx.fillText(fmtMMSS(t), xOf(t), H - PAD_B + 6);
  }

  // Axis titles
  ctx.fillStyle = '#4fc3f7';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Time', PAD_L + plotW / 2, H - 4);
  ctx.save();
  ctx.translate(12, PAD_T + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Depth', 0, 0);
  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────

export function PostDiveAnalysis() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const profileLog = useDiveStore((s) => s.profileLog);
  const maxDepth = useDiveStore((s) => s.maxDepth);
  const diveTime = useDiveStore((s) => s.diveTime);
  const startingPressure = useDiveStore((s) => s.startingPressure);
  const tankPressure = useDiveStore((s) => s.tankPressure);
  const sacRate = useDiveStore((s) => s.sacRate);
  const gasMix = useDiveStore((s) => s.gasMix);
  const cylinderVolumeL = useDiveStore((s) => s.cylinderVolumeL);
  const cns = useDiveStore((s) => s.cns);
  const safetyStop = useDiveStore((s) => s.safetyStop);
  const initDive = useDiveStore((s) => s.initDive);
  const setPhase = useDiveStore((s) => s.setPhase);

  // Computed values
  const avgDepth =
    profileLog.length > 0
      ? profileLog.reduce((sum, p) => sum + p.depth, 0) / profileLog.length
      : 0;

  const gasUsedBar = startingPressure - tankPressure;
  const gasUsedL = gasUsedBar * cylinderVolumeL;

  const endNdl = profileLog.length > 0 ? profileLog[profileLog.length - 1].ndl : 99;
  const maxPpo2 =
    profileLog.length > 0 ? Math.max(...profileLog.map((p) => p.ppo2)) : gasMix.fo2;

  // Calculate actual SAC from dive data
  const diveTimeMin = diveTime / 60;
  const actualSac =
    diveTimeMin > 0 && avgDepth > 0
      ? gasUsedL / diveTimeMin / (avgDepth / 10 + 1)
      : sacRate;

  // Max ascent rate from profile
  let maxAscentRate = 0;
  for (let i = 1; i < profileLog.length; i++) {
    const dt = (profileLog[i].time - profileLog[i - 1].time) / 60;
    if (dt <= 0) continue;
    const rate = (profileLog[i - 1].depth - profileLog[i].depth) / dt;
    if (rate > maxAscentRate) maxAscentRate = rate;
  }

  const safetyStopDone = safetyStop.required ? safetyStop.remaining <= 0 : true;

  const violations = detectViolations(profileLog, gasMix.fo2);
  const outOfAir = tankPressure <= 0;
  const ceilingBreach = false; // would need ceiling tracking per point
  const grade = computeGrade(violations, safetyStopDone, maxAscentRate, outOfAir, ceilingBreach);
  const notes = generateNotes(actualSac, maxAscentRate, safetyStopDone, maxDepth, endNdl, violations);

  // Draw canvas
  useEffect(() => {
    if (canvasRef.current && profileLog.length >= 2) {
      drawProfile(canvasRef.current, profileLog, violations, safetyStopDone, maxDepth);
    }
  }, [profileLog, violations, safetyStopDone, maxDepth]);

  const handleRetry = useCallback(() => {
    initDive({
      tankPressure: startingPressure,
      cylinderVolumeL,
      gasMix,
      sacRate,
      gfLow: useDiveStore.getState().gfLow,
      gfHigh: useDiveStore.getState().gfHigh,
    });
  }, [initDive, startingPressure, cylinderVolumeL, gasMix, sacRate]);

  const handleMenu = useCallback(() => {
    setPhase('setup');
  }, [setPhase]);

  // ─── Stat row helper ──────────────────────────────────────────
  const Stat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
    <div className="flex justify-between items-baseline py-1 border-b border-[rgba(0,229,255,0.1)]">
      <span className="text-[var(--text-secondary)] text-sm">{label}</span>
      <span className="text-[var(--text-primary)] font-mono text-sm">
        {value}
        {unit && <span className="text-[var(--text-secondary)] ml-1 text-xs">{unit}</span>}
      </span>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 overflow-auto"
         style={{ background: 'var(--ocean-deep)' }}>
      {/* Title */}
      <h1 className="text-2xl font-bold mb-4 text-[var(--cyan-accent)]">Post-Dive Analysis</h1>

      <div className="flex flex-wrap gap-4 w-full max-w-[1200px]">
        {/* ── Left: Depth Profile Graph ────────────────────────── */}
        <div className="glass p-4 flex-[3] min-w-[400px]">
          <h2 className="text-sm font-semibold text-[var(--cyan-dim)] mb-2">Depth Profile</h2>
          <canvas
            ref={canvasRef}
            className="w-full rounded"
            style={{ height: '340px', background: '#0a1628' }}
          />
        </div>

        {/* ── Right column ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4 flex-[2] min-w-[280px]">
          {/* Grade */}
          <div className="glass p-4 flex items-center gap-4">
            <div
              className="text-6xl font-black leading-none"
              style={{ color: grade.color, textShadow: `0 0 20px ${grade.color}40` }}
            >
              {grade.letter}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              {grade.letter === 'A' && 'All procedures correct. Excellent dive.'}
              {grade.letter === 'B' && 'Minor issues detected but overall good.'}
              {grade.letter === 'C' && 'Procedural errors need attention.'}
              {grade.letter === 'F' && 'Major violations. Review safety procedures.'}
            </div>
          </div>

          {/* Stats */}
          <div className="glass p-4">
            <h2 className="text-sm font-semibold text-[var(--cyan-dim)] mb-2">Dive Statistics</h2>
            <Stat label="Max Depth" value={maxDepth.toFixed(1)} unit="m" />
            <Stat label="Avg Depth" value={avgDepth.toFixed(1)} unit="m" />
            <Stat label="Dive Time" value={fmtTime(diveTime)} />
            <Stat label="Gas Used" value={`${gasUsedBar.toFixed(0)} bar (${gasUsedL.toFixed(0)} L)`} />
            <Stat label="SAC Rate" value={actualSac.toFixed(1)} unit="L/min" />
            <Stat label="Gas Mix" value={gasMix.label} />
            <Stat label="NDL at End" value={endNdl <= 0 ? 'DECO' : `${endNdl}`} unit={endNdl > 0 ? 'min' : ''} />
            <Stat label="Safety Stop" value={safetyStopDone ? 'Completed' : 'Skipped'} />
            <Stat label="Max Ascent Rate" value={maxAscentRate.toFixed(1)} unit="m/min" />
            <Stat label="CNS" value={cns.toFixed(0)} unit="%" />
            <Stat label="PPO2 Max" value={maxPpo2.toFixed(2)} unit="bar" />
            <Stat label="Violations" value={String(violations.length)} />
          </div>
        </div>
      </div>

      {/* ── Instructor Notes ───────────────────────────────────── */}
      <div className="glass p-4 mt-4 w-full max-w-[1200px]">
        <h2 className="text-sm font-semibold text-[var(--cyan-dim)] mb-2">Instructor Notes</h2>
        <div className="space-y-2">
          {notes.map((note, i) => (
            <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {note}
            </p>
          ))}
        </div>
      </div>

      {/* ── Action Buttons ─────────────────────────────────────── */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={handleRetry}
          className="hud-panel px-6 py-2 text-sm font-semibold text-[var(--cyan-accent)] hover:bg-[rgba(0,229,255,0.1)] transition-colors cursor-pointer"
        >
          RETRY
        </button>
        <button
          className="hud-panel px-6 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[rgba(0,229,255,0.05)] transition-colors cursor-pointer"
        >
          SAVE LOG
        </button>
        <button
          onClick={handleMenu}
          className="hud-panel px-6 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[rgba(0,229,255,0.05)] transition-colors cursor-pointer"
        >
          MENU
        </button>
      </div>
    </div>
  );
}
