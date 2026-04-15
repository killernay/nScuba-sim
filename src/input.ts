/**
 * Global keyboard state — registers ONCE on module load.
 * No React dependency. Guaranteed to work.
 */

export const keys = new Set<string>();

function codeToKey(code: string): string {
  const map: Record<string, string> = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
    KeyN: 'n', KeyE: 'e', KeyQ: 'q',
    Space: 'space',
    ShiftLeft: 'shift', ShiftRight: 'shift',
    ArrowUp: 'up', ArrowDown: 'down',
    ArrowLeft: 'left', ArrowRight: 'right',
    Digit1: '1', Digit2: '2', Digit3: '3',
    Escape: 'escape',
  };
  return map[code] ?? code.toLowerCase();
}

document.addEventListener('keydown', (e) => {
  const k = codeToKey(e.code);
  keys.add(k);
  if (k === 'space' || k === 'shift') e.preventDefault();
});

document.addEventListener('keyup', (e) => {
  keys.delete(codeToKey(e.code));
});

window.addEventListener('blur', () => keys.clear());
