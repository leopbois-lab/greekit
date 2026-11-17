import { useParams } from 'react-router';
import { FACTORS } from '../data';
import { findAlternatives } from '../engine/alternatives';
import { formatCount, formatDate, formatKg } from '../engine/format';
import { CATEGORY_LABELS, CONFIDENCE_LABELS } from '../engine/types';
import { Card, ButtonLink } from '../ui/components';
import { percent } from '../ui/charts';
import { EquivalenceCards } from '../ui/EquivalenceCards';
import { TreeTime } from '../ui/TreeTime';
import { Icon } from '../ui/icons';
import { usePurchases } from '../ui/store';
import { ComingSoon } from './ComingSoon';

export function ResultScreen() {
  const { id } = useParams();
  const loaded = usePurchases((s) => s.loaded);
  const purchase = usePurchases((s) => s.purchases.find((p) => String(p.id) === id));

  if (!loaded) return <p>Chargement…</p>;
  if (!purchase) return <ComingSoon title="Achat introuvable">Cet achat n’existe pas ou a été supprimé.</ComingSoon>;

  const confidence = CONFIDENCE_LABELS[purchase.confidence];
  const alternatives = findAlternatives(purchase, FACTORS);
  const best = alternatives[0];
  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="small muted">
          <span
            aria-hidden="true"
            className="mr-2 inline-block h-[0.6rem] w-[0.6rem] rounded-full"
            style={{ background: `var(--cat-${purchase.category})` }}
          />
          {CATEGORY_LABELS[purchase.category]} · {formatDate(purchase.date)}
        </p>
        <h1 className="mt-1">{purchase.label}</h1>
      </header>

      <Card>
        <p className="small muted">Empreinte de cet achat</p>
        <p className="big-number tnum mt-1">{formatKg(purchase.kgCO2e)}</p>
        <p className="muted mt-2">
          pour {formatCount(purchase.quantity)} {purchase.unit}
        </p>
        <p className="mt-4">
          <span className={`badge badge--${purchase.confidence}`}>{confidence.name}</span>
        </p>
        <p className="small muted mt-2">{confidence.explanation}</p>
        <p className="small mt-4">
          Source :{' '}
          <a href={purchase.source.url} target="_blank" rel="noreferrer">{purchase.source.name}</a>
          {purchase.dataYear ? ` — donnée ${purchase.dataYear}` : ''}
        </p>
        {purchase.note && <p className="small muted mt-1">{purchase.note}</p>}
      </Card>

      <TreeTime kgCO2e={purchase.kgCO2e} />

      {best && (
        <Card title="Une piste pour la prochaine fois">
          <div className="alt mt-3">
            <span className="icon-tile"><Icon name="leaf" /></span>
            <div>
              <p>
                Avec <strong>{best.factor.label}</strong> à la place, la même quantité pèserait{' '}
                <strong>{formatKg(best.kgCO2e)}</strong> au lieu de {formatKg(purchase.kgCO2e)}, soit{' '}
                {percent(best.savedShare)} de moins.
              </p>
              <p className="small muted mt-1">
                Source : <a href={best.factor.source!.url} target="_blank" rel="noreferrer">{best.factor.source!.name}</a>
              </p>
              {alternatives.length > 1 && (
                <details className="mt-2">
                  <summary className="cursor-pointer small muted">
                    {alternatives.length - 1} autre{alternatives.length > 2 ? 's' : ''} option{alternatives.length > 2 ? 's' : ''} plus légère{alternatives.length > 2 ? 's' : ''}
                  </summary>
                  <ul className="mt-1 list-disc pl-5 small">
                    {alternatives.slice(1, 6).map((a) => (
                      <li key={a.factor.id}>
                        {a.factor.label} : {formatKg(a.kgCO2e)} ({percent(a.savedShare)} de moins)
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </Card>
      )}

      <section aria-labelledby="eq-title">
        <h2 id="eq-title" className="mb-4">C’est comme…</h2>
        <EquivalenceCards kgCO2e={purchase.kgCO2e} />
      </section>

      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/ajouter">Ajouter un autre achat</ButtonLink>
        <ButtonLink to="/historique" variant="secondary">Historique</ButtonLink>
      </div>
    </div>
  );
}
