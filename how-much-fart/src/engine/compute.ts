import type { Factor } from '../data/schema';
import type { Confidence, Purchase, PurchaseMode } from './types';

/** Lit un nombre saisi à la française (« 1,5 », « 1 250 ») ; `null` si invalide. */
export function parseQuantity(input: string): number | null {
  const cleaned = input.replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Un ratio monétaire reste « très approximatif » ; un facteur d'article × quantité est « estimé ». */
export function confidenceFor(factor: Pick<Factor, 'kind'>): Confidence {
  return factor.kind === 'monetaire' ? 'tres-approximatif' : 'estime';
}

export type ComputeResult =
  | { ok: true; purchase: Purchase }
  | { ok: false; error: 'facteur-a-completer' | 'quantite-invalide' };

/**
 * Empreinte d'un achat = facteur (kg CO2e par unité) × quantité.
 * Refuse tout facteur sans valeur sourcée : on n'invente jamais un chiffre.
 */
export function computePurchase(
  factor: Factor,
  quantity: number,
  date: string,
  mode: PurchaseMode = 'manuel',
): ComputeResult {
  if (factor.status !== 'ok' || factor.value === null || factor.source === null) {
    return { ok: false, error: 'facteur-a-completer' };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: 'quantite-invalide' };
  }
  return {
    ok: true,
    purchase: {
      date,
      factorId: factor.id,
      label: factor.label,
      category: factor.category,
      quantity,
      unit: factor.unit,
      kgCO2e: factor.value * quantity,
      confidence: confidenceFor(factor),
      source: factor.source,
      dataYear: factor.dataYear,
      mode,
      ...(factor.note ? { note: factor.note } : {}),
    },
  };
}
