import { z } from 'zod';
import type { Purchase } from '../engine/types';
import { purchaseSchema } from './storage';

/**
 * Sauvegarde des données en JSON (export) et restauration (import).
 * L'import est validé avec Zod et fusionne sans doublon : il ne supprime jamais rien.
 */

// Identifiant interne des sauvegardes : inchangé depuis l'ancien nom, pour que les anciennes sauvegardes restent lisibles.
export const EXPORT_APP = 'how-much-fart';
export const EXPORT_VERSION = 1;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const exportedSettingsSchema = z.object({
  muted: z.boolean().optional(),
  theme: z.enum(['auto', 'clair', 'sombre']).optional(),
  customMonthlyBudgetKg: z.number().positive().nullable().optional(),
});
export type ExportedSettings = z.infer<typeof exportedSettingsSchema>;

const exportFileSchema = z.object({
  app: z.literal(EXPORT_APP),
  version: z.number().int(),
  exportedAt: z.string(),
  purchases: z.array(purchaseSchema.omit({ id: true }).passthrough()),
  noPurchaseDays: z.array(z.string().regex(DATE_KEY)).default([]),
  settings: exportedSettingsSchema.default({}),
});
export type ExportFile = z.infer<typeof exportFileSchema>;

export function buildExport(
  purchases: readonly Purchase[],
  noPurchaseDays: readonly string[],
  settings: ExportedSettings,
  now: Date,
): ExportFile {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    // L'identifiant est propre à chaque appareil : on ne l'exporte pas.
    purchases: purchases.map(({ id: _id, ...rest }) => rest),
    noPurchaseDays: [...new Set(noPurchaseDays)].sort(),
    settings,
  };
}

export function exportFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `the-carbon-quest-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

export type ParseResult = { ok: true; data: ExportFile } | { ok: false; error: string };

/** Lit le contenu d'un fichier de sauvegarde ; message d'erreur en français, sans jargon. */
export function parseExport(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas un fichier JSON lisible.' };
  }
  const app = (json as { app?: unknown } | null)?.app;
  if (app !== EXPORT_APP) {
    return { ok: false, error: 'Ce fichier ne vient pas de The carbon quest.' };
  }
  const version = (json as { version?: unknown }).version;
  if (typeof version === 'number' && version > EXPORT_VERSION) {
    return { ok: false, error: 'Ce fichier vient d’une version plus récente de l’app : mets-la à jour, puis réessaie.' };
  }
  const parsed = exportFileSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: 'Ce fichier est incomplet ou abîmé : rien n’a été importé.' };
  }
  return { ok: true, data: parsed.data };
}

/** Empreinte d'un achat pour repérer les doublons (même achat importé deux fois). */
export function purchaseKey(p: Pick<Purchase, 'date' | 'factorId' | 'label' | 'quantity' | 'kgCO2e' | 'mode'>): string {
  return [p.date, p.factorId, p.label, p.quantity, p.kgCO2e.toFixed(6), p.mode].join('|');
}

export interface MergePlan {
  purchasesToAdd: Purchase[];
  daysToAdd: string[];
  duplicates: number;
}

/** Ce qu'il faut ajouter pour fusionner une sauvegarde avec les données présentes. */
export function planMerge(
  existing: readonly Purchase[],
  existingDays: readonly string[],
  incoming: ExportFile,
): MergePlan {
  const seen = new Set(existing.map(purchaseKey));
  const purchasesToAdd: Purchase[] = [];
  let duplicates = 0;
  for (const raw of incoming.purchases) {
    const p = raw as Purchase;
    const key = purchaseKey(p);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    purchasesToAdd.push(p);
  }
  const knownDays = new Set(existingDays);
  const daysToAdd = [...new Set(incoming.noPurchaseDays)].filter((d) => !knownDays.has(d));
  return { purchasesToAdd, daysToAdd, duplicates };
}

/** Jours depuis la dernière sauvegarde (ou depuis le dernier rappel ignoré) ; `null` si jamais. */
export function daysSince(timestamp: number | null, now: number): number | null {
  return timestamp === null ? null : Math.floor((now - timestamp) / (24 * 3600 * 1000));
}

/** Faut-il rappeler de sauvegarder ? Seulement s'il y a de quoi perdre, et pas plus d'une fois par mois. */
export function shouldRemindBackup(purchaseCount: number, lastBackupOrSnooze: number | null, now: number): boolean {
  if (purchaseCount < 5) return false;
  const days = daysSince(lastBackupOrSnooze, now);
  return days === null || days >= 30;
}
