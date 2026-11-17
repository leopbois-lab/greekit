import { ButtonLink, Card } from '../ui/components';
import { Icon, type IconName } from '../ui/icons';

const MODES: Array<{ to: string; icon: IconName; title: string; text: string; action: string; primary?: boolean }> = [
  { to: '/ajouter/scan', icon: 'barcode', title: 'Code-barres', text: 'Scanne un produit alimentaire avec la caméra : le plus précis.', action: 'Scanner', primary: true },
  { to: '/ajouter/ticket', icon: 'receipt', title: 'Ticket de caisse', text: 'Prends ton ticket en photo, vérifie les lignes, enregistre tout d’un coup.', action: 'Lire un ticket' },
  { to: '/ajouter/manuel', icon: 'pencil', title: 'Saisie manuelle', text: 'Choisis une catégorie, un article, une quantité ou un poids.', action: 'Commencer' },
];

export function AddScreen() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="mb-2">Ajouter un achat</h1>
      {MODES.map((m) => (
        <Card key={m.to}>
          <div className="option-card">
            <span className="icon-tile"><Icon name={m.icon} /></span>
            <div>
              <h2 className="card__title">{m.title}</h2>
              <p className="muted mt-1">{m.text}</p>
              <div className="mt-3">
                <ButtonLink to={m.to} variant={m.primary ? 'primary' : 'secondary'}>{m.action}</ButtonLink>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
