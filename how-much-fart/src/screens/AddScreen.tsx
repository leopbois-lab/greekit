import { PixelFrame, PixelLink } from '../ui/components';

export function AddScreen() {
  return (
    <div className="flex flex-col gap-7">
      <h1>Ajouter un achat</h1>
      <PixelFrame title="Saisie manuelle" accent>
        <p className="mt-2">Choisis une catégorie, un article, une quantité ou un poids.</p>
        <div className="mt-3">
          <PixelLink to="/ajouter/manuel">Commencer</PixelLink>
        </div>
      </PixelFrame>
      <PixelFrame title="Code-barres" accent>
        <p className="mt-2">Scanne un produit alimentaire avec la caméra : le plus précis.</p>
        <div className="mt-3">
          <PixelLink to="/ajouter/scan">Scanner</PixelLink>
        </div>
      </PixelFrame>
      <PixelFrame title="Ticket de caisse" accent>
        <p className="mt-2">Prends ton ticket en photo, vérifie les lignes, enregistre tout d’un coup.</p>
        <div className="mt-3">
          <PixelLink to="/ajouter/ticket">Lire un ticket</PixelLink>
        </div>
      </PixelFrame>
    </div>
  );
}
