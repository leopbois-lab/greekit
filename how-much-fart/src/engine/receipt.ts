import type { CategoryId, Factor } from '../data/schema';
import { computePurchase, type ComputeResult } from './compute';
import { normalize } from './search';

/**
 * Lecture d'un ticket de caisse à partir du texte brut de l'OCR.
 * Tout est heuristique : l'écran de vérification laisse l'utilisateur corriger chaque ligne.
 * TS pur : aucune dépendance à React ou au DOM.
 */

export interface ReceiptLine {
  label: string;
  price: number;
}

export interface ParsedReceipt {
  lines: ReceiptLine[];
  /** Total imprimé sur le ticket, s'il a été reconnu : sert de contrôle. */
  total: number | null;
}

/** Prix « 4,95 » ou « 4.95 » (espaces parasites de l'OCR tolérés), hors pourcentages et poids. */
const PRICE = /(\d{1,4})\s?[.,]\s?(\d{2})(?![\d%])/g;

/** Lignes qui ne sont pas des articles : totaux, paiement, TVA, remises… */
const NOT_AN_ITEM =
  /\b(total|sous[- ]?total|tva|cb|carte|especes|rendu|monnaie|paiement|payer|montant|remise|reduction|ht|ttc|articles?|fidelite|cagnotte|avantage|siret|tel|taux|bancaire|visa|mastercard|cheque|merci)\b/;

const TOTAL = /\b(total|net a payer|a payer)\b/;
const SUBTOTAL = /\bsous[- ]?total\b/;

/** Vrai si la ligne ne contient qu'une quantité (« 2 x 0,89 », « 0,845 kg x 1,99 €/kg »). */
function isQuantityOnly(text: string): boolean {
  const rest = normalize(text)
    .replace(/€\s*\/\s*(kg|l)/g, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*(kg|g|cl|ml|l)?\b/g, ' ')
    .replace(/\b(x|kg|eur)\b|[€*=@]/g, ' ');
  return !/[a-z]{3,}/.test(rest);
}

function cleanLabel(text: string): string {
  return text
    .replace(/^\s*\d{6,}\s*/, '') // code article en tête de ligne
    .replace(/[€*|_]+/g, ' ')
    .replace(/[\s.:;,-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines: ReceiptLine[] = [];
  let total: number | null = null;
  let pendingLabel: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    const matches = [...line.matchAll(PRICE)];
    const last = matches[matches.length - 1];
    const flat = normalize(line);

    if (!last) {
      // Pas de prix : peut-être le libellé d'un article dont le prix est sur la ligne suivante.
      pendingLabel = /[a-z]{3,}/.test(flat) && !NOT_AN_ITEM.test(flat) ? cleanLabel(line) : null;
      continue;
    }

    const price = Number(`${last[1]}.${last[2]}`);
    const before = line.slice(0, last.index);
    const negative = /[-−–]\s*$/.test(before);

    if (TOTAL.test(flat) && !SUBTOTAL.test(flat)) {
      total ??= price;
      pendingLabel = null;
      continue;
    }
    if (NOT_AN_ITEM.test(flat) || negative || price <= 0) {
      pendingLabel = null;
      continue;
    }

    const label = isQuantityOnly(before) ? pendingLabel : cleanLabel(before);
    pendingLabel = null;
    if (label) lines.push({ label, price });
  }
  return { lines, total };
}

/* ------------------------------------------------------------------ */
/* Catégorie et article suggérés                                       */
/* ------------------------------------------------------------------ */

const CATEGORY_KEYWORDS: Array<[CategoryId, string[]]> = [
  ['boissons', ['eau', 'jus', 'coca', 'coca-cola', 'cola', 'pepsi', 'oasis', 'soda', 'biere', 'vin', 'lait', 'cafe', 'the', 'sirop', 'limonade', 'cidre', 'champagne', 'boisson', 'orangina', 'perrier', 'evian', 'cristaline']],
  ['energie', ['gazole', 'gasoil', 'sp95', 'sp98', 'carburant', 'essence']],
  ['vetements', ['tshirt', 't-shirt', 'jean', 'jeans', 'pull', 'chaussette', 'chaussure', 'pantalon', 'robe', 'veste', 'manteau', 'chemise', 'polo']],
  ['electronique', ['cable', 'chargeur', 'usb', 'ecouteur', 'casque', 'smartphone', 'telephone', 'tablette']],
  ['electromenager', ['bouilloire', 'cafetiere', 'aspirateur', 'micro-ondes']],
  ['mobilier', ['chaise', 'etagere', 'armoire', 'canape']],
  ['loisirs', ['livre', 'jouet', 'magazine', 'roman']],
];

const tokens = (text: string) => normalize(text).split(/[^a-z0-9-]+/).filter(Boolean);

/** Un mot du ticket correspond à un mot-clé s'il est identique ou en est le pluriel. */
const sameWord = (token: string, keyword: string) => token === keyword || token === `${keyword}s` || token === `${keyword}x`;

/** Catégorie devinée d'après les mots du libellé ; « alimentation » par défaut (tickets de courses). */
export function guessCategory(label: string): CategoryId {
  const words = tokens(label);
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (words.some((w) => keywords.some((k) => sameWord(w, k)))) return category;
  }
  return 'alimentation';
}

