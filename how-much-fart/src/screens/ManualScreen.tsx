import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { FACTORS } from '../data';
import { CATEGORY_IDS, type CategoryId, type Factor } from '../data/schema';
import { computePurchase, parseQuantity } from '../engine/compute';
import { formatKg, toDateKey } from '../engine/format';
import { pendingFactors, searchFactors } from '../engine/search';
import { CATEGORY_LABELS, CONFIDENCE_LABELS } from '../engine/types';
import { PixelButton, PixelFrame } from '../ui/components';
import { playSfx } from '../ui/sound';
import { usePurchases } from '../ui/store';

const UNIT_HINTS: Record<string, string> = {
  kg: 'Poids en kg (ex. 0,25 pour 250 g)',
  L: 'Volume en litres (ex. 0,33 pour une canette)',
  unité: 'Nombre d’articles',
  km: 'Distance en km',
  kWh: 'Énergie en kWh (voir la facture)',
  h: 'Durée en heures',
  Go: 'Volume en Go',
  '€': 'Prix payé en euros',
  journée: 'Nombre de journées',
  nuit: 'Nombre de nuits',
  'm² chauffé pendant 1 an': 'Surface chauffée en m² (compte une année entière)',
};

function perUnit(f: Factor): string {
  return f.value === null ? '' : `${formatKg(f.value)} / ${f.unit}`;
}

export function ManualScreen() {
  const navigate = useNavigate();
  const add = usePurchases((s) => s.add);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [query, setQuery] = useState('');
  const [factor, setFactor] = useState<Factor | null>(null);
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => (category ? searchFactors(FACTORS, category, query) : []), [category, query]);
  const ratios = useMemo(() => (category ? searchFactors(FACTORS, category, '', 'monetaire') : []), [category]);
  const pending = useMemo(() => (category ? pendingFactors(FACTORS, category) : []), [category]);

  const parsed = parseQuantity(quantity);
  const preview = factor && parsed !== null ? computePurchase(factor, parsed, date) : null;

  async function save() {
    if (!factor) return;
    if (parsed === null || !preview || !preview.ok) {
      setError('Indique une quantité supérieure à zéro (ex. 1,5).');
      playSfx('error');
      return;
    }
    setSaving(true);
    try {
      const saved = await add(preview.purchase);
      playSfx('coin');
      navigate(`/resultat/${saved.id}`);
    } catch {
      setError('Impossible d’enregistrer sur cet appareil. Réessaie dans un instant.');
      playSfx('error');
      setSaving(false);
    }
  }

  /* Étape 3 : quantité */
  if (factor) {
    const hint = UNIT_HINTS[factor.unit] ?? `Quantité (${factor.unit})`;
    return (
      <div className="flex flex-col gap-7">
        <h1>{factor.label}</h1>
        <PixelFrame title={factor.kind === 'monetaire' ? 'Par le prix' : 'Quantité'} accent>
          <p className="mt-2 text-ink-dim">
            {perUnit(factor)} — source : {factor.source?.name}
          </p>
          {factor.kind === 'monetaire' && (
            <p className="mt-2">
              Estimation par le prix : c’est un ordre de grandeur, utile quand on n’a rien de mieux.
            </p>
          )}
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            noValidate
          >
            <div>
              <label className="field-label" htmlFor="quantity">{hint}</label>
              <input
                id="quantity"
                className="px-input"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                value={quantity}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'quantity-error' : undefined}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError(null);
                }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="date">Date de l’achat</label>
              <input
                id="date"
                type="date"
                className="px-input"
                value={date}
                max={toDateKey(new Date())}
                onChange={(e) => setDate(e.target.value || toDateKey(new Date()))}
              />
            </div>
            <p aria-live="polite" className="min-h-6">
              {preview?.ok && (
                <>
                  ≈ <strong>{formatKg(preview.purchase.kgCO2e)}</strong> ·{' '}
                  {CONFIDENCE_LABELS[preview.purchase.confidence].name.toLowerCase()}
                </>
              )}
            </p>
            {error && <p id="quantity-error" role="alert" className="text-[var(--yellow)]">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <PixelButton type="submit" big sfx={null} disabled={saving}>Enregistrer</PixelButton>
              <PixelButton
                variant="secondary"
                onClick={() => {
                  setFactor(null);
                  setQuantity('');
                  setError(null);
                }}
              >
                Retour
              </PixelButton>
            </div>
          </form>
        </PixelFrame>
      </div>
    );
  }

  /* Étape 2 : article */
  if (category) {
    return (
      <div className="flex flex-col gap-7">
        <h1>{CATEGORY_LABELS[category]}</h1>
        <PixelFrame title="Quel article ?">
          <div className="mt-2">
            <label className="field-label" htmlFor="search">Rechercher</label>
            <input
              id="search"
              type="search"
              className="px-input"
              placeholder="ex. bœuf, jeans, TGV…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="mt-3 text-sm text-ink-dim" aria-live="polite">
            {items.length} article{items.length > 1 ? 's' : ''}
          </p>
          <ul className="item-list mt-1">
            {items.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="item-btn"
                  onClick={() => {
                    playSfx('click');
                    setFactor(f);
                  }}
                >
                  <span>{f.label}</span>
                  <small>{perUnit(f)}</small>
                </button>
              </li>
            ))}
          </ul>
          {items.length === 0 && <p className="mt-2">Rien trouvé. Essaie un autre mot, ou passe par le prix ci-dessous.</p>}
        </PixelFrame>

        <PixelFrame title="Pas dans la liste ?">
          {ratios.length > 0 ? (
            <>
              <p className="mt-2">En dernier recours, estime par le prix (très approximatif) :</p>
              <ul className="item-list mt-2">
                {ratios.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className="item-btn"
                      onClick={() => {
                        playSfx('click');
                        setFactor(f);
                      }}
                    >
                      <span>{f.label.replace(' (estimation par le prix)', '')}</span>
                      <small>{perUnit(f)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2">Pas encore d’estimation par le prix sourcée pour cette catégorie.</p>
          )}
          {pending.length > 0 && (
            <p className="mt-3 text-sm text-ink-dim">
              En attente d’une source fiable : {pending.map((f) => f.label.replace(' (estimation par le prix)', ' par le prix')).join(', ')}.
            </p>
          )}
        </PixelFrame>
        <div>
          <PixelButton
            variant="secondary"
            onClick={() => {
              setCategory(null);
              setQuery('');
            }}
          >
            Changer de catégorie
          </PixelButton>
        </div>
      </div>
    );
  }

  /* Étape 1 : catégorie */
  return (
    <div className="flex flex-col gap-7">
      <h1>Saisie manuelle</h1>
      <PixelFrame title="Quelle catégorie ?">
        <div className="cat-grid mt-3">
          {CATEGORY_IDS.map((c) => (
            <PixelButton key={c} variant="secondary" onClick={() => setCategory(c)}>
              {CATEGORY_LABELS[c]}
            </PixelButton>
          ))}
        </div>
      </PixelFrame>
    </div>
  );
}
