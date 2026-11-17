import { toDateKey } from '../engine/format';
import { Button } from './components';
import { Icon } from './icons';
import { usePurchases } from './store';
import { useGame } from './useGame';

/**
 * « Rien acheté aujourd'hui » : valide la journée pour qu'elle compte dans les combos et les quêtes.
 * Un jour sans rien de saisi ne compte pas, ni en bien ni en mal.
 */
export function TodayToggle() {
  const game = useGame();
  const setNoPurchase = usePurchases((s) => s.setNoPurchase);
  const today = toDateKey(new Date());

  if (game.today && game.today.purchases > 0) {
    return (
      <p className="quest__done">
        <Icon name="check" size={20} />
        Journée saisie : {game.today.purchases} achat{game.today.purchases > 1 ? 's' : ''}
      </p>
    );
  }
  if (game.today?.noPurchase) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="quest__done">
          <Icon name="check" size={20} />
          Journée sans achat validée
        </p>
        <Button variant="secondary" onClick={() => void setNoPurchase(today, false)}>Annuler</Button>
      </div>
    );
  }
  return (
    <Button variant="secondary" sfx="coin" onClick={() => void setNoPurchase(today, true)}>
      Rien acheté aujourd’hui
    </Button>
  );
}
