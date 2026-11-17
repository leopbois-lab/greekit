import { Button } from './components';
import { Icon } from './icons';
import { useOnline, usePwa } from './usePwa';

/** Bandeaux discrets : hors ligne, nouvelle version disponible, app prête hors ligne. */
export function PwaStatus() {
  const online = useOnline();
  const { needRefresh, offlineReady, update, dismiss } = usePwa();

  return (
    <>
      {!online && (
        <p className="offline-bar" role="status">
          Hors ligne : la saisie, l’historique et les stats marchent ; le scan ne retrouve que les produits déjà vus.
        </p>
      )}
      {(needRefresh || offlineReady) && (
        <div className="toast" role="status">
          <Icon name={needRefresh ? 'star' : 'check'} size={22} />
          <p>{needRefresh ? 'Une nouvelle version est disponible.' : 'L’app est prête à fonctionner hors ligne.'}</p>
          <div className="toast__actions">
            {needRefresh && <Button onClick={update}>Mettre à jour</Button>}
            <Button variant="secondary" onClick={dismiss}>{needRefresh ? 'Plus tard' : 'OK'}</Button>
          </div>
        </div>
      )}
    </>
  );
}
