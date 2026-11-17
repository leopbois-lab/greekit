import { toDateKey } from './format';
import { normalize } from './search';
import type { Purchase } from './types';

/**
 * Règles du jeu, en fonctions pures. Tout se déduit de l'historique (achats + journées
 * « rien acheté » validées) : rien n'est stocké à part, donc rien ne peut se désynchroniser.
 *
 * Un jour ne compte (sobre, sans bœuf, combo) que s'il est « saisi » : au moins un achat
 * enregistré, ou un « rien acheté aujourd'hui » validé. Un jour vide ne rapporte rien.
 */

/* ---------- Réglages du jeu ---------- */
export const XP = {
  purchase: 10,
  noPurchaseDay: 5,
  soberDay: 15,
  quest: 50,
  achievement: 30,
  boss: 200,
} as const;
/** Jours saisis nécessaires dans le mois pour que le boss soit « jouable ». */
export const BOSS_MIN_LOGGED_DAYS = 8;

/* ---------- Dates (AAAA-MM-JJ, heure locale) ---------- */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}
export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
/** Lundi de la semaine qui contient la date. */
export function weekStart(key: string): string {
  const d = parseDateKey(key);
  return addDays(key, -((d.getDay() + 6) % 7));
}
const monthOf = (key: string) => key.slice(0, 7);

/* ---------- Journées ---------- */
export interface DaySummary {
  date: string;
  kg: number;
  purchases: number;
  scans: number;
  noPurchase: boolean;
  beef: boolean;
}

const BEEF_FACTORS = new Set(['ico2-boeuf', 'ico2-veau', 'ico2-cheeseburger', 'ico2-repasavecduboeuf']);
const BEEF_WORDS = /\b(boeuf|steak|steaks|bavette|entrecote|burger|cheeseburger|veau)\b/;

export function isBeefPurchase(p: Pick<Purchase, 'factorId' | 'label'>): boolean {
  return BEEF_FACTORS.has(p.factorId) || BEEF_WORDS.test(normalize(p.label));
}

/** Regroupe l'historique par jour saisi. */
export function buildDays(purchases: readonly Purchase[], noPurchaseDays: readonly string[]): Map<string, DaySummary> {
  const days = new Map<string, DaySummary>();
  const get = (date: string) => {
    let d = days.get(date);
    if (!d) {
      d = { date, kg: 0, purchases: 0, scans: 0, noPurchase: false, beef: false };
      days.set(date, d);
    }
    return d;
  };
  for (const p of purchases) {
    const d = get(p.date);
    d.kg += p.kgCO2e;
    d.purchases += 1;
    if (p.mode === 'code-barres') d.scans += 1;
    if (isBeefPurchase(p)) d.beef = true;
  }
  // Un « rien acheté » ne vaut que pour un jour réellement sans achat.
  for (const date of noPurchaseDays) {
    if (!days.has(date)) get(date).noPurchase = true;
  }
  return days;
}

export function dailyBudgetKg(monthlyBudgetKg: number, dateKey: string): number {
  return monthlyBudgetKg / daysInMonth(monthOf(dateKey));
}
/** Jour sobre : saisi, et sous le budget du jour (budget du mois ÷ nombre de jours du mois). */
export function isSoberDay(day: DaySummary, monthlyBudgetKg: number): boolean {
  return day.kg <= dailyBudgetKg(monthlyBudgetKg, day.date);
}

