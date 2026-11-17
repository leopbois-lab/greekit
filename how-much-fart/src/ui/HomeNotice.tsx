import { Link } from 'react-router';
import { shouldRemindBackup } from '../services/exportImport';
import { Button } from './components';
import { Icon } from './icons';
import { isIosSafari, isStandalone } from './platform';
import { usePurchases, useSettings } from './store';

/** Un seul conseil à la fois sur l'accueil : installer l'app (iPhone), sinon penser à sauvegarder. */
export function HomeNotice() {
  const count = usePurchases((s) => s.purchases.length);
  const { installTipDismissed, dismissInstallTip, lastBackupAt, setLastBackupAt } = useSettings();

  if (isIosSafari() && !isStandalone() && !installTipDismissed) {
    return (
      <aside className="notice" aria-label="Conseil">
        <Icon name="star" size={22} />
        <div>
          <p><strong>Installe l’app sur ton iPhone</strong> : plein écran, hors ligne, données mieux protégées.</p>
          <div className="notice__actions">
            <Link to="/installer" className="btn btn--secondary">Comment faire</Link>
            <Button variant="secondary" onClick={dismissInstallTip}>Plus tard</Button>
          </div>
        </div>
      </aside>
    );
  }
  if (shouldRemindBackup(count, lastBackupAt, Date.now())) {
    return (
      <aside className="notice" aria-label="Conseil">
        <Icon name="check" size={22} />
        <div>
          <p><strong>Pense à sauvegarder tes données</strong> : un fichier à garder, au cas où.</p>
          <div className="notice__actions">
            <Link to="/reglages" className="btn btn--secondary">Sauvegarder</Link>
            <Button variant="secondary" onClick={() => setLastBackupAt(Date.now())}>Plus tard</Button>
          </div>
        </div>
      </aside>
    );
  }
  return null;
}
