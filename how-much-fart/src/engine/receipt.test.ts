import { describe, expect, it } from 'vitest';
import factorsJson from '../data/factors.v1.json';
import { factorsFileSchema } from '../data/schema';
import {
  computeReceiptPurchase,
  defaultRatio,
  guessCategory,
  parseReceiptText,
  suggestFactor,
} from './receipt';

const FACTORS = factorsFileSchema.parse(factorsJson).factors;

const TICKET = `
CARREFOUR MARKET
12 RUE DE LA GARE
Tel : 01 23 45 67 89
--------------------------------
BOEUF HACHE 5% 350G          4,95 B
PATES PANZANI 500G           1,25 B
2 x 0,89
YAOURT NATURE X4             1.78 B
BANANES VRAC
  0,845 kg x 1,99 €/kg       1,68 B
COCA-COLA 1,5L               1 ,95 A
EAU CRISTALINE 6X1,5L        1,20 A
REMISE FIDELITE             -0,50
SOUS-TOTAL                  12,31
TOTAL A PAYER               12,31 €
CB                          12,31
TVA 5,5%  B   0,48
TVA 20%   A   0,53
MERCI DE VOTRE VISITE
16/11/2026 18:42
`;

describe('parseReceiptText', () => {
  const parsed = parseReceiptText(TICKET);

  it('extrait les articles avec leur prix', () => {
    expect(parsed.lines).toEqual([
      { label: 'BOEUF HACHE 5% 350G', price: 4.95 },
      { label: 'PATES PANZANI 500G', price: 1.25 },
      { label: 'YAOURT NATURE X4', price: 1.78 },
      { label: 'BANANES VRAC', price: 1.68 },
      { label: 'COCA-COLA 1,5L', price: 1.95 },
      { label: 'EAU CRISTALINE 6X1,5L', price: 1.2 },
    ]);
  });
  it('reconnaît le total sans le prendre pour un article', () => {
    expect(parsed.total).toBe(12.31);
  });
  it('ignore remises, paiement, TVA, en-tête et lignes de quantité seules', () => {
    const labels = parsed.lines.map((l) => l.label).join(' | ');
    for (const word of ['REMISE', 'TVA', 'CB', 'TOTAL', 'MERCI', 'RUE', 'Tel']) expect(labels).not.toContain(word);
    expect(parsed.lines.some((l) => l.price === 0.89)).toBe(false);
  });
  it('rattache un prix à la ligne du dessus quand le libellé est seul', () => {
    expect(parseReceiptText('TOMATES GRAPPE\n0,512 kg x 2,99 €/kg   1,53').lines).toEqual([
      { label: 'TOMATES GRAPPE', price: 1.53 },
    ]);
  });
  it('ne confond pas poids, pourcentages, dates et heures avec des prix', () => {
    expect(parseReceiptText('LAIT 1,5L\nFROMAGE 45%\n16/11/2026 18:42\n0,845 kg').lines).toEqual([]);
  });
  it('retire les codes article et la décoration', () => {
    expect(parseReceiptText('3017620422003 NUTELLA 400G *  3,49 €').lines).toEqual([
      { label: 'NUTELLA 400G', price: 3.49 },
    ]);
  });
  it('renvoie une liste vide pour un texte illisible', () => {
    expect(parseReceiptText('')).toEqual({ lines: [], total: null });
    expect(parseReceiptText('~~ %% ## \n ..')).toEqual({ lines: [], total: null });
  });
});

describe('guessCategory', () => {
  it('reconnaît quelques familles par mots-clés', () => {
    expect(guessCategory('COCA-COLA 1,5L')).toBe('boissons');
    expect(guessCategory('EAU CRISTALINE 6X1,5L')).toBe('boissons');
    expect(guessCategory('BIERES BLONDES X6')).toBe('boissons');
    expect(guessCategory('JEAN SLIM H')).toBe('vetements');
    expect(guessCategory('GAZOLE 35,2 L')).toBe('energie');
    expect(guessCategory('CABLE USB-C')).toBe('electronique');
  });
  it('retombe sur l’alimentation par défaut', () => {
    expect(guessCategory('BOEUF HACHE 5%')).toBe('alimentation');
    expect(guessCategory('THEIERE')).toBe('alimentation'); // pas de faux positif sur « the »
  });
});

