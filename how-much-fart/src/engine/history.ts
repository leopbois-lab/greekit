import type { CategoryId } from '../data/schema';
import { toDateKey } from './format';
import type { Purchase } from './types';

export type Period = 'mois' | '30-jours' | 'tout';

export interface HistoryFilter {
  category: CategoryId | 'toutes';
  period: Period;
}

/** Premier jour inclus de la période, en AAAA-MM-JJ ; `null` = pas de borne. */
export function periodStart(period: Period, now: Date): string | null {
  if (period === 'tout') return null;
  if (period === 'mois') return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
}

/** Filtre puis trie du plus récent au plus ancien. */
export function filterPurchases(
  purchases: readonly Purchase[],
  filter: HistoryFilter,
  now: Date,
): Purchase[] {
  const start = periodStart(filter.period, now);
  const end = toDateKey(now);
  return purchases
    .filter((p) => filter.category === 'toutes' || p.category === filter.category)
    .filter((p) => (start === null ? true : p.date >= start && p.date <= end))
    .sort((a, b) => (a.date === b.date ? (b.id ?? 0) - (a.id ?? 0) : a.date < b.date ? 1 : -1));
}

export function totalKg(purchases: readonly Purchase[]): number {
  return purchases.reduce((sum, p) => sum + p.kgCO2e, 0);
}

/** Total émis pendant le mois civil de `now`. */
export function monthTotalKg(purchases: readonly Purchase[], now: Date): number {
  const prefix = toDateKey(now).slice(0, 7);
  return totalKg(purchases.filter((p) => p.date.startsWith(prefix)));
}

/** Budget mensuel = moyenne annuelle ÷ 12. */
export function monthlyBudgetKg(annualKg: number): number {
  return annualKg / 12;
}