/* ---------- Combos de jours sobres ---------- */
export function streaks(days: ReadonlyMap<string, DaySummary>, monthlyBudgetKg: number, today: string): { current: number; best: number } {
  const sober = (key: string) => {
    const d = days.get(key);
    return d !== undefined && isSoberDay(d, monthlyBudgetKg);
  };
  // Combo en cours : il tient encore si aujourd'hui n'est pas saisi, tant qu'hier était sobre.
  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (sober(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  for (const key of [...days.keys()].sort()) {
    if (!sober(key) || sober(addDays(key, -1))) continue; // on ne compte qu'à partir du début d'une série
    let run = 0;
    for (let k = key; sober(k); k = addDays(k, 1)) run++;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
}

/* ---------- Niveaux ---------- */
/** XP total nécessaire pour atteindre un niveau : 0, 100, 300, 600, 1000… */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}
export function levelFromXp(xp: number): { level: number; intoLevel: number; neededForNext: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return { level, intoLevel: xp - xpForLevel(level), neededForNext: xpForLevel(level + 1) - xpForLevel(level) };
}

/* ---------- Quêtes hebdomadaires ---------- */
export interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  done: boolean;
  rewardXp: number;
}

interface QuestDef {
  id: string;
  title: string;
  description: string;
  target: number;
  count: (week: DaySummary[], monthlyBudgetKg: number) => number;
}

const QUEST_POOL: QuestDef[] = [
  { id: 'sans-boeuf', title: '3 jours sans bœuf', description: 'Trois jours saisis sans achat de bœuf cette semaine.', target: 3, count: (w) => w.filter((d) => !d.beef).length },
  { id: 'journal', title: 'Journal de bord', description: 'Saisir quelque chose 5 jours différents cette semaine.', target: 5, count: (w) => w.length },
  { id: 'semaine-legere', title: 'Semaine légère', description: 'Quatre jours sobres (sous le budget du jour) cette semaine.', target: 4, count: (w, b) => w.filter((d) => isSoberDay(d, b)).length },
  { id: 'scanneur', title: 'Œil de lynx', description: 'Scanner 3 produits cette semaine.', target: 3, count: (w) => w.reduce((n, d) => n + d.scans, 0) },
  { id: 'pause', title: 'Pause achats', description: 'Valider 2 journées sans aucun achat cette semaine.', target: 2, count: (w) => w.filter((d) => d.noPurchase).length },
];

/** Trois quêtes par semaine : « sans bœuf » toujours, plus deux autres qui tournent d'une semaine à l'autre. */
function questDefsForWeek(weekStartKey: string): QuestDef[] {
  const weekIndex = Math.round(parseDateKey(weekStartKey).getTime() / (7 * 24 * 3600 * 1000));
  const others = QUEST_POOL.slice(1);
  const a = ((weekIndex % others.length) + others.length) % others.length;
  const b = (a + 1) % others.length;
  return [QUEST_POOL[0], others[a], others[b]];
}

export function questsForWeek(days: ReadonlyMap<string, DaySummary>, weekStartKey: string, monthlyBudgetKg: number): Quest[] {
  const week: DaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const d = days.get(addDays(weekStartKey, i));
    if (d) week.push(d);
  }
  return questDefsForWeek(weekStartKey).map((def) => {
    const progress = Math.min(def.target, def.count(week, monthlyBudgetKg));
    return { id: def.id, title: def.title, description: def.description, progress, target: def.target, done: progress >= def.target, rewardXp: XP.quest };
  });
}

/* ---------- Boss de fin de mois ---------- */
export type BossStatus = 'en-cours' | 'victoire' | 'defaite' | 'non-joue';

export interface Boss {
  month: string;
  status: BossStatus;
  emittedKg: number;
  budgetKg: number;
  loggedDays: number;
  requiredDays: number;
  /** Mois en cours : émissions projetées en fin de mois au rythme actuel. */
  projectedKg: number | null;
  daysLeft: number;
}

/** Le boss est battu si le mois se termine sous le budget, avec assez de jours saisis pour que ça compte. */
export function bossForMonth(days: ReadonlyMap<string, DaySummary>, month: string, monthlyBudgetKg: number, today: string): Boss {
  const inMonth = [...days.values()].filter((d) => monthOf(d.date) === month);
  const emittedKg = inMonth.reduce((s, d) => s + d.kg, 0);
  const loggedDays = inMonth.length;
  const total = daysInMonth(month);
  const base = { month, emittedKg, budgetKg: monthlyBudgetKg, loggedDays, requiredDays: BOSS_MIN_LOGGED_DAYS };
  if (month === monthOf(today)) {
    const elapsed = Number(today.slice(8, 10));
    return { ...base, status: 'en-cours', projectedKg: (emittedKg / elapsed) * total, daysLeft: total - elapsed };
  }
  const status: BossStatus = loggedDays < BOSS_MIN_LOGGED_DAYS ? 'non-joue' : emittedKg <= monthlyBudgetKg ? 'victoire' : 'defaite';
  return { ...base, status, projectedKg: null, daysLeft: 0 };
}

