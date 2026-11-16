/**
 * État de la planète-mascotte en fonction de sa « vie »
 * (part du budget carbone mensuel encore disponible, entre 0 et 1).
 * TS pur : aucune dépendance à React ou au DOM.
 */

export type PlanetState = 'verdoyante' | 'fraiche' | 'tiede' | 'enfumee' | 'suffocante';

export const PLANET_STATES: readonly PlanetState[] = [
  'verdoyante',
  'fraiche',
  'tiede',
  'enfumee',
  'suffocante',
];

/** Ramène une valeur quelconque dans [0, 1] (NaN → 0). */
export function clampHealth(health: number): number {
  if (Number.isNaN(health)) return 0;
  return Math.min(1, Math.max(0, health));
}

/** Vie restante = 1 − (émis / budget). Budget nul ou négatif → 0. */
export function healthFromBudget(emittedKg: number, budgetKg: number): number {
  if (!(budgetKg > 0)) return 0;
  return clampHealth(1 - Math.max(0, emittedKg) / budgetKg);
}

export function planetStateFromHealth(health: number): PlanetState {
  const h = clampHealth(health);
  if (h >= 0.75) return 'verdoyante';
  if (h >= 0.5) return 'fraiche';
  if (h >= 0.25) return 'tiede';
  if (h > 0) return 'enfumee';
  return 'suffocante';
}

/** Libellés affichés : encourageants, jamais culpabilisants. */
export const PLANET_LABELS: Record<PlanetState, { name: string; message: string }> = {
  verdoyante: { name: 'Verdoyante', message: 'La planète respire à pleins poumons !' },
  fraiche: { name: 'En forme', message: 'Tout roule, continue comme ça.' },
  tiede: { name: 'Tiède', message: 'Ça chauffe un peu, mais tu as encore de la marge.' },
  enfumee: { name: 'Enfumée', message: 'Un petit geste et elle reprend des couleurs.' },
  suffocante: { name: 'À bout de souffle', message: 'Nouveau mois, nouvelle partie : on la retape ensemble.' },
};

/** Nombre de segments pleins d'une barre de vie à `segments` cases. */
export function filledSegments(health: number, segments: number): number {
  if (segments <= 0) return 0;
  const h = clampHealth(health);
  if (h === 0) return 0;
  // Tant qu'il reste de la vie, au moins une case reste allumée.
  return Math.max(1, Math.round(h * segments));
}
