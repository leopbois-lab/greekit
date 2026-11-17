import { describe, expect, it } from 'vitest';
import factorsJson from '../data/factors.v1.json';
import { factorsFileSchema } from '../data/schema';
import { findAlternatives } from './alternatives';
import {
  addDays,
  bossForMonth,
  BOSS_MIN_LOGGED_DAYS,
  buildDays,
  computeGame,
  dailyBudgetKg,
  daysInMonth,
  isBeefPurchase,
  isSoberDay,
  levelFromXp,
  questsForWeek,
  streaks,
  weekStart,
  XP,
  xpForLevel,
} from './game';
import { bucketKeys, buildBuckets, niceTicks, stackCategories, summarize, totalsByCategory, CATEGORY_CHART_ORDER } from './stats';
import type { Purchase } from './types';

const FACTORS = factorsFileSchema.parse(factorsJson).factors;
const BUDGET = 600; // 20 kg par jour sur un mois de 30 jours
let nextId = 1;
const p = (date: string, kg: number, over: Partial<Purchase> = {}): Purchase => ({
  id: nextId++, date, kgCO2e: kg, category: 'alimentation', factorId: 'ico2-pates', label: 'Pâtes', quantity: 1, unit: 'kg',
  confidence: 'estime', source: { name: 's', url: 'https://example.org/' }, dataYear: null, mode: 'manuel', ...over,
});

describe('dates', () => {
  it('manipule les jours, les mois et les semaines', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysInMonth('2026-11')).toBe(30);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(weekStart('2026-11-16')).toBe('2026-11-16'); // un lundi
    expect(weekStart('2026-11-22')).toBe('2026-11-16'); // dimanche
  });
});

describe('journées', () => {
  it('regroupe les achats par jour', () => {
    const days = buildDays([p('2026-11-02', 5), p('2026-11-02', 7, { mode: 'code-barres' }), p('2026-11-03', 1)], []);
    expect(days.get('2026-11-02')).toMatchObject({ kg: 12, purchases: 2, scans: 1, noPurchase: false });
    expect(days.size).toBe(2);
  });
  it('un jour ne compte que s’il est saisi : achat ou « rien acheté » validé', () => {
    const days = buildDays([p('2026-11-02', 5)], ['2026-11-03']);
    expect(days.has('2026-11-03')).toBe(true);
    expect(days.get('2026-11-03')).toMatchObject({ noPurchase: true, kg: 0 });
    expect(days.has('2026-11-04')).toBe(false);
  });
  it('ignore un « rien acheté » posé sur un jour qui a des achats', () => {
    const days = buildDays([p('2026-11-02', 5)], ['2026-11-02']);
    expect(days.get('2026-11-02')?.noPurchase).toBe(false);
  });
  it('repère le bœuf par le facteur ou par le libellé', () => {
    expect(isBeefPurchase({ factorId: 'ico2-boeuf', label: 'x' })).toBe(true);
    expect(isBeefPurchase({ factorId: 'off-123', label: 'Steak haché 5%' })).toBe(true);
    expect(isBeefPurchase({ factorId: 'ico2-poulet', label: 'Poulet' })).toBe(false);
    expect(buildDays([p('2026-11-02', 5, { label: 'BOEUF HACHE' })], []).get('2026-11-02')?.beef).toBe(true);
  });
  it('définit le jour sobre par le budget du jour', () => {
    expect(dailyBudgetKg(BUDGET, '2026-11-10')).toBe(20);
    const days = buildDays([p('2026-11-02', 20), p('2026-11-03', 20.1)], []);
    expect(isSoberDay(days.get('2026-11-02')!, BUDGET)).toBe(true);
    expect(isSoberDay(days.get('2026-11-03')!, BUDGET)).toBe(false);
  });
});

