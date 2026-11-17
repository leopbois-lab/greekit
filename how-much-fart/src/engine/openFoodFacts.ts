import { z } from 'zod';
import type { ComputeResult } from './compute';

/**
 * Lecture d'une fiche Open Food Facts (API v3.1, vérifiée le 16/11/2026 sur de vrais produits).
 * Depuis décembre 2024 le bloc s'appelle `environmental_score_data` ; on garde un repli sur
 * l'ancien nom `ecoscore_data`. Le sous-bloc `agribalyse.co2_total` est en kg CO2e par kg de produit.
 * TS pur : aucune dépendance à React ou au DOM.
 */

export const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'brands',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'categories_tags',
  'environmental_score_data',
  'ecoscore_data',
].join(',');

export function offProductUrl(barcode: string): string {
  return `https://world.openfoodfacts.org/api/v3.1/product/${barcode}?fields=${OFF_FIELDS}`;
}

const numberish = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : v),
  z.number().finite(),
);

const scoreBlock = z
  .object({
    agribalyse: z
      .object({
        co2_total: numberish.optional().catch(undefined),
        name_fr: z.string().optional().catch(undefined),
        version: z.string().optional().catch(undefined),
        is_beverage: z.union([z.number(), z.boolean(), z.string()]).optional().catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .optional()
  .catch(undefined);

const offResponseSchema = z.object({
  status: z.string().optional(),
  result: z.object({ id: z.string().optional() }).optional().catch(undefined),
  product: z
    .object({
      product_name: z.string().optional().catch(undefined),
      product_name_fr: z.string().optional().catch(undefined),
      brands: z.string().optional().catch(undefined),
      quantity: z.string().optional().catch(undefined),
      product_quantity: numberish.optional().catch(undefined),
      product_quantity_unit: z.string().optional().catch(undefined),
      categories_tags: z.array(z.string()).optional().catch(undefined),
      environmental_score_data: scoreBlock,
      ecoscore_data: scoreBlock,
    })
    .optional(),
});

export const packWeightSchema = z.object({
  kg: z.number().positive(),
  /** `volume` : quantité en ml ou L, convertie à 1 kg par litre. */
  basis: z.enum(['poids', 'volume']),
});
export type PackWeight = z.infer<typeof packWeightSchema>;

export const scannedProductSchema = z.object({
  barcode: z.string(),
  name: z.string().nullable(),
  brand: z.string().nullable(),
  /** kg CO2e par kg de produit (Agribalyse via Open Food Facts) ; `null` si absent. */
  co2PerKg: z.number().nonnegative().nullable(),
  agribalyseName: z.string().nullable(),
  agribalyseVersion: z.string().nullable(),
  quantityText: z.string().nullable(),
  packWeight: packWeightSchema.nullable(),
  isBeverage: z.boolean(),
});
export type ScannedProduct = z.infer<typeof scannedProductSchema>;

export type OffLookup = { status: 'found'; product: ScannedProduct } | { status: 'not-found' };

const UNIT_TO_KG: Record<string, { factor: number; basis: PackWeight['basis'] }> = {
  kg: { factor: 1, basis: 'poids' },
  g: { factor: 0.001, basis: 'poids' },
  l: { factor: 1, basis: 'volume' },
  cl: { factor: 0.01, basis: 'volume' },
  ml: { factor: 0.001, basis: 'volume' },
};

/** Lit « 400 g », « 1,5 L », « 6 x 33 cl »… ; `null` si rien d'exploitable. */
export function parseQuantityText(text: string | null | undefined): PackWeight | null {
  if (!text) return null;
  const m = text
    .toLowerCase()
    .match(/(?:(\d+)\s*[x×*]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|cl|ml|l)(?![a-z])/);
  if (!m) return null;
  const unit = UNIT_TO_KG[m[3]];
  const kg = Number(m[1] ?? 1) * Number(m[2].replace(',', '.')) * unit.factor;
  return kg > 0 && Number.isFinite(kg) ? { kg, basis: unit.basis } : null;
}

/** Poids du paquet : champs normalisés d'Open Food Facts d'abord, texte libre ensuite. */
export function parsePackWeight(
  productQuantity: number | undefined,
  unit: string | undefined,
  quantityText: string | undefined,
): PackWeight | null {
  const known = unit ? UNIT_TO_KG[unit.toLowerCase()] : undefined;
  if (productQuantity !== undefined && productQuantity > 0 && known) {
    return { kg: productQuantity * known.factor, basis: known.basis };
  }
  return parseQuantityText(quantityText);
}

const clean = (s: string | undefined) => (s && s.trim() ? s.trim() : null);

export function parseOffResponse(barcode: string, json: unknown): OffLookup {
  const parsed = offResponseSchema.safeParse(json);
  if (!parsed.success || !parsed.data.product) return { status: 'not-found' };
  const p = parsed.data.product;
  // Nouveau nom d'abord, ancien nom en repli.
  const agribalyse = p.environmental_score_data?.agribalyse ?? p.ecoscore_data?.agribalyse;
  const co2 = agribalyse?.co2_total;
  return {
    status: 'found',
    product: {
      barcode,
      name: clean(p.product_name_fr) ?? clean(p.product_name),
      brand: clean(p.brands?.split(',')[0]),
      co2PerKg: co2 !== undefined && co2 >= 0 ? co2 : null,
      agribalyseName: clean(agribalyse?.name_fr),
      agribalyseVersion: clean(agribalyse?.version),
      // On retire le signe « ℮ » (quantité estimée) parfois collé à la quantité.
      quantityText: clean(p.quantity?.replace(/\s*[℮e]\s*$/, '')),
      packWeight: parsePackWeight(p.product_quantity, p.product_quantity_unit, p.quantity),
      // Sans bloc Agribalyse, la catégorie « boissons » de la fiche fait foi.
      isBeverage:
        [1, true, '1'].includes(agribalyse?.is_beverage as never) ||
        (p.categories_tags?.includes('en:beverages') ?? false),
    },
  };
}

export function productLabel(product: ScannedProduct): string {
  const name = product.name ?? `Produit ${product.barcode}`;
  if (!product.brand) return name;
  // Pas de doublon du type « Coca-Cola (COCA-COLA SERVICES) ».
  const [n, b] = [name.toLowerCase(), product.brand.toLowerCase()];
  return n.includes(b) || b.includes(n) ? name : `${name} (${product.brand})`;
}

/** D'où vient le poids utilisé : fiche produit en poids, fiche produit en volume, ou saisi à la main. */
export type WeightBasis = PackWeight['basis'] | 'saisi';

/**
 * Empreinte d'un produit scanné = `co2_total` (kg CO2e/kg) × poids.
 * « Précis » si le poids est connu ; « estimé » si on part d'un volume converti à 1 kg par litre.
 */
export function computeScannedPurchase(
  product: ScannedProduct,
  weightKg: number,
  basis: WeightBasis,
  date: string,
): ComputeResult {
  if (product.co2PerKg === null) return { ok: false, error: 'facteur-a-completer' };
  if (!Number.isFinite(weightKg) || weightKg <= 0) return { ok: false, error: 'quantite-invalide' };
  const notes: string[] = [];
  if (product.agribalyseName) {
    notes.push(`Référence Agribalyse : « ${product.agribalyseName} » (moyenne pour ce type de produit).`);
  }
  if (basis === 'volume') notes.push('Volume converti en poids à raison de 1 kg par litre.');
  return {
    ok: true,
    purchase: {
      date,
      factorId: `off-${product.barcode}`,
      label: productLabel(product),
      category: product.isBeverage ? 'boissons' : 'alimentation',
      quantity: weightKg,
      unit: 'kg',
      kgCO2e: product.co2PerKg * weightKg,
      confidence: basis === 'volume' ? 'estime' : 'precis',
      source: {
        name: `Open Food Facts — Agribalyse${product.agribalyseVersion ? ` ${product.agribalyseVersion}` : ''}`,
        url: `https://world.openfoodfacts.org/product/${product.barcode}`,
      },
      dataYear: null,
      mode: 'code-barres',
      ...(notes.length ? { note: notes.join(' ') } : {}),
    },
  };
}
