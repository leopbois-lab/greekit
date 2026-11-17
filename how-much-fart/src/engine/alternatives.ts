import type { Factor } from '../data/schema';
import type { Purchase } from './types';

/**
 * Alternative moins émettrice : un facteur sourcé plus bas, dans la même famille et la même unité.
 * On ne propose que là où les articles sont réellement interchangeables (une chaise ne remplace
 * pas une armoire, ni un chargeur un smartphone).
 */
const SUBSTITUTABLE_FAMILIES = new Set([
  'viandes',
  'poissons et fruits de mer',
  'oeufs et produits laitiers',
  'céréales et légumineuses',
  'plats préparés',
  'en-cas',
  'alternatives végétariennes',
  'boissons',
  'pulls',
  'robes',
  'chaussures',
  'vestes et manteaux',
  'déplacements',
  'chauffage',
  'hébergement',
]);

// Transport : on compare des modes qui couvrent le même genre de trajet.
const LONG_DISTANCE = new Set([
  'ico2-avion-courtcourrier', 'ico2-avion-moyencourrier', 'ico2-avion-moyenlongcourrier', 'ico2-avion-longcourrier',
  'ico2-tgv', 'ico2-intercites', 'ico2-autocar', 'ico2-voiturethermique', 'ico2-voitureelectrique', 'ico2-voiturehybride',
]);
const PLANES = /^ico2-avion-/;
const LONG_TRIP_KM = 80;

export interface Alternative {
  factor: Factor;
  /** Empreinte pour la même quantité. */
  kgCO2e: number;
  savedKg: number;
  /** Part économisée, entre 0 et 1. */
  savedShare: number;
}

/** Alternatives triées de la plus sobre à la moins sobre ; liste vide si rien de pertinent. */
export function findAlternatives(
  purchase: Pick<Purchase, 'factorId' | 'quantity' | 'kgCO2e'>,
  factors: readonly Factor[],
): Alternative[] {
  const current = factors.find((f) => f.id === purchase.factorId);
  if (!current || current.kind !== 'article' || current.value === null) return [];
  if (!SUBSTITUTABLE_FAMILIES.has(current.family)) return [];

  const longTrip = current.family === 'déplacements' && (PLANES.test(current.id) || purchase.quantity > LONG_TRIP_KM);
  return factors
    .filter(
      (f) =>
        f.id !== current.id &&
        f.status === 'ok' &&
        f.kind === 'article' &&
        f.value !== null &&
        f.category === current.category &&
        f.family === current.family &&
        f.unit === current.unit &&
        f.value < current.value!,
    )
    .filter((f) => current.family !== 'déplacements' || (longTrip ? LONG_DISTANCE.has(f.id) : !PLANES.test(f.id)))
    .map((f) => {
      const kgCO2e = f.value! * purchase.quantity;
      const savedKg = purchase.kgCO2e - kgCO2e;
      return { factor: f, kgCO2e, savedKg, savedShare: purchase.kgCO2e > 0 ? savedKg / purchase.kgCO2e : 0 };
    })
    .filter((a) => a.savedKg > 0)
    .sort((a, b) => a.kgCO2e - b.kgCO2e);
}
