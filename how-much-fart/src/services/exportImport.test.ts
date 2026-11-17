import { describe, expect, it } from 'vitest';
import type { Purchase } from '../engine/types';
import { buildExport, exportFileName, parseExport, planMerge, purchaseKey, shouldRemindBackup } from './exportImport';

const src = { name: 'Source', url: 'https://example.org/' };
const p = (over: Partial<Purchase> = {}): Purchase => ({
  id: 1, date: '2026-11-16', factorId: 'ico2-boeuf', label: 'Boeuf', category: 'alimentation', quantity: 0.5, unit: 'kg',
  kgCO2e: 14, confidence: 'estime', source: src, dataYear: 2025, mode: 'manuel', ...over,
});
const NOW = new Date(2026, 10, 17, 9, 30);
const DAY = 24 * 3600 * 1000;

describe('export', () => {
  it('produit un fichier complet, sans identifiants locaux', () => {
    const file = buildExport([p({ id: 7 }), p({ id: 8, date: '2026-11-15' })], ['2026-11-14', '2026-11-14'], { theme: 'sombre', customMonthlyBudgetKg: 500 }, NOW);
    expect(file).toMatchObject({ app: 'how-much-fart', version: 1, noPurchaseDays: ['2026-11-14'], settings: { theme: 'sombre', customMonthlyBudgetKg: 500 } });
    expect(file.purchases).toHaveLength(2);
    expect('id' in file.purchases[0]).toBe(false);
    expect(exportFileName(NOW)).toBe('how-much-fart-2026-11-17.json');
  });
  it('se relit à l’identique (aller-retour)', () => {
    const file = buildExport([p()], ['2026-11-14'], { muted: true }, NOW);
    const back = parseExport(JSON.stringify(file));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.data).toEqual(file);
  });
});

describe('import', () => {
  const valid = () => buildExport([p()], [], {}, NOW);
  it('refuse un fichier illisible, étranger ou trop récent, avec un message clair', () => {
    expect(parseExport('pas du json')).toEqual({ ok: false, error: expect.stringContaining('JSON') });
    expect(parseExport(JSON.stringify({ app: 'autre', purchases: [] }))).toEqual({ ok: false, error: expect.stringContaining('How much fart') });
    expect(parseExport(JSON.stringify({ ...valid(), version: 2 }))).toEqual({ ok: false, error: expect.stringContaining('plus récente') });
    expect(parseExport('null')).toMatchObject({ ok: false });
  });
  it('refuse un fichier abîmé sans rien importer à moitié', () => {
    const broken = valid() as unknown as { purchases: Array<Record<string, unknown>> };
    broken.purchases[0].kgCO2e = -3;
    expect(parseExport(JSON.stringify(broken))).toMatchObject({ ok: false, error: expect.stringContaining('abîmé') });
    const badDay = { ...valid(), noPurchaseDays: ['16/11/2026'] };
    expect(parseExport(JSON.stringify(badDay))).toMatchObject({ ok: false });
    const badCategory = valid() as unknown as { purchases: Array<Record<string, unknown>> };
    badCategory.purchases[0].category = 'inconnue';
    expect(parseExport(JSON.stringify(badCategory))).toMatchObject({ ok: false });
  });
  it('tolère un fichier sans journées ni réglages', () => {
    const { noPurchaseDays: _d, settings: _s, ...minimal } = valid();
    const r = parseExport(JSON.stringify(minimal));
    expect(r.ok && r.data.noPurchaseDays).toEqual([]);
    expect(r.ok && r.data.settings).toEqual({});
  });
});

describe('fusion', () => {
  it('ajoute les nouveautés et écarte les doublons', () => {
    const existing = [p({ id: 1 })];
    const incoming = buildExport([p(), p({ date: '2026-11-10', kgCO2e: 2.3, label: 'Poulet', factorId: 'ico2-poulet' })], ['2026-11-12', '2026-11-13'], {}, NOW);
    const plan = planMerge(existing, ['2026-11-12'], incoming);
    expect(plan.duplicates).toBe(1);
    expect(plan.purchasesToAdd.map((x) => x.label)).toEqual(['Poulet']);
    expect(plan.daysToAdd).toEqual(['2026-11-13']);
  });
  it('n’ajoute rien en réimportant le même fichier', () => {
    const list = [p({ id: 1 }), p({ id: 2, date: '2026-11-11' })];
    const file = buildExport(list, ['2026-11-12'], {}, NOW);
    expect(planMerge(list, ['2026-11-12'], file)).toEqual({ purchasesToAdd: [], daysToAdd: [], duplicates: 2 });
  });
  it('garde deux achats identiques présents dans le même fichier une seule fois', () => {
    const file = buildExport([p({ id: 1 }), p({ id: 2 })], [], {}, NOW);
    expect(planMerge([], [], file).purchasesToAdd).toHaveLength(1);
  });
  it('distingue deux achats qui ne diffèrent que par la quantité', () => {
    expect(purchaseKey(p())).not.toBe(purchaseKey(p({ quantity: 1, kgCO2e: 28 })));
  });
});

describe('rappel de sauvegarde', () => {
  const now = NOW.getTime();
  it('ne rappelle rien tant qu’il y a peu à perdre', () => {
    expect(shouldRemindBackup(4, null, now)).toBe(false);
  });
  it('rappelle si jamais sauvegardé, ou si la dernière fois date d’un mois', () => {
    expect(shouldRemindBackup(5, null, now)).toBe(true);
    expect(shouldRemindBackup(20, now - 29 * DAY, now)).toBe(false);
    expect(shouldRemindBackup(20, now - 30 * DAY, now)).toBe(true);
  });
});
