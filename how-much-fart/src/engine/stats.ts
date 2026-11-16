import { CATEGORY_IDS, type CategoryId } from '../data/schema';
import { toDateKey } from './format';
import { addDays } from './game';
import type { Purchase } from './types';

/** Périodes des statistiques. `mois` et `30-jours` se lisent jour par jour, `annee` mois par mois. */
export type StatsPeriod = 'mois' | '30-jours' | 'annee';

/**
 * Ordre d'affichage fixe des catégories dans les graphiques : c'est l'ordre dans lequel
 * leurs couleurs ont été validées (voisines distinguables). Ne pas le réordonner.
 */
export const CATEGORY_CHART_ORDER: readonly CategoryId[] = [
  'vetements', 'alimentation', 'transport', 'electronique', 'energie',
  'numerique', 'mobilier', 'electromenager', 'boissons', 'loisirs',
];

export interface Bucket {
  /** Clé du jour (AAAA-MM-JJ) ou du mois (AAAA-MM). */
  key: string;
  total: number;
  byCategory: Partial<Record<CategoryId, number>>;
}

/** Liste des intervalles de la période, du plus ancien au plus récent, vides compris. */
export function bucketKeys(period: StatsPeriod, now: Date): string[] {
  const today = toDateKey(now);
  if (period === 'annee') {
    const keys: string[] = [];
    for (let i = 11; i >= 0; i--) keys.push(toDateKey(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
    return keys;
  }
  if (period === 'mois') {
    const n = Number(today.slice(8, 10));
    return Array.from({ length: n }, (_, i) => `${today.slice(0, 8)}${String(i + 1).padStart(2, '0')}`);
  }
  return Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
}

export function buildBuckets(purchases: readonly Purchase[], period: StatsPeriod, now: Date): Bucket[] {
  const keys = bucketKeys(period, now);
  const byKey = new Map<string, Bucket>(keys.map((key) => [key, { key, total: 0, byCategory: {} }]));
  for (const p of purchases) {
    const bucket = byKey.get(period === 'annee' ? p.date.slice(0, 7) : p.date);
    if (!bucket) continue;
    bucket.total += p.kgCO2e;
    bucket.byCategory[p.category] = (bucket.byCategory[p.category] ?? 0) + p.kgCO2e;
  }
  return keys.map((k) => byKey.get(k)!);
}

export interface CategoryTotal {
  category: CategoryId;
  kg: number;
  /** Part du total, entre 0 et 1. */
  share: number;
}

/** Totaux par catégorie sur un ensemble d'intervalles, du plus gros au plus petit, sans les catégories vides. */
export function totalsByCategory(buckets: readonly Bucket[]): CategoryTotal[] {
  const totals = new Map<CategoryId, number>();
  for (const b of buckets) {
    for (const c of CATEGORY_IDS) {
      const kg = b.byCategory[c];
      if (kg) totals.set(c, (totals.get(c) ?? 0) + kg);
    }
  }
  const sum = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .map(([category, kg]) => ({ category, kg, share: sum > 0 ? kg / sum : 0 }))
    .sort((a, b) => b.kg - a.kg);
}

/**
 * Catégories à dessiner dans le graphique empilé : les `max` plus grosses gardent leur couleur
 * (dans l'ordre fixe d'affichage), le reste est regroupé dans « Autres ».
 */
export function stackCategories(totals: readonly CategoryTotal[], max = 5): { shown: CategoryId[]; others: CategoryId[] } {
  const top = new Set(totals.slice(0, max).map((t) => t.category));
  return {
    shown: CATEGORY_CHART_ORDER.filter((c) => top.has(c)),
    others: totals.slice(max).map((t) => t.category),
  };
}

/** Graduations « rondes » pour un axe partant de zéro : 3 à 5 paliers. */
export function niceTicks(max: number): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const ticks: number[] = [];
  for (let v = 0; v < max + step - 1e-9; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

export interface Summary {
  totalKg: number;
  /** Jours ayant au moins un achat sur la période. */
  activeDays: number;
  /** Moyenne par jour ayant au moins un achat ; 0 si aucun. */
  perActiveDayKg: number;
  top: CategoryTotal | null;
}

export function summarize(purchases: readonly Purchase[], buckets: readonly Bucket[], period: StatsPeriod): Summary {
  const keys = new Set(buckets.map((b) => b.key));
  const inPeriod = purchases.filter((p) => keys.has(period === 'annee' ? p.date.slice(0, 7) : p.date));
  const totalKg = inPeriod.reduce((s, p) => s + p.kgCO2e, 0);
  const activeDays = new Set(inPeriod.map((p) => p.date)).size;
  return { totalKg, activeDays, perActiveDayKg: activeDays ? totalKg / activeDays : 0, top: totalsByCategory(buckets)[0] ?? null };
}
