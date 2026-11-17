import { EQUIVALENCES } from '../data';
import { computeEquivalences } from '../engine/equivalences';
import { formatYears } from '../engine/format';
import { Card } from './components';
import { EquivalenceArt } from './illustrations';

/** Temps qu'il faudrait à un arbre adulte pour absorber le CO2 d'un achat. */
export function TreeTime({ kgCO2e }: { kgCO2e: number }) {
  const tree = computeEquivalences(kgCO2e, EQUIVALENCES).results.find((r) => r.equivalence.mode === 'duree');
  if (!tree) return null;
  const { equivalence: e, count: years } = tree;
  return (
    <Card>
      <div className="tree-time">
        <div className="tree-time__art"><EquivalenceArt name="tree" /></div>
        <div>
          <p className="small muted">Le temps de l’arbre</p>
          <p className="tree-time__value">{formatYears(years)}</p>
          <p className="small">{e.label.replace(/^pour /, 'pour ').replace(/^./, (c) => c.toUpperCase())}.</p>
          <details className="mt-1">
            <summary className="cursor-pointer small muted">Source</summary>
            {e.hypothesis && <p className="small muted mt-1">{e.hypothesis}</p>}
            <p className="small mt-1">
              <a href={e.source!.url} target="_blank" rel="noreferrer">{e.source!.name}</a>
            </p>
          </details>
        </div>
      </div>
    </Card>
  );
}
