import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Purchase } from '../engine/types';
import { addPurchase, deletePurchase, importData, listNoPurchaseDays, listPurchases, requestPersistence, setNoPurchaseDay } from '../services/storage';

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
  /** Dernier niveau déjà fêté : sert à ne célébrer un passage de niveau qu'une fois. */
  lastSeenLevel: number | null;
  setLastSeenLevel: (level: number | null) => void;
  /** Date (ms) de la dernière sauvegarde exportée, ou du dernier rappel mis de côté. */
  lastBackupAt: number | null;
  setLastBackupAt: (t: number) => void;
  /** Le conseil d'installation sur iPhone a été fermé. */
  installTipDismissed: boolean;
  dismissInstallTip: () => void;
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
      lastSeenLevel: null,
      setLastSeenLevel: (lastSeenLevel) => set({ lastSeenLevel }),
      lastBackupAt: null,
      setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
      installTipDismissed: false,
      dismissInstallTip: () => set({ installTipDismissed: true }),
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
  /** Journées « rien acheté aujourd'hui » validées (AAAA-MM-JJ). */
  noPurchaseDays: string[];
  setNoPurchase: (date: string, on: boolean) => Promise<void>;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (p: Purchase) => Promise<Purchase>;
  remove: (id: number) => Promise<void>;
  importMany: (purchases: readonly Purchase[], days: readonly string[]) => Promise<void>;
}

export const usePurchases = create<PurchasesStore>()((set, get) => ({
  purchases: [],
  noPurchaseDays: [],
  setNoPurchase: async (date, on) => {
    await setNoPurchaseDay(date, on);
    const rest = get().noPurchaseDays.filter((d) => d !== date);
    set({ noPurchaseDays: on ? [...rest, date] : rest });
  },
  loaded: false,
  error: null,
  load: async () => {
    try {
      const [purchases, noPurchaseDays] = await Promise.all([listPurchases(), listNoPurchaseDays()]);
      set({ purchases, noPurchaseDays, loaded: true, error: null });
    } catch {
      set({ loaded: true, error: 'Le stockage de cet appareil est indisponible : les achats ne seront pas mémorisés.' });
    }
  },
  add: async (p) => {
    const saved = await addPurchase(p);
    // Premier achat : on demande au navigateur de protéger les données (au moment d'un geste de l'utilisateur).
    if (get().purchases.length === 0) void requestPersistence();
    set({ purchases: [...get().purchases, saved] });
    return saved;
  },
  importMany: async (purchases, days) => {
    const saved = await importData(purchases, days);
    set({
      purchases: [...get().purchases, ...saved],
      noPurchaseDays: [...new Set([...get().noPurchaseDays, ...days])],
    });
    void requestPersistence();
  },
  remove: async (id) => {
    await deletePurchase(id);
    set({ purchases: get().purchases.filter((p) => p.id !== id) });
  },
}));
