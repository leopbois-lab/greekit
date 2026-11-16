import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  muted: boolean;
  toggleMuted: () => void;
}

/** Réglages mémorisés sur l'appareil (le bouton muet survit au rechargement). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    { name: 'hmf-settings' },
  ),
);

interface PlanetStore {
  /** Vie de la planète, de 0 à 1. Branchée sur le budget réel à l'étape 5. */
  health: number;
  setHealth: (h: number) => void;
}

export const usePlanet = create<PlanetStore>()((set) => ({
  health: 1,
  setHealth: (health) => set({ health }),
}));