/**
 * Article sourcé le plus proche du libellé, dans la catégorie donnée ; `null` si rien de net.
 * Simple suggestion : sans quantité saisie, la ligne reste estimée par le prix.
 */
export function suggestFactor(label: string, category: CategoryId, factors: readonly Factor[]): Factor | null {
  const words = tokens(label).filter((w) => w.length >= 4);
  let best: { factor: Factor; score: number } | null = null;
  for (const factor of factors) {
    if (factor.category !== category || factor.kind !== 'article' || factor.status !== 'ok') continue;
    const factorWords = tokens(factor.label.replace(/\(.*?\)/g, ' ')).filter((w) => w.length >= 4);
    // Plus il y a de mots en commun (et plus ils sont longs), plus l'article est proche.
    let score = 0;
    for (const fw of new Set(factorWords)) {
      if (words.some((w) => sameWord(w, fw) || sameWord(fw, w))) score += fw.length;
    }
    if (score === 0) continue;
    const better =
      !best || score > best.score || (score === best.score && factor.label.length < best.factor.label.length);
    if (better) best = { factor, score };
  }
  return best?.factor ?? null;
}

/** Ratio monétaire utilisé par défaut pour une catégorie (le premier sourcé) ; `null` s'il n'y en a pas. */
export function defaultRatio(category: CategoryId, factors: readonly Factor[]): Factor | null {
  return factors.find((f) => f.category === category && f.kind === 'monetaire' && f.status === 'ok') ?? null;
}

/* ------------------------------------------------------------------ */
/* Calcul d'une ligne vérifiée                                         */
/* ------------------------------------------------------------------ */

export interface ReceiptDraft {
  label: string;
  price: number | null;
  category: CategoryId;
  /** Article choisi pour préciser la ligne (facultatif). */
  articleId: string | null;
  /** Quantité de cet article, dans son unité (facultatif). */
  quantity: number | null;
}

/**
 * Avec un article ET une quantité : facteur d'article (« estimé »).
 * Sinon : ratio monétaire de la catégorie × prix (« très approximatif »).
 */
export function computeReceiptPurchase(
  draft: ReceiptDraft,
  factors: readonly Factor[],
  date: string,
): ComputeResult {
  const label = draft.label.trim() || 'Article du ticket';
  const article = draft.articleId ? factors.find((f) => f.id === draft.articleId && f.kind === 'article') : undefined;

  if (article && draft.quantity !== null && draft.quantity > 0) {
    const r = computePurchase(article, draft.quantity, date, 'ticket');
    if (!r.ok) return r;
    const note = [`Calculé avec l’article « ${article.label} ».`, r.purchase.note].filter(Boolean).join(' ');
    return { ok: true, purchase: { ...r.purchase, label, category: draft.category, note } };
  }

  const ratio = defaultRatio(draft.category, factors);
  if (!ratio) return { ok: false, error: 'facteur-a-completer' };
  if (draft.price === null) return { ok: false, error: 'quantite-invalide' };
  const r = computePurchase(ratio, draft.price, date, 'ticket');
  return r.ok ? { ok: true, purchase: { ...r.purchase, label } } : r;
}
