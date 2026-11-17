import { useState } from 'react';
import { Link } from 'react-router';
import { CATEGORY_IDS } from '../data/schema';
import { formatDate, formatKg } from '../engine/format';
import { filterPurchases, totalKg, type HistoryFilter, type Period } from '../engine/history';
import { CATEGORY_LABELS, CONFIDENCE_LABELS } from '../engine/types';
import { categoryColor } from '../ui/charts';
import { Button, ButtonLink, Card, EmptyState } from '../ui/components';
import { Icon } from '../ui/icons';
import { playSfx } from '../ui/sound';
import { usePurchases } from '../ui/store';

const PERIODS: Array<[Period, string]> = [['mois', 'Ce mois'], ['30-jours', '30 jours'], ['tout', 'Tout']];

export function HistoryScreen() {
  const { purchases, loaded, error, remove } = usePurchases();
  const [filter, setFilter] = useState<HistoryFilter>({ category: 'toutes', period: 'mois' });
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const rows = filterPurchases(purchases, filter, new Date());

  return (
    <div className="flex flex-col gap-6">
      <h1>Historique</h1>
      {error && <p role="alert">{error}</p>}

      <div className="flex flex-col gap-3">
        <div className="chips" role="group" aria-label="Période">
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
        <div>
          <label className="field-label" htmlFor="cat">Catégorie</label>
          <select
            id="cat"
            className="select"
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value as HistoryFilter['category'] })}
          >
            <option value="toutes">Toutes</option>
            {CATEGORY_IDS.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <p className="small muted">Total de la sélection (les lignes ci-dessous sont en CO2e)</p>
        <p className="big-number mt-1" aria-live="polite">{formatKg(totalKg(rows))}</p>
        <p className="muted mt-1">
          {rows.length} achat{rows.length > 1 ? 's' : ''}
        </p>
      </Card>

      {loaded && rows.length === 0 && (
        <EmptyState title="Rien ici pour l’instant" action={<ButtonLink to="/ajouter">Ajouter un achat</ButtonLink>}>
          Ajoute un achat pour commencer l’aventure, ou élargis la période.
        </EmptyState>
      )}

      <ul className="item-list">
        {rows.map((p) => (
          <li key={p.id}>
            <div className="history-item">
              <Link to={`/resultat/${p.id}`} className="history-row" onClick={() => playSfx('click')}>
                <span className="cat-dot" style={{ background: categoryColor(p.category) }} aria-hidden="true" />
                <span>
                  <strong>{p.label}</strong>
                  <br />
                  <span className="small muted">
                    {formatDate(p.date)} · {CATEGORY_LABELS[p.category]} · {CONFIDENCE_LABELS[p.confidence].name.toLowerCase()}
                  </span>
                </span>
                <span className="history-row__kg">{formatKg(p.kgCO2e).replace(' CO2e', '')}</span>
              </Link>
              <button
                type="button"
                className="btn btn--icon"
                aria-label={`Supprimer ${p.label} du ${formatDate(p.date)}`}
                onClick={() => setConfirmId(confirmId === p.id ? null : p.id!)}
              >
                <Icon name="trash" size={22} />
              </button>
            </div>
            {confirmId === p.id && (
              <div className="history-confirm">
                <span className="small">Supprimer cet achat ?</span>
                <Button
                  variant="danger"
                  onClick={() => {
                    void remove(p.id!);
                    setConfirmId(null);
                  }}
                >
                  Supprimer
                </Button>
                <Button variant="secondary" onClick={() => setConfirmId(null)}>Garder</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
