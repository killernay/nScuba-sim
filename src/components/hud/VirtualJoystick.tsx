import { useRef, useCallback } from 'react';
import { keys } from '../../input';

/**
 * Virtual joystick for touch/iPad.
 * Injects into the global `keys` set so Diver reads it the same as keyboard.
 */
export function VirtualJoystick() {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const RADIUS = 50; // max knob travel in px
  const DEAD_ZONE = 10;

  const updateKeys = useCallback((dx: number, dy: number) => {
    // Clear previous directions
    keys.delete('w');
    keys.delete('s');
    keys.delete('a');
    keys.delete('d');

    if (Math.abs(dy) > DEAD_ZONE) {
      if (dy < -DEAD_ZONE) keys.add('w');  // up = forward
      if (dy > DEAD_ZONE) keys.add('s');   // down = backward
    }
    if (Math.abs(dx) > DEAD_ZONE) {
      if (dx < -DEAD_ZONE) keys.add('a');  // left = turn left
      if (dx > DEAD_ZONE) keys.add('d');   // right = turn right
    }
  }, []);

  const onStart = useCallback((e: React.TouchEvent) => {
    if (activeTouch.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouch.current = touch.identifier;

    const rect = stickRef.current!.getBoundingClientRect();
    center.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const onMove = useCallback((e: React.TouchEvent) => {
    if (activeTouch.current === null) return;
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== activeTouch.current) continue;

      let dx = touch.clientX - center.current.x;
      let dy = touch.clientY - center.current.y;

      // Clamp to radius
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }

      // Move knob visual
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      updateKeys(dx, dy);
    }
  }, [updateKeys]);

  const onEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouch.current) {
        activeTouch.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        keys.delete('w');
        keys.delete('s');
        keys.delete('a');
        keys.delete('d');
        break;
      }
    }
  }, []);

  return (
    <div className="absolute bottom-32 left-8 pointer-events-auto select-none touch-none">
      {/* Base circle */}
      <div
        ref={stickRef}
        className="w-32 h-32 rounded-full bg-white/5 border border-white/15 flex items-center justify-center"
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
      >
        {/* Direction labels */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-white/30">W</span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/30">S</span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-white/30">A</span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-white/30">D</span>

        {/* Knob */}
        <div
          ref={knobRef}
          className="w-14 h-14 rounded-full bg-[var(--cyan-accent)]/30 border-2 border-[var(--cyan-accent)]/60 transition-[background] duration-100"
        />
      </div>
      <div className="text-[8px] text-white/30 text-center mt-1">SWIM</div>
    </div>
  );
}
