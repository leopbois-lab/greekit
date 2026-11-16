import equivalencesJson from './equivalences.v1.json';
import factorsJson from './factors.v1.json';
import { equivalencesFileSchema, factorsFileSchema } from './schema';

// Les JSON sont validés au démarrage : une donnée mal formée casse tôt et clairement.
export const FACTORS_FILE = factorsFileSchema.parse(factorsJson);
export const EQUIVALENCES_FILE = equivalencesFileSchema.parse(equivalencesJson);

export const FACTORS = FACTORS_FILE.factors;
export const EQUIVALENCES = EQUIVALENCES_FILE.equivalences;
export const BUDGET = EQUIVALENCES_FILE.budget;
