import { EQUIVALENCES } from '../data';
import { computeEquivalences } from '../engine/equivalences';
import { formatCount } from '../engine/format';
import { Sprite } from './Sprite';
import { EQUIVALENCE_SPRITES } from './sprites';

/** Cartes animées : un total converti en équivalences sourcées. */
export function EquivalenceCards({ kgCO2e }: { kgCO2e: number }) {
  const { results, pending } = computeEquivalences(kgCO2e, EQUIVALENCES);
  return (
    <>
      <ul className="eq-grid list-none p-0">
        {results.map(({ equivalence: e, count }, i) => (
          <li key={e.id} className="eq-card" style={{ '--i': i } as React.CSSProperties}>
            {EQUIVALENCE_SPRITES[e.sprite] && <Sprite sprite={EQUIVALENCE_SPRITES[e.sprite]} scale={4} />}
            <p className="eq-card__count mt-2">
              {formatCount(count)}
              {e.mode === 'pourcentage' ? ' %' : ''}
            </p>
            <p className="text-sm">{e.mode === 'pourcentage' ? e.label.replace(/^% /, '') : e.label}</p>
            <details>
              <summary>Source</summary>
              {e.hypothesis && <p>{e.hypothesis}</p>}
              <p>
                <a href={e.source!.url} target="_blank" rel="noreferrer">{e.source!.name}</a>
                {e.dataYear ? ` (${e.dataYear})` : ''}
              </p>
            </details>
          </li>
        ))}
      </ul>
      {pending.length > 0 && (
        <div className="mt-4 text-sm text-ink-dim">
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