describe('combos', () => {
  it('compte les jours sobres consécutifs jusqu’à aujourd’hui', () => {
    const days = buildDays([p('2026-11-08', 1), p('2026-11-09', 1), p('2026-11-10', 1)], []);
    expect(streaks(days, BUDGET, '2026-11-10')).toEqual({ current: 3, best: 3 });
  });
  it('tient encore si aujourd’hui n’est pas saisi, mais pas au-delà', () => {
    const days = buildDays([p('2026-11-08', 1), p('2026-11-09', 1)], []);
    expect(streaks(days, BUDGET, '2026-11-10').current).toBe(2);
    expect(streaks(days, BUDGET, '2026-11-11').current).toBe(0);
  });
  it('est cassé par un jour non saisi ou un jour trop chargé', () => {
    const gap = buildDays([p('2026-11-07', 1), p('2026-11-09', 1), p('2026-11-10', 1)], []);
    expect(streaks(gap, BUDGET, '2026-11-10')).toEqual({ current: 2, best: 2 });
    const heavy = buildDays([p('2026-11-08', 1), p('2026-11-09', 99), p('2026-11-10', 1)], []);
    expect(streaks(heavy, BUDGET, '2026-11-10')).toEqual({ current: 1, best: 1 });
  });
  it('un « rien acheté » validé prolonge le combo', () => {
    const days = buildDays([p('2026-11-08', 1), p('2026-11-10', 1)], ['2026-11-09']);
    expect(streaks(days, BUDGET, '2026-11-10').current).toBe(3);
  });
  it('garde le meilleur combo passé', () => {
    const days = buildDays([p('2026-10-01', 1), p('2026-10-02', 1), p('2026-10-03', 1), p('2026-10-04', 1), p('2026-11-10', 1)], []);
    expect(streaks(days, BUDGET, '2026-11-10')).toEqual({ current: 1, best: 4 });
  });
  it('vaut zéro sans historique', () => {
    expect(streaks(new Map(), BUDGET, '2026-11-10')).toEqual({ current: 0, best: 0 });
  });
});

describe('niveaux', () => {
  it('suit les seuils 0, 100, 300, 600', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 300, 600]);
    expect(levelFromXp(0)).toEqual({ level: 1, intoLevel: 0, neededForNext: 100 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toEqual({ level: 2, intoLevel: 0, neededForNext: 200 });
    expect(levelFromXp(450)).toEqual({ level: 3, intoLevel: 150, neededForNext: 300 });
  });
});

