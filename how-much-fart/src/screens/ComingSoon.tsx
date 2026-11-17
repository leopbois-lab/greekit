import { ButtonLink, EmptyState } from '../ui/components';

/** Page d'information simple : écran introuvable, achat supprimé… */
export function ComingSoon({ title, children }: { title: string; step?: number; children: React.ReactNode }) {
  return (
    <EmptyState title={title} action={<ButtonLink to="/" variant="secondary">Retour à l’accueil</ButtonLink>}>
      {children}
    </EmptyState>
  );
}
