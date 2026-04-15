import { useEffect } from 'react';
import { useDiveStore } from '../stores/diveStore';
import { keys } from '../input';

// Re-export for backward compat
export { keys as keysPressed } from '../input';

/**
 * Bridges keyboard state → dive store actions.
 * Runs every frame via RAF.
 */
export function useControls() {
  useEffect(() => {
    let raf: number;
    let prevKeys = new Set<string>();

    const tick = () => {
      const s = useDiveStore.getState();
      const inDive = s.phase !== 'setup' && s.phase !== 'postdive';

      if (inDive) {
        // Continuous: fin kick up/down
        s.setFinKickUp(keys.has('space') || keys.has('up'));
        s.setFinKickDown(keys.has('shift') || keys.has('down'));

        // One-shot keys (trigger on press, not hold)
        if (keys.has('n') && !prevKeys.has('n')) s.autoNeutral();
        if (keys.has('1') && !prevKeys.has('1')) s.setSpeed(1);
        if (keys.has('2') && !prevKeys.has('2')) s.setSpeed(5);
        if (keys.has('3') && !prevKeys.has('3')) s.setSpeed(30);
        if (keys.has('escape') && !prevKeys.has('escape')) s.endDive();
      }

      prevKeys = new Set(keys);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
