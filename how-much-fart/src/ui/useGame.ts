import { useMemo } from 'react';
import { toDateKey } from '../engine/format';
import { computeGame } from '../engine/game';
import { usePurchases } from './store';
import { useBudget } from './useBudget';

/** État du jeu (XP, niveau, combo, quêtes, boss, succès), recalculé à partir de l'historique. */
export function useGame() {
  const purchases = usePurchases((s) => s.purchases);
  const noPurchaseDays = usePurchases((s) => s.noPurchaseDays);
  const { budgetKg } = useBudget();
  const today = toDateKey(new Date());
  return useMemo(() => computeGame(purchases, noPurchaseDays, budgetKg, today), [purchases, noPurchaseDays, budgetKg, today]);
}
