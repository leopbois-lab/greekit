import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { categoryIdSchema, sourceSchema } from '../data/schema';
import type { Purchase } from '../engine/types';

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

class AppDb extends Dexie {
  purchases!: Table<Purchase, number>;
  constructor() {
    super('how-much-fart');
    this.version(1).stores({ purchases: '++id, date, category' });
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
