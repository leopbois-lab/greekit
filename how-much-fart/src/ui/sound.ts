import { useSettings } from './store';

/** Sons chiptune générés en Web Audio : aucun fichier audio. */

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

const SFX = {
  click: { wave: 'square', notes: [[660, 0, 0.05]] },
  toggle: { wave: 'square', notes: [[440, 0, 0.05], [660, 0.05, 0.06]] },
  coin: { wave: 'square', notes: [[988, 0, 0.07], [1319, 0.07, 0.22]] },
  levelUp: {
    wave: 'square',
    notes: [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.09], [1047, 0.27, 0.09], [1319, 0.36, 0.3]],
  },
  error: { wave: 'triangle', notes: [[220, 0, 0.12], [165, 0.12, 0.2]] },
} satisfies Record<string, { wave: OscillatorType; notes: Note[] }>;

export type SfxName = keyof typeof SFX;
export const SFX_NAMES = Object.keys(SFX) as SfxName[];

export function playSfx(name: SfxName): void {
  if (useSettings.getState().muted) return;
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const { wave, notes } = SFX[name];
  const t0 = c.currentTime + 0.01;
  for (const [freq, start, duration] of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.07, t0 + start);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + duration + 0.02);
  }
}
