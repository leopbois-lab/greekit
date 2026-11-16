import type { CategoryId, Factor } from '../data/schema';

/** Minuscules, sans accents ni ligatures : « Bœuf » et « boeuf » se retrouvent. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Articles utilisables d'une catégorie, filtrés par la recherche, triés par ordre alphabétique. */
export function searchFactors(
  factors: readonly Factor[],
  category: CategoryId,
  query: string,
  kind: Factor['kind'] = 'article',
): Factor[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return factors
    .filter((f) => f.category === category && f.kind === kind && f.status === 'ok')
    .filter((f) => {
      const label = normalize(f.label);
      return words.every((w) => label.includes(w));
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

export function pendingFactors(factors: readonly Factor[], category: CategoryId): Factor[] {
  return factors.filter((f) => f.category === category && f.status !== 'ok');
}
