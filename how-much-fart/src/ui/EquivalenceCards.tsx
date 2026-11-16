import { EQUIVALENCES } from '../data';
import { computeEquivalences } from '../engine/equivalences';
import { formatCount } from '../engine/format';
import { EquivalenceArt } from './illustrations';

/** Cartes animées : un total converti en équivalences sourcées. */
export function EquivalenceCards({ kgCO2e }: { kgCO2e: number }) {
  const { results, pending } = computeEquivalences(kgCO2e, EQUIVALENCES);
  return (
    <>
      <ul className="eq-grid list-none p-0">
        {results.map(({ equivalence: e, count }, i) => (
          <li key={e.id} className="eq-card" style={{ '--i': i } as React.CSSProperties}>
            <EquivalenceArt name={e.sprite} />
            <div className="eq-card__body">
              <p className="eq-card__count tnum">
                {formatCount(count)}
                {e.mode === 'pourcentage' ? ' %' : ''}
              </p>
              <p className="small">{e.mode === 'pourcentage' ? e.label.replace(/^% /, '') : e.label}</p>
              <details>
                <summary>Source</summary>
                {e.hypothesis && <p>{e.hypothesis}</p>}
                <p>
                  <a href={e.source!.url} target="_blank" rel="noreferrer">{e.source!.name}</a>
                  {e.dataYear ? ` (${e.dataYear})` : ''}
                </p>
              </details>
            </div>
          </li>
        ))}
      </ul>
      {pending.length > 0 && (
        <div className="mt-5 small muted">
          <p>En attente d’une source fiable (on ne force pas un chiffre) :</p>
          <ul className="mt-1 list-disc pl-5">
            {pending.map((e) => (
              <li key={e.id}>
                {e.label}
                {e.tooltip ? ` — ${e.tooltip}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
