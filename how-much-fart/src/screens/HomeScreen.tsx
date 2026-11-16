import { formatKg } from '../engine/format';
import { PLANET_LABELS, planetStateFromHealth } from '../engine/planet';
import { HealthBar, PixelFrame, PixelLink, Planet } from '../ui/components';
import { usePurchases } from '../ui/store';
import { useBudget } from '../ui/useBudget';

export function HomeScreen() {
  const { health, emittedKg, budgetKg } = useBudget();
  const error = usePurchases((s) => s.error);
  const label = PLANET_LABELS[planetStateFromHealth(health)];
  const remainingKg = budgetKg - emittedKg;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Accueil</h1>

      <div className="hero">
        <Planet health={health} size={230} />
        <p className="state-pill">{label.name}</p>
        <p className="mt-1 text-[1.15rem] font-[650]">{label.message}</p>
      </div>

      <PixelFrame>
        <p className="small muted">{remainingKg >= 0 ? 'Il te reste ce mois-ci' : 'Budget du mois dépassé de'}</p>
        <p className="big-number tnum mt-1">{formatKg(Math.abs(remainingKg))}</p>
        <div className="mt-4">
          <HealthBar health={health} />
        </div>
        <div className="stat-row mt-2">
          <span>{formatKg(emittedKg)} émis</span>
          <span>Budget : {formatKg(budgetKg)}</span>
        </div>
        {remainingKg < 0 && (
          <p className="small muted mt-3">Pas de panique : le compteur repart à zéro le mois prochain.</p>
        )}
        {error && <p role="alert" className="small mt-3">{error}</p>}
      </PixelFrame>

      <div className="flex justify-center">
        <PixelLink to="/ajouter" big>Ajouter un achat</PixelLink>
      </div>
    </div>
  );
}
