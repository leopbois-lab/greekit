import { PixelButton, PixelFrame } from '../ui/components';

const MODES = [
  { title: 'Saisie manuelle', step: 2, text: 'Choisis une catégorie, un article, une quantité ou un poids.' },
  { title: 'Code-barres', step: 3, text: 'Scanne un produit alimentaire avec la caméra.' },
  { title: 'Ticket de caisse', step: 4, text: 'Prends ton ticket en photo, vérifie les lignes, enregistre.' },
];

export function AddScreen() {
  return (
    <div className="flex flex-col gap-7">
      <h1>Ajouter un achat</h1>
      {MODES.map((m) => (
        <PixelFrame key={m.title} title={m.title}>
          <p className="mt-2">{m.text}</p>
          <div className="mt-3">
            <PixelButton disabled sfx={null}>Étape {m.step} — bientôt</PixelButton>
          </div>
        </PixelFrame>
      ))}
    </div>
  );
}
