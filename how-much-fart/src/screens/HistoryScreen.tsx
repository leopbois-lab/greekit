import { useState } from 'react';
import { Link } from 'react-router';
import { CATEGORY_IDS } from '../data/schema';
import { formatDate, formatKg } from '../engine/format';
import { filterPurchases, totalKg, type HistoryFilter, type Period } from '../engine/history';
import { CATEGORY_LABELS, CONFIDENCE_LABELS } from '../engine/types';
import { PixelButton, PixelFrame, PixelLink } from '../ui/components';
import { playSfx } from '../ui/sound';
import { usePurchases } from '../ui/store';

const PERIODS: Array<[Period, string]> = [['mois', 'Ce mois'], ['30-jours', '30 jours'], ['tout', 'Tout']];

export function HistoryScreen() {
  const { purchases, loaded, error, remove } = usePurchases();
  const [filter, setFilter] = useState<HistoryFilter>({ category: 'toutes', period: 'mois' });
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const rows = filterPurchases(purchases, filter, new Date());

  return (
    <div className="flex flex-col gap-7">
      <h1>Historique</h1>
      {error && <p role="alert">{error}</p>}

      <PixelFrame title="Filtres">
        <div className="chips mt-2" role="group" aria-label="Période">
          {PERIODS.map(([p, label]) => (
            <button
              key={p}
              type="button"
              className="chip"
              aria-pressed={filter.period === p}
              onClick={() => {
                playSfx('click');
                setFilter({ ...filter, period: p });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="field-label" htmlFor="cat">Catégorie</label>
          <select
            id="cat"
            className="px-select"
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value as HistoryFilter['category'] })}
          >
            <option value="toutes">Toutes</option>
            {CATEGORY_IDS.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </PixelFrame>

      <PixelFrame title="Total" accent>
        <p className="big-number mt-3" aria-live="polite">{formatKg(totalKg(rows))}</p>
        <p className="mt-1 text-ink-dim">
          {rows.length} achat{rows.length > 1 ? 's' : ''} sur la sélection
        </p>
      </PixelFrame>

      {loaded && rows.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p>Rien ici pour l’instant. Ajoute un achat pour commencer l’aventure !</p>
          <PixelLink to="/ajouter">+ Ajouter un achat</PixelLink>
        </div>
      )}

      <ul className="item-list">
        {rows.map((p) => (
          <li key={p.id}>
            <Link to={`/resultat/${p.id}`} className="history-row" onClick={() => playSfx('click')}>
              <span>
                <strong>{p.label}</strong>
                <br />
                <small className="text-ink-dim">
                  {formatDate(p.date)} · {CATEGORY_LABELS[p.category]} · {CONFIDENCE_LABELS[p.confidence].name.toLowerCase()}
                </small>
              </span>
              <span className="history-row__kg">{formatKg(p.kgCO2e)}</span>
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-1 bg-[var(--panel)] px-2 py-1">
              {confirmId === p.id ? (
                <>
                  <span className="text-sm">Supprimer cet achat ?</span>
                  <PixelButton
                    variant="danger"
                    onClick={() => {
                      void remove(p.id!);
                      setConfirmId(null);
                    }}
                  >
                    Oui
                  </PixelButton>
                  <PixelButton variant="secondary" onClick={() => setConfirmId(null)}>Non</PixelButton>
                </>
              ) : (
                <PixelButton
                  variant="secondary"
                  aria-label={`Supprimer ${p.label} du ${formatDate(p.date)}`}
                  onClick={() => setConfirmId(p.id!)}
                >
                  Supprimer
                </PixelButton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