describe('suggestFactor', () => {
  const label = (text: string, category = guessCategory(text)) => suggestFactor(text, category, FACTORS)?.label ?? null;
  it('propose l’article sourcé le plus proche', () => {
    expect(label('BOEUF HACHE 5% 350G')).toBe('Boeuf');
    expect(label('PATES PANZANI 500G')).toBe('Pâtes (sèches)');
    expect(label('POULET FERMIER')).toBe('Poulet');
    expect(label('TOMATES GRAPPE')).toBe('Tomate');
    expect(label('BANANES VRAC')).toBe('Banane');
    expect(label('YAOURT NATURE X4')).toBe('Yaourt nature ou yaourt à la grecque');
  });
  it('ne propose rien quand rien ne ressemble', () => {
    expect(label('SAC CABAS')).toBeNull();
    expect(label('XYZ 123')).toBeNull();
  });
  it('reste dans la catégorie demandée', () => {
    expect(suggestFactor('POULET FERMIER', 'vetements', FACTORS)).toBeNull();
  });
});

describe('computeReceiptPurchase', () => {
  const draft = { label: 'BOEUF HACHE 5% 350G', price: 4.95, category: 'alimentation' as const, articleId: null, quantity: null };
  const ratio = defaultRatio('alimentation', FACTORS)!;
  const boeuf = FACTORS.find((f) => f.label === 'Boeuf')!;

  it('sans poids : ratio monétaire × prix, « très approximatif »', () => {
    const r = computeReceiptPurchase(draft, FACTORS, '2026-11-16');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purchase.kgCO2e).toBeCloseTo(4.95 * ratio.value!);
    expect(r.purchase).toMatchObject({ confidence: 'tres-approximatif', mode: 'ticket', label: 'BOEUF HACHE 5% 350G', unit: '€' });
  });
  it('un article suggéré sans quantité ne change rien : la ligne reste « très approximatif »', () => {
    const r = computeReceiptPurchase({ ...draft, articleId: boeuf.id }, FACTORS, '2026-11-16');
    expect(r.ok && r.purchase.confidence).toBe('tres-approximatif');
  });
  it('avec article et poids : facteur d’article, « estimé »', () => {
    const r = computeReceiptPurchase({ ...draft, articleId: boeuf.id, quantity: 0.35 }, FACTORS, '2026-11-16');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purchase.kgCO2e).toBeCloseTo(0.35 * boeuf.value!);
    expect(r.purchase).toMatchObject({ confidence: 'estime', label: 'BOEUF HACHE 5% 350G', unit: 'kg', quantity: 0.35 });
    expect(r.purchase.note).toContain('« Boeuf »');
  });
  it('refuse une ligne sans prix, ou une catégorie sans ratio monétaire sourcé', () => {
    expect(computeReceiptPurchase({ ...draft, price: null }, FACTORS, '2026-11-16')).toEqual({ ok: false, error: 'quantite-invalide' });
    expect(defaultRatio('electromenager', FACTORS)).toBeNull();
    expect(computeReceiptPurchase({ ...draft, category: 'electromenager' }, FACTORS, '2026-11-16')).toEqual({ ok: false, error: 'facteur-a-completer' });
  });
  it('donne un libellé par défaut à une ligne sans nom', () => {
    const r = computeReceiptPurchase({ ...draft, label: '  ' }, FACTORS, '2026-11-16');
    expect(r.ok && r.purchase.label).toBe('Article du ticket');
  });
});
