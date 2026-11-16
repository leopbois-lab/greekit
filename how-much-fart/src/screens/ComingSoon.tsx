import { PixelFrame, PixelLink } from '../ui/components';

export function ComingSoon({
  title,
  step,
  children,
}: {
  title: string;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1>{title}</h1>
      <PixelFrame title={step ? `Étape ${step}` : 'Oups'}>
        <p className="mt-2">{children}</p>
        {step && <p className="mt-2 text-ink-dim">Cet écran arrive à l’étape {step} du projet.</p>}
      </PixelFrame>
      <div>
        <PixelLink to="/" variant="secondary">Retour à l’accueil</PixelLink>
      </div>
    </div>
  );
}
