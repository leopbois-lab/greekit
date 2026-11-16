import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Purchase } from '../engine/types';
import { addPurchase, deletePurchase, listPurchases } from '../services/storage';

export type Theme = 'auto' | 'clair' | 'sombre';

interface SettingsState {
  muted: boolean;
  toggleMuted: () => void;
  /** Apparence : suit le système, ou forcée en clair ou en sombre. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Budget mensuel personnalisé en kg CO2e ; `null` = moyenne française ÷ 12. */
  customMonthlyBudgetKg: number | null;
  setCustomMonthlyBudgetKg: (kg: number | null) => void;
}

/** Réglages mémorisés sur l'appareil (le bouton muet survit au rechargement). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      theme: 'auto',
      setTheme: (theme) => set({ theme }),
      customMonthlyBudgetKg: null,
      setCustomMonthlyBudgetKg: (customMonthlyBudgetKg) => set({ customMonthlyBudgetKg }),
    }),
    { name: 'hmf-settings' },
  ),
);

interface PlanetStore {
  /** Aperçu forcé de la vie (galerie de composants) ; `null` = vie réelle. */
  preview: number | null;
  setPreview: (h: number | null) => void;
}

export const usePlanet = create<PlanetStore>()((set) => ({
  preview: null,
  setPreview: (preview) => set({ preview }),
}));

interface PurchasesStore {
  purchases: Purchase[];
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (p: Purchase) => Promise<Purchase>;
  remove: (id: number) => Promise<void>;
}

export const usePurchases = create<PurchasesStore>()((set, get) => ({
  purchases: [],
  loaded: false,
  error: null,
  load: async () => {
    try {
      set({ purchases: await listPurchases(), loaded: true, error: null });
    } catch {
      set({ loaded: true, error: 'Le stockage de cet appareil est indisponible : les achats ne seront pas mémorisés.' });
    }
  },
  add: async (p) => {
    const saved = await addPurchase(p);
    set({ purchases: [...get().purchases, saved] });
    return saved;
  },
  remove: async (id) => {
    await deletePurchase(id);
    set({ purchases: get().purchases.filter((p) => p.id !== id) });
  },
}));
