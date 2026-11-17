import { useEffect, useRef, useState } from 'react';
import { formatDate, toDateKey } from '../engine/format';
import { buildExport, exportFileName, parseExport, planMerge } from '../services/exportImport';
import { isPersisted } from '../services/storage';
import { Button, Card } from './components';
import { isIos } from './platform';
import { playSfx } from './sound';
import { usePurchases, useSettings } from './store';

/** Sauvegarde (export JSON), restauration (import) et état du stockage. */
export function DataCard() {
  const purchases = usePurchases((s) => s.purchases);
  const noPurchaseDays = usePurchases((s) => s.noPurchaseDays);
  const importMany = usePurchases((s) => s.importMany);
  const settings = useSettings();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void isPersisted().then(setPersisted);
  }, [purchases.length]);

  async function exportData() {
    const now = new Date();
    const file = buildExport(purchases, noPurchaseDays, {
      muted: settings.muted,
      theme: settings.theme,
      customMonthlyBudgetKg: settings.customMonthlyBudgetKg,
    }, now);
    const name = exportFileName(now);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    try {
      // Sur iPhone, la feuille de partage permet d'enregistrer le fichier dans « Fichiers » ou de l'envoyer.
      const shareable = new File([blob], name, { type: 'application/json' });
      if (isIos() && navigator.canShare?.({ files: [shareable] })) {
        await navigator.share({ files: [shareable], title: 'Sauvegarde How much fart' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      settings.setLastBackupAt(now.getTime());
      setMessage({ text: `Sauvegarde créée : ${name} (${purchases.length} achat${purchases.length > 1 ? 's' : ''}).` });
      playSfx('coin');
    } catch (err) {
      // Partage annulé par l'utilisateur : pas une erreur.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setMessage({ text: 'La sauvegarde n’a pas pu être créée. Réessaie.', error: true });
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const parsed = parseExport(await file.text());
      if (!parsed.ok) {
        setMessage({ text: parsed.error, error: true });
        playSfx('error');
        return;
      }
      const plan = planMerge(purchases, noPurchaseDays, parsed.data);
      if (plan.purchasesToAdd.length === 0 && plan.daysToAdd.length === 0) {
        setMessage({ text: 'Tout ce que contient ce fichier est déjà là : rien à ajouter.' });
        return;
      }
      await importMany(plan.purchasesToAdd, plan.daysToAdd);
      const { settings: s } = parsed.data;
      if (s.customMonthlyBudgetKg !== undefined && settings.customMonthlyBudgetKg === null) settings.setCustomMonthlyBudgetKg(s.customMonthlyBudgetKg);
      // Le niveau peut faire un bond : on ne le fête pas comme un passage de niveau.
      settings.setLastSeenLevel(null);
      const n = plan.purchasesToAdd.length;
      setMessage({
        text: `${n} achat${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}${plan.duplicates ? `, ${plan.duplicates} déjà présent${plan.duplicates > 1 ? 's' : ''}` : ''}${plan.daysToAdd.length ? `, ${plan.daysToAdd.length} journée${plan.daysToAdd.length > 1 ? 's' : ''} sans achat` : ''}.`,
      });
      playSfx('coin');
    } catch {
      setMessage({ text: 'Ce fichier n’a pas pu être lu.', error: true });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <Card title="Mes données">
      <p className="mt-2">
        Tout reste sur cet appareil, sans compte. Pense à faire une sauvegarde de temps en temps : elle sert aussi à passer
        sur un autre appareil.
      </p>
      <p className="small muted mt-2">
        Dernière sauvegarde :{' '}
        {settings.lastBackupAt ? formatDate(toDateKey(new Date(settings.lastBackupAt))) : 'jamais'} ·{' '}
        {persisted === true
          ? 'stockage protégé par le navigateur'
          : persisted === false
            ? 'stockage non protégé (installer l’app aide sur iPhone)'
            : 'protection du stockage inconnue'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void exportData()} sfx={null} disabled={purchases.length === 0 && noPurchaseDays.length === 0}>
          Sauvegarder (JSON)
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
          Importer une sauvegarde
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Fichier de sauvegarde à importer"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </div>
      <p aria-live="polite" className={`small mt-3 min-h-6 ${message?.error ? 'field-error' : ''}`}>{message?.text}</p>
      <p className="small muted">L’import ajoute les achats manquants sans rien effacer ; un même achat n’est jamais compté deux fois.</p>
    </Card>
  );
}
