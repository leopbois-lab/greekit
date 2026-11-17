import { describe, expect, it } from 'vitest';
import equivalencesJson from '../data/equivalences.v1.json';
import factorsJson from '../data/factors.v1.json';
import { equivalencesFileSchema, factorsFileSchema, type Equivalence, type Factor } from '../data/schema';
import { computePurchase, confidenceFor, parseQuantity } from './compute';
import { computeEquivalences } from './equivalences';
import { formatCount, formatDate, formatKg, formatYears, toDateKey } from './format';
import { filterPurchases, monthlyBudgetKg, monthTotalKg, periodStart, totalKg } from './history';
import { normalize, pendingFactors, searchFactors } from './search';
import type { Purchase } from './types';

const src = { name: 'Source de test', url: 'https://example.org/' };
const factor = (over: Partial<Factor> = {}): Factor => ({
  id: 'f1', label: 'Bœuf', category: 'alimentation', family: 'viandes', kind: 'article',
  value: 28, unit: 'kg', source: src, dataYear: 2025, retrievedAt: '2026-11-16', status: 'ok', ...over,
});

describe('fichiers de données', () => {
  const factors = factorsFileSchema.parse(factorsJson);
  const equivalences = equivalencesFileSchema.parse(equivalencesJson);

  it('respectent le schéma et ont des identifiants uniques', () => {
    expect(new Set(factors.factors.map((f) => f.id)).size).toBe(factors.factors.length);
    expect(new Set(equivalences.equivalences.map((e) => e.id)).size).toBe(equivalences.equivalences.length);
  });
  it('toute entrée « ok » a une valeur et une source ; toute entrée « à compléter » n’a pas de valeur', () => {
    for (const e of [...factors.factors, ...equivalences.equivalences]) {
      if (e.status === 'ok') {
        expect(e.value, e.id).not.toBeNull();
        expect(e.source?.url, e.id).toMatch(/^https:\/\//);
      } else {
        expect(e.value, e.id).toBeNull();
        expect(e.note, e.id).toBeTruthy();
      }
    }
  });
  it('couvrent toutes les catégories avec au moins un article utilisable', () => {
    for (const c of ['alimentation', 'boissons', 'vetements', 'electronique', 'electromenager', 'mobilier', 'transport', 'energie', 'numerique', 'loisirs'] as const) {
      expect(searchFactors(factors.factors, c, '').length, c).toBeGreaterThan(0);
    }
  });
  it('gardent un budget annuel daté et sourcé', () => {
    expect(equivalences.budget.annualKgPerPerson).toBeGreaterThan(0);
    expect(equivalences.budget.dataYear).toBeGreaterThanOrEqual(2025);
  });
});

describe('parseQuantity', () => {
  it('accepte la virgule, le point et les espaces', () => {
    expect(parseQuantity('1,5')).toBe(1.5);
    expect(parseQuantity('0.25')).toBe(0.25);
    expect(parseQuantity('1 250')).toBe(1250);
    expect(parseQuantity(',5')).toBe(0.5);
  });
  it('rejette le reste', () => {
    for (const bad of ['', 'abc', '-3', '1,2,3', '1e3', ' ']) expect(parseQuantity(bad), bad).toBeNull();
  });
});

describe('computePurchase', () => {
  it('multiplie le facteur par la quantité', () => {
    const r = computePurchase(factor(), 0.5, '2026-11-16');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purchase.kgCO2e).toBe(14);
    expect(r.purchase.confidence).toBe('estime');
    expect(r.purchase.source).toEqual(src);
    expect(r.purchase.mode).toBe('manuel');
  });
  it('marque un ratio monétaire comme très approximatif', () => {
    const r = computePurchase(factor({ kind: 'monetaire', value: 0.271, unit: '€' }), 100, '2026-11-16');
    expect(r.ok && r.purchase.kgCO2e).toBeCloseTo(27.1);
    expect(r.ok && r.purchase.confidence).toBe('tres-approximatif');
    expect(confidenceFor({ kind: 'article' })).toBe('estime');
  });
  it('refuse un facteur à compléter', () => {
    const r = computePurchase(factor({ status: 'à compléter', value: null, source: null }), 1, '2026-11-16');
    expect(r).toEqual({ ok: false, error: 'facteur-a-completer' });
  });
  it('refuse une quantité nulle, négative ou invalide', () => {
    for (const q of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(computePurchase(factor(), q, '2026-11-16')).toEqual({ ok: false, error: 'quantite-invalide' });
    }
  });
});

describe('computeEquivalences', () => {
  const eq = (over: Partial<Equivalence>): Equivalence => ({
    id: 'e', label: 'km en voiture', value: 0.2, unit: 'kg CO2e par km', source: src, dataYear: null,
    retrievedAt: '2026-11-16', status: 'ok', mode: 'ratio', sprite: 'car', ...over,
  });
  it('divise le total par la valeur de l’équivalence', () => {
    const { results } = computeEquivalences(10, [eq({})]);
    expect(results[0].count).toBe(50);
  });
  it('calcule les pourcentages', () => {
    const { results } = computeEquivalences(500, [eq({ mode: 'pourcentage', value: 2000 })]);
    expect(results[0].count).toBe(25);
  });
  it('met de côté les conversions sans source au lieu d’inventer', () => {
    const { results, pending } = computeEquivalences(10, [
      eq({}),
      eq({ id: 'vache', status: 'à compléter', value: null, source: null, note: 'x' }),
    ]);
    expect(results).toHaveLength(1);
    expect(pending.map((p) => p.id)).toEqual(['vache']);
  });
  it('calcule une durée en années (arbre : 22 kg par an)', () => {
    const { results } = computeEquivalences(11, [eq({ id: 'arbre', mode: 'duree', value: 22 })]);
    expect(results[0].count).toBe(0.5);
  });
  it('renvoie zéro pour un total nul ou invalide', () => {
    expect(computeEquivalences(Number.NaN, [eq({})]).results[0].count).toBe(0);
    expect(computeEquivalences(-5, [eq({})]).results[0].count).toBe(0);
  });
});

