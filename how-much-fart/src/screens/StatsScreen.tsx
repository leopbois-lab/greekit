import { useMemo, useState } from 'react';
import { formatKg } from '../engine/format';
import { buildBuckets, stackCategories, summarize, totalsByCategory, type StatsPeriod } from '../engine/stats';
import { CATEGORY_LABELS } from '../engine/types';
import { BucketTable, CategoryBars, categoryColor, percent, StackedColumns } from '../ui/charts';
import { ButtonLink, Card, EmptyState } from '../ui/components';
import { playSfx } from '../ui/sound';
import { usePurchases } from '../ui/store';
import { useBudget } from '../ui/useBudget';

const PERIODS: Array<[StatsPeriod, string, string]> = [
  ['mois', 'Ce mois', 'jour par jour, ce mois-ci'],
  ['30-jours', '30 jours', 'jour par jour, sur 30 jours'],
  ['annee', '12 mois', 'mois par mois, sur 12 mois'],
];

export function StatsScreen() {
  const purchases = usePurchases((s) => s.purchases);
  const { budgetKg } = useBudget();
  const [period, setPeriod] = useState<StatsPeriod>('mois');

  const { buckets, totals, stack, summary } = useMemo(() => {
    const b = buildBuckets(purchases, period, new Date());
    const t = totalsByCategory(b);
    return { buckets: b, totals: t, stack: stackCategories(t), summary: summarize(purchases, b, period) };
  }, [purchases, period]);

  const periodText = PERIODS.find(([p]) => p === period)![2];

  return (
    <div className="flex flex-col gap-6">
      <h1>Statistiques</h1>

      {/* Un seul filtre, au-dessus de tout ce qu'il pilote. */}
      <div className="chips" role="group" aria-label="Période">
        {PERIODS.map(([p, label]) => (
          <button
            key={p}
            type="button"
            className="chip"
            aria-pressed={period === p}
            onClick={() => {
              playSfx('click');
              setPeriod(p);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {summary.totalKg === 0 ? (
        <EmptyState title="Rien à compter sur cette période" action={<ButtonLink to="/ajouter">Ajouter un achat</ButtonLink>}>
          Dès ton premier achat, tu verras ici où ça se joue, catégorie par catégorie.
        </EmptyState>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi kpi--hero">
              <p className="small muted">Total émis</p>
              <p className="kpi__value">{formatKg(summary.totalKg)}</p>
            </div>
            <div className="kpi">
              <p className="small muted">Par jour avec achat</p>
              <p className="kpi__value">{formatKg(summary.perActiveDayKg)}</p>
              <p className="small muted">{summary.activeDays} jour{summary.activeDays > 1 ? 's' : ''}</p>
            </div>
            <div className="kpi">
              {period === 'mois' ? (
                <>
                  <p className="small muted">Part du budget du mois</p>
                  <p className="kpi__value">{percent(summary.totalKg / budgetKg)}</p>
                  <p className="small muted">sur {formatKg(budgetKg)}</p>
                </>
              ) : (
                summary.top && (
                  <>
                    <p className="small muted">Première catégorie</p>
                    <p className="kpi__value flex items-center gap-2">
                      <span className="cat-dot" style={{ background: categoryColor(summary.top.category) }} aria-hidden="true" />
                      {CATEGORY_LABELS[summary.top.category]}
                    </p>
                    <p className="small muted">{percent(summary.top.share)} du total</p>
                  </>
                )
              )}
            </div>
          </div>

          <Card title="Par catégorie">
            <p className="small muted mt-1">En CO2e, avec la part de chaque catégorie dans le total.</p>
            <div className="mt-4">
              <CategoryBars totals={totals} />
            </div>
          </Card>

          <Card title="Au fil du temps">
            <p className="small muted mt-1">En kg CO2e, {periodText}.</p>
            <div className="mt-3">
              <StackedColumns buckets={buckets} shown={stack.shown} others={stack.others} />
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer small muted">Voir le tableau des valeurs</summary>
              <div className="mt-2">
                <BucketTable buckets={buckets} shown={stack.shown} others={stack.others} />
              </div>
            </details>
          </Card>
        </>
      )}
    </div>
  );
}
