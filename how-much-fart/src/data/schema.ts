import { z } from 'zod';

/** Schémas des JSON de données : utilisés par le script de génération, l'app et les tests. */

export const CATEGORY_IDS = [
  'alimentation',
  'boissons',
  'vetements',
  'electronique',
  'electromenager',
  'mobilier',
  'transport',
  'energie',
  'numerique',
  'loisirs',
] as const;
export const categoryIdSchema = z.enum(CATEGORY_IDS);
export type CategoryId = z.infer<typeof categoryIdSchema>;

export const statusSchema = z.enum(['ok', 'à compléter']);
export type Status = z.infer<typeof statusSchema>;

export const sourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});
export type Source = z.infer<typeof sourceSchema>;

const baseEntry = {
  id: z.string().min(1),
  label: z.string().min(1),
  /** kg CO2e par unité. `null` uniquement si statut « à compléter ». */
  value: z.number().nonnegative().nullable(),
  unit: z.string().min(1),
  source: sourceSchema.nullable(),
  /** Année de la donnée, quand la source la précise. */
  dataYear: z.number().int().nullable(),
  /** Date de récupération (AAAA-MM-JJ). */
  retrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: statusSchema,
  note: z.string().optional(),
};

const okNeedsValue = (e: { status: Status; value: number | null; source: Source | null }) =>
  e.status === 'à compléter' || (e.value !== null && e.source !== null);
const okMessage = { message: 'Une entrée « ok » doit avoir une valeur et une source.' };

export const factorSchema = z
  .object({
    ...baseEntry,
    category: categoryIdSchema,
    /** Famille au sein de la catégorie : sert à proposer des alternatives (étape 5). */
    family: z.string().min(1),
    /** `article` : kg CO2e par unité physique. `monetaire` : kg CO2e par euro dépensé. */
    kind: z.enum(['article', 'monetaire']),
  })
  .refine(okNeedsValue, okMessage);
export type Factor = z.infer<typeof factorSchema>;

export const factorsFileSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  licences: z.array(z.object({ name: z.string(), licence: z.string(), url: z.string().url() })),
  factors: z.array(factorSchema),
});
export type FactorsFile = z.infer<typeof factorsFileSchema>;

export const equivalenceSchema = z
  .object({
    ...baseEntry,
    /** Libellé au pluriel, affiché après le nombre : « km en voiture thermique ». */
    label: z.string().min(1),
    /** `ratio` : total ÷ valeur. `pourcentage` : total ÷ valeur × 100. `duree` : total ÷ valeur annuelle = années. */
    mode: z.enum(['ratio', 'pourcentage', 'duree']),
    sprite: z.string().min(1),
    hypothesis: z.string().optional(),
    tooltip: z.string().optional(),
  })
  .refine(okNeedsValue, okMessage);
export type Equivalence = z.infer<typeof equivalenceSchema>;

export const equivalencesFileSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  /** Budget carbone de référence (moyenne française annuelle, kg CO2e par personne). */
  budget: z.object({
    annualKgPerPerson: z.number().positive(),
    dataYear: z.number().int(),
    publishedYear: z.number().int(),
    source: sourceSchema,
    retrievedAt: z.string(),
    note: z.string().optional(),
  }),
  equivalences: z.array(equivalenceSchema),
});
export type EquivalencesFile = z.infer<typeof equivalencesFileSchema>;
