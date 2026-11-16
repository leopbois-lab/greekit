import { formatKg } from '../engine/format';
import { PLANET_LABELS, planetStateFromHealth } from '../engine/planet';
import { HealthBar, PixelFrame, PixelLink, Planet } from '../ui/components';
import { usePurchases } from '../ui/store';
import { useBudget } from '../ui/useBudget';

export function HomeScreen() {
  const { health, emittedKg, budgetKg } = useBudget();
  const error = usePurchases((s) => s.error);
  const label = PLANET_LABELS[planetStateFromHealth(health)];
  return (
    <div className="flex flex-col items-stretch gap-6">
      <h1 className="sr-only">Accueil</h1>
      <div className="flex flex-col items-center gap-4 pt-4">
        <Planet health={health} scale={12} />
        <p className="font-pixel text-accent text-[0.8rem]">{label.name}</p>
      </div>
      <PixelFrame title="Budget du mois" accent>
        <div className="mt-2">
          <HealthBar health={health} />
        </div>
        <p className="mt-3">{label.message}</p>
        <p className="mt-1 text-ink-dim text-sm">
          {formatKg(emittedKg)} ce mois-ci sur un budget de {formatKg(budgetKg)}.
        </p>
        {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
      </PixelFrame>
      <div className="flex justify-center">
        <PixelLink to="/ajouter" big>+ Ajouter un achat</PixelLink>
      </div>
    </div>
  );
}
