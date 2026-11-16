import { useSettings } from './store';

/** Sons courts et doux, générés en Web Audio : aucun fichier audio. */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** iOS : l'AudioContext doit être débloqué par un geste de l'utilisateur. */
export function installAudioUnlock(): void {
  const unlock = () => {
    const c = getContext();
    if (c && c.state === 'suspended') void c.resume();
    if (c && c.state === 'running') {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

type Note = [freq: number, start: number, duration: number];

// Ondes sinusoïdales, attaque et extinction progressives, volume bas : présent sans être agressif.
const SFX = {
  click: { volume: 0.05, notes: [[520, 0, 0.09]] },
  toggle: { volume: 0.05, notes: [[440, 0, 0.1], [587, 0.07, 0.14]] },
  coin: { volume: 0.06, notes: [[659, 0, 0.16], [880, 0.09, 0.28]] },
  levelUp: { volume: 0.06, notes: [[523, 0, 0.22], [659, 0.11, 0.22], [784, 0.22, 0.24], [1047, 0.33, 0.5]] },
  error: { volume: 0.05, notes: [[233, 0, 0.16], [196, 0.12, 0.26]] },
} satisfies Record<string, { volume: number; notes: Note[] }>;

export type SfxName = keyof typeof SFX;
export const SFX_NAMES = Object.keys(SFX) as SfxName[];

export function playSfx(name: SfxName): void {
  if (useSettings.getState().muted) return;
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const { volume, notes } = SFX[name];
  const t0 = c.currentTime + 0.01;
  for (const [freq, start, duration] of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.linearRampToValueAtTime(volume, t0 + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + duration + 0.03);
  }
}