/* ---------- Succès ---------- */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

/* ---------- État complet ---------- */
export interface GameState {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  streak: { current: number; best: number };
  quests: Quest[];
  questsCompleted: number;
  boss: Boss;
  bossesBeaten: number;
  achievements: Achievement[];
  today: DaySummary | null;
  loggedDays: number;
  soberDays: number;
}

export function computeGame(
  purchases: readonly Purchase[],
  noPurchaseDays: readonly string[],
  monthlyBudgetKg: number,
  today: string,
): GameState {
  const days = buildDays(purchases, noPurchaseDays);
  const keys = [...days.keys()].sort();
  const all = [...days.values()];
  const soberDays = all.filter((d) => isSoberDay(d, monthlyBudgetKg)).length;
  const streak = streaks(days, monthlyBudgetKg, today);

  // Quêtes : toutes les semaines depuis le premier jour saisi jusqu'à la semaine en cours.
  const thisWeek = weekStart(today);
  let questsCompleted = 0;
  if (keys.length > 0) {
    for (let w = weekStart(keys[0]); w <= thisWeek; w = addDays(w, 7)) {
      questsCompleted += questsForWeek(days, w, monthlyBudgetKg).filter((q) => q.done).length;
    }
  }

  // Boss : tous les mois terminés.
  const thisMonth = monthOf(today);
  const pastMonths = [...new Set(keys.map(monthOf))].filter((m) => m < thisMonth);
  const bossesBeaten = pastMonths.filter((m) => bossForMonth(days, m, monthlyBudgetKg, today).status === 'victoire').length;

  const categories = new Set(purchases.map((p) => p.category)).size;
  const scans = purchases.filter((p) => p.mode === 'code-barres').length;
  const tickets = purchases.filter((p) => p.mode === 'ticket').length;
  const ach = (id: string, title: string, description: string, icon: string, progress: number, target: number): Achievement => ({
    id, title, description, icon, target, progress: Math.min(progress, target), unlocked: progress >= target,
  });
  const achievements = [
    ach('premier-pas', 'Premier pas', 'Enregistrer un premier achat.', 'flag', purchases.length, 1),
    ach('regulier', 'Régulier', 'Saisir 10 jours différents.', 'calendar', all.length, 10),
    ach('assidu', 'Assidu', 'Saisir 30 jours différents.', 'calendar', all.length, 30),
    ach('combo-3', 'Combo ×3', 'Enchaîner 3 jours sobres.', 'flame', streak.best, 3),
    ach('combo-7', 'Combo ×7', 'Enchaîner 7 jours sobres.', 'flame', streak.best, 7),
    ach('scanneur', 'Scanneur', 'Scanner 5 produits.', 'barcode', scans, 5),
    ach('ticket', 'Ticket gagnant', 'Lire un ticket de caisse.', 'receipt', tickets, 1),
    ach('explorateur', 'Explorateur', 'Saisir des achats dans 5 catégories.', 'compass', categories, 5),
    ach('queteur', 'Quêteur', 'Réussir 5 quêtes hebdomadaires.', 'star', questsCompleted, 5),
    ach('boss', 'Tombeur de boss', 'Battre un boss de fin de mois.', 'trophy', bossesBeaten, 1),
  ];

  const noPurchaseCount = all.filter((d) => d.noPurchase).length;
  const xp =
    purchases.length * XP.purchase +
    noPurchaseCount * XP.noPurchaseDay +
    soberDays * XP.soberDay +
    questsCompleted * XP.quest +
    bossesBeaten * XP.boss +
    achievements.filter((a) => a.unlocked).length * XP.achievement;
  const lvl = levelFromXp(xp);

  return {
    xp,
    level: lvl.level,
    xpIntoLevel: lvl.intoLevel,
    xpNeededForNext: lvl.neededForNext,
    streak,
    quests: questsForWeek(days, thisWeek, monthlyBudgetKg),
    questsCompleted,
    boss: bossForMonth(days, thisMonth, monthlyBudgetKg, today),
    bossesBeaten,
    achievements,
    today: days.get(today) ?? null,
    loggedDays: all.length,
    soberDays,
  };
}
