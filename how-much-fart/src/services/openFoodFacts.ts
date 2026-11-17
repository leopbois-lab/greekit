import { offProductUrl, parseOffResponse, type OffLookup, type ScannedProduct } from '../engine/openFoodFacts';

/** Cache local des produits déjà scannés : sert hors ligne et évite de re-solliciter l'API. */
export interface ProductCache {
  get(barcode: string): Promise<{ product: ScannedProduct; fetchedAt: number } | null>;
  put(product: ScannedProduct, fetchedAt: number): Promise<void>;
}

export type LookupResult =
  | (OffLookup & { fromCache: boolean })
  /** Pas de réseau (ou service indisponible) et produit jamais scanné. */
  | { status: 'offline' };

const FRESH_MS = 30 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

interface Deps {
  cache: ProductCache;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/**
 * Open Food Facts : API publique sans clé (base sous licence ODbL).
 * Cache récent → réponse immédiate ; sinon réseau ; en cas d'échec, vieux cache en secours.
 */
export function createProductLookup({ cache, fetchImpl = fetch, now = Date.now }: Deps) {
  return async function lookupProduct(barcode: string): Promise<LookupResult> {
    const cached = await cache.get(barcode).catch(() => null);
    if (cached && now() - cached.fetchedAt < FRESH_MS) {
      return { status: 'found', product: cached.product, fromCache: true };
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetchImpl(offProductUrl(barcode), { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      // 404 = produit inconnu (corps JSON « product_not_found ») ; le reste est une panne.
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      const lookup = parseOffResponse(barcode, await res.json());
      if (lookup.status === 'found') await cache.put(lookup.product, now()).catch(() => undefined);
      return { ...lookup, fromCache: false };
    } catch {
      if (cached) return { status: 'found', product: cached.product, fromCache: true };
      return { status: 'offline' };
    }
  };
}
