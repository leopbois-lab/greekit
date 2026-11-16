import type { CategoryId, Source } from '../data/schema';

/** Niveau de confiance d'un résultat. */
export type Confidence = 'precis' | 'estime' | 'tres-approximatif';

export type PurchaseMode = 'manuel' | 'code-barres' | 'ticket';

export interface Purchase {
  /** Attribué par le stockage à l'enregistrement. */
  id?: number;
  /** Date de l'achat, AAAA-MM-JJ (heure locale). */
  date: string;
  factorId: string;
  label: string;
  category: CategoryId;
  quantity: number;
  unit: string;
  kgCO2e: number;
  confidence: Confidence;
  source: Source;
  dataYear: number | null;
  mode: PurchaseMode;
  note?: string;
}

export const CONFIDENCE_LABELS: Record<Confidence, { name: string; explanation: string }> = {
  precis: { name: 'Précis', explanation: 'Donnée du produit × poids connu.' },
  estime: { name: 'Estimé', explanation: 'Facteur générique de la catégorie × quantité.' },
  'tres-approximatif': {
    name: 'Très approximatif',
    explanation: 'Estimation à partir du prix : un ordre de grandeur, pas plus.',
  },
};

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  alimentation: 'Alimentation',
  boissons: 'Boissons',
  vetements: 'Vêtements',
  electronique: 'Électronique',
  electromenager: 'Électroménager',
  mobilier: 'Mobilier',
  transport: 'Transport',
  energie: 'Énergie',
  numerique: 'Numérique',
  loisirs: 'Loisirs',
};