describe('format', () => {
  const s = (v: string) => v.replace(/[  ]/g, ' ');
  it('formatCount évite la fausse précision', () => {
    expect(formatCount(0.004)).toBe('< 0,01');
    expect(formatCount(3.14159)).toBe('3,14');
    expect(formatCount(42.26)).toBe('42,3');
    expect(s(formatCount(12345.6))).toBe('12 346');
    expect(formatCount(0)).toBe('0');
  });
  it('formatKg choisit g, kg ou t', () => {
    expect(formatKg(0.064)).toBe('64 g CO2e');
    expect(formatKg(14)).toBe('14 kg CO2e');
    expect(formatKg(2060)).toBe('2,06 t CO2e');
    expect(formatKg(0)).toBe('0 g CO2e');
    expect(formatKg(0.0002)).toBe('< 1 g CO2e');
  });
  it('formatYears exprime une durée en jours, mois ou ans', () => {
    expect(formatYears(0)).toBe('moins d’un jour');
    expect(formatYears(1 / 730)).toBe('moins d’un jour');
    expect(formatYears(1 / 365)).toBe('1 jour');
    expect(formatYears(10 / 365)).toBe('10 jours');
    expect(formatYears(0.5)).toBe('6 mois');
    expect(formatYears(14 / 22)).toBe('8 mois');
    expect(s(formatYears(2.3))).toBe('2,5 ans');
    expect(s(formatYears(93.6))).toBe('94 ans');
  });
  it('gère les dates locales', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDate('2026-11-16')).toBe('16/11/2026');
  });
});

describe('historique', () => {
  const p = (id: number, date: string, kg: number, category: Purchase['category'] = 'alimentation'): Purchase => ({
    id, date, kgCO2e: kg, category, factorId: 'f', label: 'x', quantity: 1, unit: 'kg',
    confidence: 'estime', source: src, dataYear: null, mode: 'manuel',
  });
  const now = new Date(2026, 10, 16);
  const all = [p(1, '2026-11-01', 10), p(2, '2026-11-16', 5, 'transport'), p(3, '2026-10-31', 100), p(4, '2026-10-17', 1), p(5, '2026-11-16', 2)];

  it('calcule le début de période', () => {
    expect(periodStart('mois', now)).toBe('2026-11-01');
    expect(periodStart('30-jours', now)).toBe('2026-10-18');
    expect(periodStart('tout', now)).toBeNull();
  });
  it('filtre par période et trie du plus récent au plus ancien', () => {
    expect(filterPurchases(all, { category: 'toutes', period: 'mois' }, now).map((x) => x.id)).toEqual([5, 2, 1]);
    expect(filterPurchases(all, { category: 'toutes', period: '30-jours' }, now).map((x) => x.id)).toEqual([5, 2, 1, 3]);
    expect(filterPurchases(all, { category: 'toutes', period: 'tout' }, now)).toHaveLength(5);
  });
  it('filtre par catégorie', () => {
    expect(filterPurchases(all, { category: 'transport', period: 'tout' }, now).map((x) => x.id)).toEqual([2]);
  });
  it('additionne les totaux', () => {
    expect(totalKg(all)).toBe(118);
    expect(monthTotalKg(all, now)).toBe(17);
    expect(monthTotalKg([], now)).toBe(0);
  });
  it('déduit le budget mensuel du budget annuel', () => {
    expect(monthlyBudgetKg(8300)).toBeCloseTo(691.67, 2);
  });
});

describe('recherche', () => {
  const list = [
    factor({ id: 'a', label: 'Bœuf' }),
    factor({ id: 'b', label: 'Pâtes (sèches)' }),
    factor({ id: 'c', label: 'Jeans', category: 'vetements' }),
    factor({ id: 'd', label: 'Livre', status: 'à compléter', value: null, source: null }),
    factor({ id: 'e', label: 'Alimentation (prix)', kind: 'monetaire' }),
  ];
  it('ignore accents, ligatures et casse', () => {
    expect(normalize('  Bœuf Séché ')).toBe('boeuf seche');
    expect(searchFactors(list, 'alimentation', 'BOEUF').map((f) => f.id)).toEqual(['a']);
    expect(searchFactors(list, 'alimentation', 'pates').map((f) => f.id)).toEqual(['b']);
  });
  it('ne propose que les articles sourcés de la catégorie', () => {
    expect(searchFactors(list, 'alimentation', '').map((f) => f.id)).toEqual(['a', 'b']);
    expect(searchFactors(list, 'alimentation', '', 'monetaire').map((f) => f.id)).toEqual(['e']);
    expect(pendingFactors(list, 'alimentation').map((f) => f.id)).toEqual(['d']);
  });
});
