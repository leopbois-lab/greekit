import { formatKg } from '../engine/format';
import { BOSS_MIN_LOGGED_DAYS, XP, type Boss } from '../engine/game';
import { Card, Meter } from '../ui/components';
import { Icon, type IconName } from '../ui/icons';
import { BossArt, MedalArt } from '../ui/illustrations';
import { TodayToggle } from '../ui/TodayToggle';
import { useGame } from '../ui/useGame';

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function bossMessage(boss: Boss): string {
  const daysMissing = Math.max(0, boss.requiredDays - boss.loggedDays);
  if (boss.emittedKg > boss.budgetKg) {
    return 'Le Gros Nuage a pris l’avantage ce mois-ci. Chaque achat plus léger le fait reculer, et le mois prochain repart de zéro.';
  }
  if (daysMissing > 0) {
    return `Encore ${daysMissing} jour${daysMissing > 1 ? 's' : ''} à saisir pour que le combat compte. Tu es sous le budget : continue !`;
  }
  if (boss.projectedKg !== null && boss.projectedKg > boss.budgetKg) {
    return `À ce rythme, tu finirais vers ${formatKg(boss.projectedKg)} : c’est serré, mais jouable.`;
  }
  return 'Bien parti : tiens jusqu’à la fin du mois et le Gros Nuage est battu.';
}

export function QuestsScreen() {
  const game = useGame();
  const { boss } = game;
  const monthName = MONTH_NAMES[Number(boss.month.slice(5)) - 1];
  const bossRatio = boss.budgetKg > 0 ? boss.emittedKg / boss.budgetKg : 0;
  const unlocked = game.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="flex flex-col gap-6">
      <h1>Quêtes et succès</h1>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <p className="small muted">Ton niveau</p>
          <span className="pill" title="Jours sobres d’affilée">
            <Icon name="flame" size={20} />
            Combo {game.streak.current} j
          </span>
        </div>
        <p className="big-number">Niveau {game.level}</p>
        <div className="mt-4">
          <Meter value={game.xpIntoLevel} max={game.xpNeededForNext} label="Progression vers le niveau suivant" />
        </div>
        <div className="stat-row mt-2">
          <span>{game.xpIntoLevel} / {game.xpNeededForNext} XP avant le niveau {game.level + 1}</span>
          <span>Meilleur combo : {game.streak.best} j</span>
        </div>
      </Card>

      <Card title="Aujourd’hui">
        <div className="mt-3">
          <TodayToggle />
        </div>
        <p className="small muted mt-3">
          Un jour ne compte que s’il est saisi : un achat enregistré, ou « rien acheté » validé. Jour sobre = sous le budget
          du jour.
        </p>
      </Card>

      <Card title="Quêtes de la semaine">
        <div className="mt-2">
          {game.quests.map((q) => (
            <div key={q.id} className="quest">
              <div className="quest__head">
                <strong>{q.title}</strong>
                {q.done ? (
                  <span className="quest__done small">
                    <Icon name="check" size={18} />
                    Réussie · +{q.rewardXp} XP
                  </span>
                ) : (
                  <span className="small muted tnum">{q.progress} / {q.target}</span>
                )}
              </div>
              <p className="small muted">{q.description}</p>
              <Meter value={q.progress} max={q.target} label={`${q.title} : ${q.progress} sur ${q.target}`} tone={q.done ? 'good' : 'brand'} />
            </div>
          ))}
        </div>
        <p className="small muted mt-2">Nouvelles quêtes chaque lundi. {game.questsCompleted} réussie{game.questsCompleted > 1 ? 's' : ''} depuis le début.</p>
      </Card>

      <Card title={`Boss de ${monthName} : le Gros Nuage`}>
        <div className="boss mt-3">
          <div className="boss__art"><BossArt status={boss.status} /></div>
          <div>
            <p>{bossMessage(boss)}</p>
            <div className="mt-3">
              <Meter
                value={boss.emittedKg}
                max={boss.budgetKg}
                label="Part du budget du mois déjà émise"
                tone={bossRatio > 1 ? 'bad' : bossRatio > 0.75 ? 'warn' : 'good'}
              />
            </div>
            <div className="stat-row mt-2">
              <span>{formatKg(boss.emittedKg)} sur {formatKg(boss.budgetKg)}</span>
              <span>{boss.daysLeft} j restants</span>
            </div>
          </div>
        </div>
        <p className="small muted mt-3">
          Pour le battre : finir le mois sous le budget avec au moins {BOSS_MIN_LOGGED_DAYS} jours saisis ({boss.loggedDays} pour
          l’instant). Récompense : {XP.boss} XP. Boss déjà battus : {game.bossesBeaten}.
        </p>
      </Card>

      <Card title={`Succès · ${unlocked} / ${game.achievements.length}`}>
        <ul className="medal-grid mt-4">
          {game.achievements.map((a, i) => (
            <li key={a.id} className="medal-item">
              <MedalArt icon={a.icon as IconName} index={i} unlocked={a.unlocked} />
              <div>
                <strong>{a.title}</strong>
                <p className="small muted">{a.description}</p>
                <p className="small muted tnum">{a.unlocked ? 'Débloqué' : `${a.progress} / ${a.target}`}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
