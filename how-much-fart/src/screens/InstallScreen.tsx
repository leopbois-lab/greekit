import { ButtonLink, Card } from '../ui/components';
import { Icon } from '../ui/icons';
import { isIos, isIosSafari, isStandalone } from '../ui/platform';
import { useInstallPrompt } from '../ui/usePwa';
import { Button } from '../ui/components';

/** Partager, tel qu'il apparaît dans Safari : un carré avec une flèche vers le haut. */
function ShareGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16M12 14V3.5M8.5 7 12 3.5 15.5 7" />
    </svg>
  );
}

export function InstallScreen() {
  const install = useInstallPrompt();
  const installed = isStandalone();
  const ios = isIos();

  return (
    <div className="flex flex-col gap-6">
      <h1>Installer l’app</h1>

      {installed ? (
        <Card>
          <p className="quest__done">
            <Icon name="check" size={20} />
            C’est fait : tu utilises déjà l’app installée.
          </p>
          <p className="muted mt-2">Elle marche hors ligne, et tes données restent sur cet appareil.</p>
        </Card>
      ) : (
        <p className="muted">
          Installée sur l’écran d’accueil, l’app s’ouvre en plein écran, marche hors ligne et ses données sont mieux protégées.
        </p>
      )}

      {!installed && install && (
        <Card title="En un geste">
          <p className="mt-2">Ton navigateur sait installer l’app directement.</p>
          <div className="mt-3">
            <Button onClick={() => void install()}>Installer</Button>
          </div>
        </Card>
      )}

      <Card title="Sur iPhone ou iPad">
        {ios && !isIosSafari() && !installed && (
          <p className="field-error mt-2">Sur iPhone, l’installation se fait depuis Safari : ouvre cette page dans Safari.</p>
        )}
        <ol className="steps mt-3">
          <li>
            Dans Safari, touche le bouton <strong>Partager</strong> <span className="inline-icon"><ShareGlyph /></span> (en bas
            de l’écran, ou en haut sur iPad).
          </li>
          <li>Fais défiler et choisis <strong>Sur l’écran d’accueil</strong>.</li>
          <li>Touche <strong>Ajouter</strong> : l’icône de la planète apparaît sur ton écran d’accueil.</li>
        </ol>
        <p className="small muted mt-3">
          La caméra peut te redemander l’autorisation la première fois que tu scannes depuis l’app installée.
        </p>
      </Card>

      <Card title="Sur Android">
        <ol className="steps mt-3">
          <li>Dans Chrome, ouvre le menu <strong>⋮</strong> en haut à droite.</li>
          <li>Choisis <strong>Installer l’application</strong> (ou « Ajouter à l’écran d’accueil »).</li>
        </ol>
      </Card>

      <Card title="Sur ordinateur">
        <p className="mt-2">
          Dans Chrome ou Edge, clique sur l’icône d’installation à droite de la barre d’adresse. Sur Mac avec Safari : menu
          <strong> Fichier → Ajouter au Dock</strong>.
        </p>
      </Card>

      <div>
        <ButtonLink to="/reglages" variant="secondary">Retour aux réglages</ButtonLink>
      </div>
    </div>
  );
}
