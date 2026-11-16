import { MuteButton, PixelFrame, PixelLink } from '../ui/components';
import { useSettings } from '../ui/store';

export function SettingsScreen() {
  const muted = useSettings((s) => s.muted);
  return (
    <div className="flex flex-col gap-7">
      <h1>Réglages</h1>
      <PixelFrame title="Son">
        <div className="mt-2 flex items-center gap-3">
          <MuteButton />
          <p>{muted ? 'Son coupé.' : 'Son activé.'} Ce choix est mémorisé sur cet appareil.</p>
        </div>
      </PixelFrame>
      <PixelFrame title="Budget">
        <p className="mt-2 text-ink-dim">Le budget mensuel sera réglable ici (étapes 2 et 5).</p>
      </PixelFrame>
      <PixelFrame title="Données">
        <p className="mt-2 text-ink-dim">Export et import JSON : étape 6.</p>
      </PixelFrame>
      <PixelFrame title="Design system">
        <p className="mt-2">Tous les composants pixel, la palette, les polices et les sons.</p>
        <div className="mt-3">
          <PixelLink to="/galerie" variant="secondary">Ouvrir la galerie</PixelLink>
        </div>
      </PixelFrame>
    </div>
  );
}
