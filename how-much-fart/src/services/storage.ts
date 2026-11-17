import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { categoryIdSchema, sourceSchema } from '../data/schema';
import { scannedProductSchema, type ScannedProduct } from '../engine/openFoodFacts';
import type { Purchase } from '../engine/types';
import type { ProductCache } from './openFoodFacts';

/** Validation des achats relus depuis IndexedDB (et, plus tard, de l'import JSON). */
export const purchaseSchema = z.object({
  id: z.number().int().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  factorId: z.string(),
  label: z.string(),
  category: categoryIdSchema,
  quantity: z.number().positive(),
  unit: z.string(),
  kgCO2e: z.number().nonnegative(),
  confidence: z.enum(['precis', 'estime', 'tres-approximatif']),
  source: sourceSchema,
  dataYear: z.number().int().nullable(),
  mode: z.enum(['manuel', 'code-barres', 'ticket']),
  note: z.string().optional(),
});

interface CachedProduct {
  barcode: string;
  product: ScannedProduct;
  fetchedAt: number;
}

class AppDb extends Dexie {
  purchases!: Table<Purchase, number>;
  products!: Table<CachedProduct, string>;
  days!: Table<{ date: string }, string>;
  constructor() {
    // Nom de base inchangé depuis l'ancien nom de l'app : le renommer effacerait les données des utilisateurs.
    super('how-much-fart');
    this.version(1).stores({ purchases: '++id, date, category' });
    // v2 : cache des produits scannés (clé = code-barres).
    this.version(2).stores({ purchases: '++id, date, category', products: 'barcode' });
    // v3 : journées « rien acheté aujourd'hui » validées (clé = date AAAA-MM-JJ).
    this.version(3).stores({ purchases: '++id, date, category', products: 'barcode', days: 'date' });
  }
}

let db: AppDb | null = null;
const getDb = () => (db ??= new AppDb());

export async function listPurchases(): Promise<Purchase[]> {
  const rows = await getDb().purchases.toArray();
  return rows.flatMap((row) => {
    const parsed = purchaseSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function addPurchase(purchase: Purchase): Promise<Purchase> {
  const { id: _ignored, ...rest } = purchase;
  const id = await getDb().purchases.add(rest);
  return { ...rest, id };
}

export async function deletePurchase(id: number): Promise<void> {
  await getDb().purchases.delete(id);
}

/** Cache IndexedDB des produits scannés, relu avec validation. */
export const productCache: ProductCache = {
  async get(barcode) {
    const row = await getDb().products.get(barcode);
    if (!row) return null;
    const parsed = scannedProductSchema.safeParse(row.product);
    return parsed.success && typeof row.fetchedAt === 'number'
      ? { product: parsed.data, fetchedAt: row.fetchedAt }
      : null;
  },
  async put(product, fetchedAt) {
    await getDb().products.put({ barcode: product.barcode, product, fetchedAt });
  },
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export async function listNoPurchaseDays(): Promise<string[]> {
  const rows = await getDb().days.toArray();
  return rows.map((r) => r.date).filter((d) => typeof d === 'string' && DATE_KEY.test(d));
}

export async function setNoPurchaseDay(date: string, on: boolean): Promise<void> {
  if (on) await getDb().days.put({ date });
  else await getDb().days.delete(date);
}

/** Ajoute d'un coup des achats et des journées (import d'une sauvegarde), en une seule transaction. */
export async function importData(purchases: readonly Purchase[], days: readonly string[]): Promise<Purchase[]> {
  const db = getDb();
  return db.transaction('rw', db.purchases, db.days, async () => {
    const rows = purchases.map(({ id: _id, ...rest }) => rest);
    const ids = await db.purchases.bulkAdd(rows, { allKeys: true });
    await db.days.bulkPut(days.map((date) => ({ date })));
    return rows.map((row, i) => ({ ...row, id: ids[i] }));
  });
}

/**
 * Demande au navigateur de ne pas effacer les données de l'app quand l'espace manque.
 * Sur iPhone, Safari l'accorde surtout à une app installée sur l'écran d'accueil.
 */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function isPersisted(): Promise<boolean | null> {
  try {
    return navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  } catch {
    return null;
  }
}
