import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { FACTORS } from '../data';
import { CATEGORY_IDS, type CategoryId } from '../data/schema';
import { parseQuantity } from '../engine/compute';
import { formatKg, toDateKey } from '../engine/format';
import {
  computeReceiptPurchase,
  defaultRatio,
  guessCategory,
  parseReceiptText,
  suggestFactor,
} from '../engine/receipt';
import { searchFactors } from '../engine/search';
import { CATEGORY_LABELS, CONFIDENCE_LABELS } from '../engine/types';
import { getOcrProvider } from '../services/ocr';
import { PixelButton, PixelFrame, PixelLink } from '../ui/components';
import { playSfx } from '../ui/sound';
import { usePurchases } from '../ui/store';

interface Row {
  key: number;
  include: boolean;
  label: string;
  price: string;
  category: CategoryId;
  articleId: string;
  quantity: string;
}

type Phase = { name: 'pick' } | { name: 'reading'; progress: number } | { name: 'review' };

const priceText = (n: number) => n.toFixed(2).replace('.', ',');

export function ReceiptScreen() {
  const navigate = useNavigate();
  const add = usePurchases((s) => s.add);
  const nextKey = useRef(1);
  const [phase, setPhase] = useState<Phase>({ name: 'pick' });
  const [rows, setRows] = useState<Row[]>([]);
  const [rawText, setRawText] = useState('');
  const [printedTotal, setPrintedTotal] = useState<number | null>(null);
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const newRow = (label = '', price = ''): Row => {
    const category = label ? guessCategory(label) : 'alimentation';
    return {
      key: nextKey.current++,
      include: true,
      label,
      price,
      category,
      articleId: label ? (suggestFactor(label, category, FACTORS)?.id ?? '') : '',
      quantity: '',
    };
  };

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPhase({ name: 'reading', progress: 0 });
    try {
      const { text } = await getOcrProvider().recognize(file, (progress) => setPhase({ name: 'reading', progress }));
      const parsed = parseReceiptText(text);
      setRawText(text);
      setPrintedTotal(parsed.total);
      setRows(parsed.lines.map((l) => newRow(l.label, priceText(l.price))));
      setPhase({ name: 'review' });
      playSfx(parsed.lines.length > 0 ? 'coin' : 'error');
    } catch {
      setError('La lecture du ticket n’a pas abouti. Réessaie avec une autre photo, ou ajoute tes lignes à la main.');
      setPhase({ name: 'pick' });
      playSfx('error');
    }
  }

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const computed = rows.map((row) => ({
    row,
    result: computeReceiptPurchase(
      {
        label: row.label,
        price: parseQuantity(row.price),
        category: row.category,
        articleId: row.articleId || null,
        quantity: row.quantity.trim() ? parseQuantity(row.quantity) : null,
      },
      FACTORS,
      date,
    ),
  }));
  const kept = computed.filter((c) => c.row.include);
  const invalid = kept.filter((c) => !c.result.ok).length;
  const totalKg = kept.reduce((sum, c) => sum + (c.result.ok ? c.result.purchase.kgCO2e : 0), 0);
  const sumPrices = kept.reduce((sum, c) => sum + (parseQuantity(c.row.price) ?? 0), 0);

  async function save() {
    if (kept.length === 0 || invalid > 0) return;
    setSaving(true);
    try {
      for (const c of kept) if (c.result.ok) await add(c.result.purchase);
      playSfx('levelUp');
      navigate('/historique');
    } catch {
      setError('Impossible d’enregistrer sur cet appareil. Réessaie dans un instant.');
      playSfx('error');
      setSaving(false);
    }
  }

  /* ---------- Lecture en cours ---------- */
  if (phase.name === 'reading') {
    const pct = Math.round(phase.progress * 100);
    return (
      <div className="flex flex-col gap-7">
        <h1>Ticket de caisse</h1>
        <PixelFrame title="Lecture" accent>
          <p className="mt-2" role="status">
            {pct === 0 ? 'Préparation de la lecture (un peu plus long la première fois)…' : `Lecture du ticket… ${pct} %`}
          </p>
          <div className="progress mt-3" role="progressbar" aria-label="Lecture du ticket" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className="progress__bar" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm text-ink-dim">Tout se passe sur ton appareil : la photo n’est envoyée nulle part.</p>
        </PixelFrame>
      </div>
    );
  }

  /* ---------- Vérification ---------- */
  if (phase.name === 'review') {
    return (
      <div className="flex flex-col gap-7">
        <h1>Vérifie le ticket</h1>
        {rows.length === 0 ? (
          <p role="status">
            Je n’ai pas réussi à repérer de lignes sur cette photo. Tu peux réessayer (ticket bien à plat, bien éclairé,
            cadré serré) ou ajouter tes lignes à la main.
          </p>
        ) : (
          <p>
            {rows.length} ligne{rows.length > 1 ? 's' : ''} repérée{rows.length > 1 ? 's' : ''}. Corrige ce qui a été mal lu,
            décoche ce qui n’est pas un achat. Ajoute un poids pour passer une ligne de « très approximatif » à « estimé ».
          </p>
        )}

        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {computed.map(({ row, result }, i) => {
            const articles = searchFactors(FACTORS, row.category, '');
            const article = articles.find((a) => a.id === row.articleId);
            const ratio = defaultRatio(row.category, FACTORS);
            const id = (name: string) => `row-${row.key}-${name}`;
            return (
              <li key={row.key} className={`receipt-row ${row.include ? '' : 'receipt-row--off'}`}>
                <label className="check">
                  <input type="checkbox" checked={row.include} onChange={(e) => update(row.key, { include: e.target.checked })} />
                  <span>Garder la ligne {i + 1}</span>
                </label>
                <div className="receipt-row__grid">
                  <div>
                    <label className="field-label" htmlFor={id('label')}>Libellé</label>
                    <input id={id('label')} className="px-input" value={row.label} onChange={(e) => update(row.key, { label: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor={id('price')}>Prix (€)</label>
                    <input id={id('price')} className="px-input" inputMode="decimal" value={row.price} onChange={(e) => update(row.key, { price: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor={id('cat')}>Catégorie</label>
                    <select
                      id={id('cat')}
                      className="px-select"
                      value={row.category}
                      onChange={(e) => {
                        const category = e.target.value as CategoryId;
                        update(row.key, { category, articleId: suggestFactor(row.label, category, FACTORS)?.id ?? '', quantity: '' });
                      }}
                    >
                      {CATEGORY_IDS.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor={id('article')}>Article (facultatif)</label>
                    <select
                      id={id('article')}
                      className="px-select"
                      value={row.articleId}
                      onChange={(e) => update(row.key, { articleId: e.target.value, quantity: '' })}
                    >
                      <option value="">Aucun : estimer par le prix</option>
                      {articles.map((a) => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  {article && (
                    <div>
                      <label className="field-label" htmlFor={id('qty')}>Quantité ({article.unit})</label>
                      <input
                        id={id('qty')}
                        className="px-input"
                        inputMode="decimal"
                        placeholder={article.unit === 'kg' ? 'ex. 0,35' : ''}
                        value={row.quantity}
                        onChange={(e) => update(row.key, { quantity: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <p aria-live="polite" className="text-sm">
                  {result.ok ? (
                    <>
                      ≈ <strong>{formatKg(result.purchase.kgCO2e)}</strong> ·{' '}
                      <span className={`badge badge--${result.purchase.confidence}`}>
                        {CONFIDENCE_LABELS[result.purchase.confidence].name}
                      </span>
                    </>
                  ) : result.error === 'facteur-a-completer' && !ratio ? (
                    <span className="text-[var(--yellow)]">
                      Pas d’estimation par le prix sourcée pour cette catégorie : choisis un article et sa quantité, ou décoche la ligne.
                    </span>
                  ) : (
                    <span className="text-[var(--yellow)]">Indique un prix supérieur à zéro (ex. 1,25), ou décoche la ligne.</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          <PixelButton variant="secondary" onClick={() => setRows((rs) => [...rs, newRow()])}>+ Ajouter une ligne</PixelButton>
          <PixelButton
            variant="secondary"
            onClick={() => {
              setRows([]);
              setPhase({ name: 'pick' });
            }}
          >
            Autre photo
          </PixelButton>
        </div>

        <PixelFrame title="Bilan du ticket" accent>
          <p className="big-number mt-3" aria-live="polite">{formatKg(totalKg)}</p>
          <p className="mt-1 text-ink-dim">
            {kept.length} ligne{kept.length > 1 ? 's' : ''} gardée{kept.length > 1 ? 's' : ''}, {priceText(sumPrices)} € au total
            {printedTotal !== null ? ` (total lu sur le ticket : ${priceText(printedTotal)} €)` : ''}.
          </p>
          <div className="mt-4">
            <label className="field-label" htmlFor="receipt-date">Date du ticket</label>
            <input
              id="receipt-date"
              type="date"
              className="px-input"
              value={date}
              max={toDateKey(new Date())}
              onChange={(e) => setDate(e.target.value || toDateKey(new Date()))}
            />
          </div>
          {invalid > 0 && (
            <p role="alert" className="mt-3 text-[var(--yellow)]">
              {invalid} ligne{invalid > 1 ? 's' : ''} à corriger ou à décocher avant d’enregistrer.
            </p>
          )}
          {error && <p role="alert" className="mt-3 text-[var(--yellow)]">{error}</p>}
          <div className="mt-4">
            <PixelButton big sfx={null} disabled={saving || kept.length === 0 || invalid > 0} onClick={() => void save()}>
              Enregistrer {kept.length} achat{kept.length > 1 ? 's' : ''}
            </PixelButton>
          </div>
        </PixelFrame>

        {rawText && (
          <details>
            <summary className="cursor-pointer text-ink-dim">Voir le texte lu sur la photo</summary>
            <p className="raw-text mt-2">{rawText}</p>
          </details>
        )}
      </div>
    );
  }

  /* ---------- Choix de la photo ---------- */
  return (
    <div className="flex flex-col gap-7">
      <h1>Ticket de caisse</h1>
      <PixelFrame title="Photo du ticket" accent>
        <p className="mt-2">
          Prends le ticket en photo (ou choisis une photo existante). Bien à plat, bien éclairé, cadré serré : c’est là que
          la lecture marche le mieux.
        </p>
        <div className="mt-4">
          <label className="field-label" htmlFor="receipt-photo">Photo du ticket</label>
          <input
            id="receipt-photo"
            type="file"
            accept="image/*"
            className="px-input"
            onChange={(e) => {
              void readPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        {error && <p role="alert" className="mt-3 text-[var(--yellow)]">{error}</p>}
        <p className="mt-3 text-sm text-ink-dim">
          La lecture se fait sur ton appareil, sans envoyer la photo. Tu vérifies et corriges chaque ligne avant d’enregistrer.
        </p>
      </PixelFrame>
      <div className="flex flex-wrap gap-2">
        <PixelButton
          variant="secondary"
          onClick={() => {
            setRows([newRow()]);
            setRawText('');
            setPrintedTotal(null);
            setPhase({ name: 'review' });
          }}
        >
          Saisir les lignes à la main
        </PixelButton>
        <PixelLink to="/ajouter" variant="secondary">Retour</PixelLink>
      </div>
    </div>
  );
}
