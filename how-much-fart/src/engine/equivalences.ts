import type { Equivalence } from '../data/schema';

export interface EquivalenceResult {
  equivalence: Equivalence;
  /** Nombre d'unités, pourcentage si `mode === 'pourcentage'`, années si `mode === 'duree'`. */
  count: number;
}

/**
 * Convertit un total en équivalences. Seules les conversions sourcées (« ok ») sont calculées ;
 * les autres sont renvoyées à part pour être affichées comme « en attente de source ».
 */
export function computeEquivalences(
  kgCO2e: number,
  equivalences: readonly Equivalence[],
): { results: EquivalenceResult[]; pending: Equivalence[] } {
  const results: EquivalenceResult[] = [];
  const pending: Equivalence[] = [];
  const kg = Number.isFinite(kgCO2e) && kgCO2e > 0 ? kgCO2e : 0;
  for (const equivalence of equivalences) {
    if (equivalence.status !== 'ok' || equivalence.value === null || equivalence.value <= 0) {
      pending.push(equivalence);
      continue;
    }
    const ratio = kg / equivalence.value;
    results.push({ equivalence, count: equivalence.mode === 'pourcentage' ? ratio * 100 : ratio });
  }
  return { results, pending };
}
