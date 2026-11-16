import { useEffect, useRef, useState } from 'react';
import type { CategoryId } from '../data/schema';
import { formatCount, formatKg } from '../engine/format';
import { niceTicks, type Bucket, type CategoryTotal } from '../engine/stats';
import { CATEGORY_LABELS } from '../engine/types';

/** Couleur fixe d'une catégorie, la même dans toute l'app. */
export const categoryColor = (c: CategoryId) => `var(--cat-${c})`;
const OTHERS_COLOR = 'var(--ink-3)';

/** Part en pourcentage entier ; « < 1 % » plutôt que « 0 % » pour une part non nulle. */
export const percent = (share: number) => (share > 0 && share < 0.01 ? '<\u00a01\u00a0%' : `${Math.round(share * 100)}\u00a0%`);

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** « 16 nov. » pour un jour, « nov. 2026 » pour un mois. */
export function bucketLabel(key: string): string {
  const [y, m, d] = key.split('-');
  return d ? `${Number(d)} ${MONTHS[Number(m) - 1]}` : `${MONTHS[Number(m) - 1]} ${y}`;
}
const shortLabel = (key: string) => (key.length === 7 ? MONTHS[Number(key.slice(5)) - 1].replace('.', '') : String(Number(key.slice(8))));

/* ------------------------------------------------------------------ */
/* Répartition par catégorie : barres classées, étiquetées directement */
/* ------------------------------------------------------------------ */

export function CategoryBars({ totals }: { totals: readonly CategoryTotal[] }) {
  const max = totals[0]?.kg ?? 0;
  return (
    <ul className="cat-bars">
      {totals.map((t) => (
        <li key={t.category}>
          <div className="cat-bars__head">
            <span className="cat-bars__name">
              <span className="cat-dot" style={{ background: categoryColor(t.category) }} aria-hidden="true" />
              {CATEGORY_LABELS[t.category]}
            </span>
            <span className="tnum whitespace-nowrap">
              <strong>{formatKg(t.kg).replace(' CO2e', '')}</strong> <span className="muted">· {percent(t.share)}</span>
            </span>
          </div>
          <div className="cat-bars__track" aria-hidden="true">
            <div className="cat-bars__bar" style={{ width: `${max > 0 ? (t.kg / max) * 100 : 0}%`, background: categoryColor(t.category) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Évolution dans le temps : colonnes empilées par catégorie           */
/* ------------------------------------------------------------------ */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface Segment {
  key: string;
  label: string;
  color: string;
  kg: number;
}

function segmentsOf(bucket: Bucket, shown: readonly CategoryId[], others: readonly CategoryId[]): Segment[] {
  const segs: Segment[] = shown.map((c) => ({ key: c, label: CATEGORY_LABELS[c], color: categoryColor(c), kg: bucket.byCategory[c] ?? 0 }));
  const rest = others.reduce((s, c) => s + (bucket.byCategory[c] ?? 0), 0);
  if (others.length > 0) segs.push({ key: 'autres', label: 'Autres', color: OTHERS_COLOR, kg: rest });
  return segs;
}

/** Rectangle dont seul le haut est arrondi (extrémité « donnée » de la colonne). */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${y + h}V${y + rr}a${rr} ${rr} 0 0 1 ${rr}-${rr}h${w - 2 * rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${y + h}z`;
}

export function StackedColumns({
  buckets,
  shown,
  others,
}: {
  buckets: readonly Bucket[];
  shown: readonly CategoryId[];
  others: readonly CategoryId[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const H = 220;
  const pad = { top: 12, right: 4, bottom: 24, left: 40 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = H - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...buckets.map((b) => b.total), 0));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const slot = buckets.length > 0 ? innerW / buckets.length : 0;
  const barW = Math.max(2, Math.min(24, slot - 3));
  // Une étiquette d'abscisse toutes les N colonnes, pour qu'elles ne se chevauchent jamais.
  const every = Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(innerW / 34))));
  const legend = segmentsOf({ key: '', total: 0, byCategory: {} }, shown, others);
  const activeBucket = active !== null ? buckets[active] : null;

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg height={H} role="group" aria-label="Émissions par période, empilées par catégorie">
          {ticks.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="chart__tick" x={pad.left - 6} y={y(t) + 4} textAnchor="end">{formatCount(t)}</text>
            </g>
          ))}
          {buckets.map((b, i) => {
            const x0 = pad.left + i * slot + (slot - barW) / 2;
            const segs = segmentsOf(b, shown, others).filter((s) => s.kg > 0);
            let acc = 0;
            return (
              <g key={b.key}>
                {segs.map((s, j) => {
                  const yTop = y(acc + s.kg);
                  const yBottom = y(acc);
                  acc += s.kg;
                  // 2 px de fond entre deux segments : c'est le vide qui les sépare, pas un contour.
                  const h = Math.max(1, yBottom - yTop - (j > 0 ? 2 : 0));
                  return j === segs.length - 1 ? (
                    <path key={s.key} d={topRounded(x0, yTop, barW, h, 4)} fill={s.color} />
                  ) : (
                    <rect key={s.key} x={x0} y={yTop} width={barW} height={h} fill={s.color} />
                  );
                })}
                {i % every === 0 && (
                  <text className="chart__tick" x={pad.left + i * slot + slot / 2} y={H - 6} textAnchor="middle">{shortLabel(b.key)}</text>
                )}
                {/* Zone de survol plus large que la colonne ; accessible au clavier. */}
                <rect
                  className="chart__hit"
                  data-active={active === i}
                  x={pad.left + i * slot}
                  y={pad.top}
                  width={slot}
                  height={innerH}
                  rx="4"
                  tabIndex={0}
                  role="img"
                  aria-label={`${bucketLabel(b.key)} : ${formatKg(b.total)}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {activeBucket && active !== null && (
        <div
          className="chart__tooltip"
          role="status"
          style={{ left: Math.min(Math.max(0, pad.left + active * slot + slot / 2 - 88), Math.max(0, width - 176)) }}
        >
          <div className="muted">{bucketLabel(activeBucket.key)}</div>
          <div className="chart__tooltip-total tnum">{formatKg(activeBucket.total)}</div>
          {segmentsOf(activeBucket, shown, others)
            .filter((s) => s.kg > 0)
            .map((s) => (
              <div key={s.key} className="chart__tooltip-row">
                <span>
                  <span className="chart__key" style={{ background: s.color }} />
                  {s.label}
                </span>
                <strong className="tnum">{formatKg(s.kg)}</strong>
              </div>
            ))}
        </div>
      )}
      {legend.length > 1 && (
        <ul className="legend">
          {legend.map((s) => (
            <li key={s.key}>
              <span className="legend__swatch" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Vue tableau : toutes les valeurs du graphique, lisibles sans survol. */
export function BucketTable({ buckets, shown, others }: { buckets: readonly Bucket[]; shown: readonly CategoryId[]; others: readonly CategoryId[] }) {
  const header = segmentsOf({ key: '', total: 0, byCategory: {} }, shown, others);
  const rows = buckets.filter((b) => b.total > 0);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Période</th>
            {header.map((s) => (
              <th key={s.key} scope="col">{s.label}</th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.key}>
              <td>{bucketLabel(b.key)}</td>
              {segmentsOf(b, shown, others).map((s) => (
                <td key={s.key}>{s.kg > 0 ? formatKg(s.kg).replace(' CO2e', '') : '—'}</td>
              ))}
              <td><strong>{formatKg(b.total).replace(' CO2e', '')}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
