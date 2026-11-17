import { EQUIVALENCES } from '../data';
import { computeEquivalences } from '../engine/equivalences';
import { formatCount } from '../engine/format';
import { EquivalenceArt } from './illustrations';

/** Cartes animées : un total converti en équivalences sourcées. */
export function EquivalenceCards({ kgCO2e }: { kgCO2e: number }) {
  // Les durées (temps de l'arbre) ont leur propre carte ; les équivalences sans source ne sont pas affichées.
  const results = computeEquivalences(kgCO2e, EQUIVALENCES).results.filter((r) => r.equivalence.mode !== 'duree');
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
    </>
  );
}