describe('quêtes hebdomadaires', () => {
  const week = '2026-11-16';
  it('propose trois quêtes, dont « 3 jours sans bœuf »', () => {
    const quests = questsForWeek(new Map(), week, BUDGET);
    expect(quests).toHaveLength(3);
    expect(quests[0]).toMatchObject({ id: 'sans-boeuf', progress: 0, target: 3, done: false });
    expect(new Set(quests.map((q) => q.id)).size).toBe(3);
  });
  it('ne compte que les jours saisis sans bœuf', () => {
    const days = buildDays([p('2026-11-16', 1), p('2026-11-17', 1, { factorId: 'ico2-boeuf' }), p('2026-11-18', 1)], ['2026-11-19']);
    const q = questsForWeek(days, week, BUDGET)[0];
    expect(q).toMatchObject({ progress: 3, done: true });
  });
  it('ignore les jours des autres semaines et plafonne la progression', () => {
    const days = buildDays(['2026-11-09', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'].map((d) => p(d, 1)), []);
    expect(questsForWeek(days, week, BUDGET)[0].progress).toBe(3);
    expect(questsForWeek(days, '2026-11-09', BUDGET)[0].progress).toBe(1);
  });
  it('fait tourner les deux autres quêtes d’une semaine à l’autre', () => {
    const a = questsForWeek(new Map(), '2026-11-16', BUDGET).map((q) => q.id);
    const b = questsForWeek(new Map(), '2026-11-23', BUDGET).map((q) => q.id);
    expect(a).not.toEqual(b);
  });
});

describe('boss de fin de mois', () => {
  const month = (n: number, kg: number) => Array.from({ length: n }, (_, i) => p(`2026-10-${String(i + 1).padStart(2, '0')}`, kg));
  it('est battu si le mois finit sous le budget avec assez de jours saisis', () => {
    const b = bossForMonth(buildDays(month(BOSS_MIN_LOGGED_DAYS, 10), []), '2026-10', BUDGET, '2026-11-16');
    expect(b).toMatchObject({ status: 'victoire', emittedKg: 80, loggedDays: 8 });
  });
  it('gagne si le budget est dépassé', () => {
    expect(bossForMonth(buildDays(month(10, 100), []), '2026-10', BUDGET, '2026-11-16').status).toBe('defaite');
  });
  it('ne compte pas un mois presque pas saisi', () => {
    expect(bossForMonth(buildDays(month(3, 1), []), '2026-10', BUDGET, '2026-11-16').status).toBe('non-joue');
  });
  it('projette la fin du mois en cours', () => {
    const b = bossForMonth(buildDays([p('2026-11-05', 100)], []), '2026-11', BUDGET, '2026-11-10');
    expect(b).toMatchObject({ status: 'en-cours', daysLeft: 20 });
    expect(b.projectedKg).toBeCloseTo(300);
  });
});

describe('computeGame', () => {
  it('part de zéro', () => {
    const g = computeGame([], [], BUDGET, '2026-11-16');
    expect(g).toMatchObject({ xp: 0, level: 1, questsCompleted: 0, bossesBeaten: 0, loggedDays: 0, today: null });
    expect(g.achievements.every((a) => !a.unlocked)).toBe(true);
  });
  it('additionne l’XP des achats, des jours sobres et des succès', () => {
    const g = computeGame([p('2026-11-16', 1)], [], BUDGET, '2026-11-16');
    // 1 achat + 1 jour sobre + succès « Premier pas »
    expect(g.xp).toBe(XP.purchase + XP.soberDay + XP.achievement);
    expect(g.achievements.find((a) => a.id === 'premier-pas')?.unlocked).toBe(true);
    expect(g.today?.purchases).toBe(1);
  });
  it('récompense une journée sans achat validée', () => {
    const g = computeGame([], ['2026-11-16'], BUDGET, '2026-11-16');
    expect(g.xp).toBe(XP.noPurchaseDay + XP.soberDay);
    expect(g.streak.current).toBe(1);
  });
  it('compte les quêtes réussies des semaines passées et les boss battus', () => {
    const october = Array.from({ length: 10 }, (_, i) => p(`2026-10-${String(i + 5).padStart(2, '0')}`, 1));
    const g = computeGame(october, [], BUDGET, '2026-11-16');
    expect(g.bossesBeaten).toBe(1);
    expect(g.questsCompleted).toBeGreaterThanOrEqual(2);
    expect(g.achievements.find((a) => a.id === 'boss')?.unlocked).toBe(true);
    expect(g.level).toBeGreaterThan(2);
  });
  it('est déterministe : même historique, même état', () => {
    const list = [p('2026-11-10', 3), p('2026-11-12', 30, { factorId: 'ico2-boeuf' })];
    expect(computeGame(list, ['2026-11-11'], BUDGET, '2026-11-16')).toEqual(computeGame(list, ['2026-11-11'], BUDGET, '2026-11-16'));
  });
});

describe('alternatives', () => {
  const boeuf = FACTORS.find((f) => f.id === 'ico2-boeuf')!;
  it('propose un facteur plus bas dans la même famille, pour la même quantité', () => {
    const alts = findAlternatives({ factorId: boeuf.id, quantity: 0.5, kgCO2e: boeuf.value! * 0.5 }, FACTORS);
    expect(alts.length).toBeGreaterThan(0);
    expect(alts[0].factor.family).toBe('viandes');
    expect(alts[0].kgCO2e).toBeCloseTo(alts[0].factor.value! * 0.5);
    expect(alts[0].savedShare).toBeGreaterThan(0.5);
    for (let i = 1; i < alts.length; i++) expect(alts[i].kgCO2e).toBeGreaterThanOrEqual(alts[i - 1].kgCO2e);
    for (const a of alts) expect(a.factor.value!).toBeLessThan(boeuf.value!);
  });
  it('ne propose rien pour le plus sobre de sa famille', () => {
    const lowest = FACTORS.filter((f) => f.family === 'viandes' && f.status === 'ok').sort((a, b) => a.value! - b.value!)[0];
    expect(findAlternatives({ factorId: lowest.id, quantity: 1, kgCO2e: lowest.value! }, FACTORS)).toEqual([]);
  });
  it('ne propose rien là où les articles ne sont pas interchangeables', () => {
    const armoire = FACTORS.find((f) => f.id === 'ico2-armoire')!;
    const smartphone = FACTORS.find((f) => f.id === 'ico2-smartphone')!;
    expect(findAlternatives({ factorId: armoire.id, quantity: 1, kgCO2e: armoire.value! }, FACTORS)).toEqual([]);
    expect(findAlternatives({ factorId: smartphone.id, quantity: 1, kgCO2e: smartphone.value! }, FACTORS)).toEqual([]);
  });
  it('ne propose rien pour un ratio monétaire, un produit scanné ou un facteur inconnu', () => {
    const ratio = FACTORS.find((f) => f.kind === 'monetaire' && f.status === 'ok')!;
    expect(findAlternatives({ factorId: ratio.id, quantity: 10, kgCO2e: 5 }, FACTORS)).toEqual([]);
    expect(findAlternatives({ factorId: 'off-3017620422003', quantity: 0.4, kgCO2e: 3.6 }, FACTORS)).toEqual([]);
  });
  it('compare les longs trajets à des modes longue distance', () => {
    const avion = FACTORS.find((f) => f.id === 'ico2-avion-courtcourrier')!;
    const alts = findAlternatives({ factorId: avion.id, quantity: 700, kgCO2e: avion.value! * 700 }, FACTORS);
    expect(alts[0].factor.id).toBe('ico2-tgv');
    expect(alts.some((a) => /velo|metro|tramway/.test(a.factor.id))).toBe(false);
  });
  it('compare les petits trajets en voiture à des modes du quotidien, jamais à l’avion', () => {
    const voiture = FACTORS.find((f) => f.id === 'ico2-voiturethermique')!;
    const alts = findAlternatives({ factorId: voiture.id, quantity: 8, kgCO2e: voiture.value! * 8 }, FACTORS);
    expect(alts.some((a) => a.factor.id === 'ico2-velo')).toBe(true);
    expect(alts.some((a) => a.factor.id.startsWith('ico2-avion'))).toBe(false);
  });
});

describe('statistiques', () => {
  const now = new Date(2026, 10, 16);
  const list = [
    p('2026-11-01', 10), p('2026-11-16', 5, { category: 'transport' }), p('2026-11-16', 2),
    p('2026-10-20', 40, { category: 'vetements' }), p('2025-12-25', 8, { category: 'loisirs' }), p('2025-11-30', 99),
  ];
  it('découpe la période en intervalles, vides compris', () => {
    expect(bucketKeys('mois', now)).toHaveLength(16);
    expect(bucketKeys('30-jours', now)[0]).toBe('2026-10-18');
    expect(bucketKeys('30-jours', now)).toHaveLength(30);
    const year = bucketKeys('annee', now);
    expect(year).toHaveLength(12);
    expect([year[0], year[11]]).toEqual(['2025-12', '2026-11']);
  });
  it('range les achats par jour ou par mois', () => {
    const month = buildBuckets(list, 'mois', now);
    expect(month[0]).toMatchObject({ key: '2026-11-01', total: 10 });
    expect(month[15]).toMatchObject({ key: '2026-11-16', total: 7, byCategory: { transport: 5, alimentation: 2 } });
    expect(month[5].total).toBe(0);
    const year = buildBuckets(list, 'annee', now);
    expect(year.find((b) => b.key === '2026-10')?.total).toBe(40);
    expect(year.reduce((s, b) => s + b.total, 0)).toBe(65); // l'achat de novembre 2025 est hors période
  });
  it('totalise par catégorie, du plus gros au plus petit', () => {
    const totals = totalsByCategory(buildBuckets(list, 'annee', now));
    expect(totals.map((t) => t.category)).toEqual(['vetements', 'alimentation', 'loisirs', 'transport']);
    expect(totals.reduce((s, t) => s + t.share, 0)).toBeCloseTo(1);
    expect(totalsByCategory([])).toEqual([]);
  });
  it('garde l’ordre fixe des couleurs et regroupe le reste dans « Autres »', () => {
    const totals = totalsByCategory(buildBuckets(list, 'annee', now));
    const { shown, others } = stackCategories(totals, 2);
    expect(shown).toEqual(['vetements', 'alimentation']);
    expect(others).toEqual(['loisirs', 'transport']);
    expect(new Set(CATEGORY_CHART_ORDER).size).toBe(10);
  });
  it('résume la période', () => {
    const buckets = buildBuckets(list, 'mois', now);
    expect(summarize(list, buckets, 'mois')).toMatchObject({ totalKg: 17, activeDays: 2, perActiveDayKg: 8.5, top: { category: 'alimentation' } });
    expect(summarize([], buildBuckets([], 'mois', now), 'mois')).toEqual({ totalKg: 0, activeDays: 0, perActiveDayKg: 0, top: null });
  });
  it('choisit des graduations rondes', () => {
    expect(niceTicks(17)).toEqual([0, 5, 10, 15, 20]);
    expect(niceTicks(0.9)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(430).at(-1)).toBeGreaterThanOrEqual(430);
  });
});
