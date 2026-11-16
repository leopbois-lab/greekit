import { useParams } from 'react-router';
import { formatCount, formatDate, formatKg } from '../engine/format';
import { CATEGORY_LABELS, CONFIDENCE_LABELS } from '../engine/types';
import { PixelFrame, PixelLink } from '../ui/components';
import { EquivalenceCards } from '../ui/EquivalenceCards';
import { usePurchases } from '../ui/store';
import { ComingSoon } from './ComingSoon';

export function ResultScreen() {
  const { id } = useParams();
  const loaded = usePurchases((s) => s.loaded);
  const purchase = usePurchases((s) => s.purchases.find((p) => String(p.id) === id));

  if (!loaded) return <p>Chargement…</p>;
  if (!purchase) return <ComingSoon title="Achat introuvable">Cet achat n’existe pas ou a été supprimé.</ComingSoon>;

  const confidence = CONFIDENCE_LABELS[purchase.confidence];
  return (
    <div className="flex flex-col gap-7">
      <h1>{purchase.label}</h1>
      <PixelFrame title="Empreinte" accent>
        <p className="big-number mt-3">{formatKg(purchase.kgCO2e)}</p>
        <p className="mt-2">
          {formatCount(purchase.quantity)} {purchase.unit} · {CATEGORY_LABELS[purchase.category]} ·{' '}
          {formatDate(purchase.date)}
        </p>
        <p className="mt-3">
          <span className={`badge badge--${purchase.confidence}`}>{confidence.name}</span>
        </p>
        <p className="mt-2 text-sm text-ink-dim">{confidence.explanation}</p>
        <p className="mt-3 text-sm">
          Source :{' '}
          <a href={purchase.source.url} target="_blank" rel="noreferrer">{purchase.source.name}</a>
          {purchase.dataYear ? ` — donnée ${purchase.dataYear}` : ''}
        </p>
        {purchase.note && <p className="mt-1 text-sm text-ink-dim">{purchase.note}</p>}
      </PixelFrame>

      <section aria-labelledby="eq-title">
        <h2 id="eq-title" className="mb-4">C’est comme…</h2>
        <EquivalenceCards kgCO2e={purchase.kgCO2e} />
      </section>

      <div className="flex flex-wrap gap-2">
        <PixelLink to="/ajouter/manuel">Ajouter un autre achat</PixelLink>
        <PixelLink to="/historique" variant="secondary">Historique</PixelLink>
      </div>
    </div>
  );
}
