import { BUDGET } from '../data';
import { monthlyBudgetKg, monthTotalKg } from '../engine/history';
import { healthFromBudget } from '../engine/planet';
import { usePlanet, usePurchases, useSettings } from './store';

/** Budget du mois, total émis et vie de la planète (aperçu de la galerie prioritaire). */
export function useBudget() {
  const purchases = usePurchases((s) => s.purchases);
  const custom = useSettings((s) => s.customMonthlyBudgetKg);
  const preview = usePlanet((s) => s.preview);
  const defaultBudgetKg = monthlyBudgetKg(BUDGET.annualKgPerPerson);
  const budgetKg = custom ?? defaultBudgetKg;
  const emittedKg = monthTotalKg(purchases, new Date());
  const realHealth = healthFromBudget(emittedKg, budgetKg);
  return { budgetKg, defaultBudgetKg, emittedKg, health: preview ?? realHealth, isCustom: custom !== null };
}
