import { useEffect, useState } from 'react';
import { CATEGORY_LABELS } from '../engine/types';
import { CATEGORY_CHART_ORDER } from '../engine/stats';
import { PLANET_LABELS, PLANET_STATES, planetStateFromHealth } from '../engine/planet';
import { Button, Card, EmptyState, HealthBar, LevelUp, Meter, MuteButton, Planet } from '../ui/components';
import { EquivalenceCards } from '../ui/EquivalenceCards';
import { Icon, type IconName } from '../ui/icons';
import { BossArt, EQUIVALENCE_ART_NAMES, EquivalenceArt, MedalArt, PlanetIllustration } from '../ui/illustrations';
import { playSfx, SFX_NAMES, type SfxName } from '../ui/sound';
import { usePlanet } from '../ui/store';
import { useBudget } from '../ui/useBudget';

const NEUTRALS = [['Fond', '--bg'], ['Carte', '--surface'], ['Surface 2', '--surface-2'], ['Bordure', '--border'], ['Texte', '--ink'], ['Texte secondaire', '--ink-2'], ['Marque', '--brand']] as const;
const STATES = PLANET_STATES.map((s) => [PLANET_LABELS[s].name, `--state-${s}`] as const);
const ICON_NAMES: IconName[] = ['home', 'list', 'plus', 'chart', 'trophy', 'gear', 'soundOn', 'soundOff', 'trash', 'pencil', 'barcode', 'receipt', 'flame', 'star', 'calendar', 'compass', 'flag', 'leaf', 'check', 'lock'];
const SFX_LABELS: Record<SfxName, string> = { click: 'Clic', toggle: 'Bascule', coin: 'Validation', levelUp: 'Niveau', error: 'Erreur' };

function Swatches({ items }: { items: ReadonlyArray<readonly [string, string]> }) {
  return (
    <ul className="swatches mt-3">
      {items.map(([name, token]) => (
        <li key={token}>
          <div className="swatch" style={{ background: `var(${token})` }} />
          {name}
        </li>
      ))}
    </ul>
  );
}

export function GalleryScreen() {
  const { health } = useBudget();
  const setPreview = usePlanet((s) => s.setPreview);
  const [level, setLevel] = useState(0);

  // L'aperçu ne doit pas « abîmer » la planète en quittant la galerie.
  useEffect(() => () => setPreview(null), [setPreview]);

  return (
    <div className="flex flex-col gap-6">
      <h1>Galerie de composants</h1>

      <Card title="Planète et barre de vie">
        <div className="hero mt-2">
          <Planet health={health} size={190} />
          <p className="state-pill">{PLANET_LABELS[planetStateFromHealth(health)].name}</p>
        </div>
        <div className="mt-4"><HealthBar health={health} /></div>
        <label className="mt-4 block">
          <span className="small muted">Fais varier la vie : la mascotte, son halo et la barre changent ; le reste de l’interface reste neutre.</span>
          <input type="range" min={0} max={100} value={Math.round(health * 100)} onChange={(e) => setPreview(Number(e.target.value) / 100)} />
        </label>
        <div className="mt-2 flex flex-wrap items-end justify-center gap-4">
          {PLANET_STATES.map((s) => (
            <figure key={s} className="m-0 flex flex-col items-center gap-1">
              <div style={{ width: 84 }}><PlanetIllustration state={s} title={`Planète ${PLANET_LABELS[s].name}`} /></div>
              <figcaption className="small muted">{PLANET_LABELS[s].name}</figcaption>
            </figure>
          ))}
        </div>
      </Card>

      <Card title="Couleurs">
        <p className="small muted mt-1">Neutres et couleur de marque.</p>
        <Swatches items={NEUTRALS} />
        <p className="small muted mt-4">États de la planète (barre de vie, halo).</p>
        <Swatches items={STATES} />
        <p className="small muted mt-4">Catégories : une couleur fixe chacune, dans l’ordre des graphiques.</p>
        <Swatches items={CATEGORY_CHART_ORDER.map((c) => [CATEGORY_LABELS[c], `--cat-${c}`] as const)} />
      </Card>

      <Card title="Typographie">
        <h1 className="mt-3">Titre de page</h1>
        <h2 className="mt-2">Titre de section : où ça ? Là-bas, près du bœuf !</h2>
        <p className="mt-2">
          Texte courant en Atkinson Hyperlegible Next. « Dès Noël, où un zéphyr haï me vêt de glaçons würmiens, je dîne
          d’exquis rôtis de bœuf au kir à l’aÿ d’âge mûr &amp; cætera ! »
        </p>
        <p className="small muted mt-2">Texte secondaire · ÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ · 1 234,5 kg CO2e</p>
        <p className="big-number mt-2">14 kg CO2e</p>
      </Card>

      <Card title="Boutons et champs">
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button>Principal</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="danger" sfx="error">Danger</Button>
          <Button disabled>Désactivé</Button>
          <Button big sfx="coin">Grand bouton</Button>
          <MuteButton />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="g-input">Champ de saisie</label>
            <input id="g-input" className="input" placeholder="ex. 0,25" />
          </div>
          <div>
            <label className="field-label" htmlFor="g-select">Liste</label>
            <select id="g-select" className="select"><option>Alimentation</option><option>Transport</option></select>
          </div>
        </div>
        <p className="mt-4 flex flex-wrap gap-2">
          <span className="badge badge--precis">Précis</span>
          <span className="badge badge--estime">Estimé</span>
          <span className="badge badge--tres-approximatif">Très approximatif</span>
        </p>
        <div className="mt-4 grid gap-2">
          <Meter value={3} max={5} label="Exemple de jauge" />
          <Meter value={5} max={5} label="Exemple de jauge pleine" tone="good" />
        </div>
      </Card>

      <Card title="Cartes d’équivalence">
        <p className="small muted mt-1 mb-4">Exemple pour 100 kg CO2e.</p>
        <EquivalenceCards kgCO2e={100} />
      </Card>

      <Card title="Illustrations">
        <div className="art-grid mt-3">
          {EQUIVALENCE_ART_NAMES.map((name) => (
            <EquivalenceArt key={name} name={name} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div style={{ width: 120 }}><BossArt status="en-cours" /></div>
          <div style={{ width: 120 }}><BossArt status="victoire" /></div>
          <MedalArt icon="flame" index={0} unlocked />
          <MedalArt icon="star" index={4} unlocked />
          <MedalArt icon="trophy" index={3} unlocked={false} />
        </div>
        <EmptyState title="Écran vide">Un message encourageant et une action.</EmptyState>
      </Card>

      <Card title="Icônes">
        <div className="mt-3 flex flex-wrap gap-3">
          {ICON_NAMES.map((name) => (
            <span key={name} className="icon-tile" title={name}><Icon name={name} /></span>
          ))}
        </div>
      </Card>

      <Card title="Sons et animations">
        <div className="mt-3 flex flex-wrap gap-2">
          {SFX_NAMES.map((name) => (
            <Button key={name} variant="secondary" sfx={name}>{SFX_LABELS[name]}</Button>
          ))}
          <Button
            onClick={() => {
              playSfx('levelUp');
              setLevel((l) => l + 1);
            }}
            sfx={null}
          >
            Passage de niveau
          </Button>
        </div>
        <p className="small muted mt-2">Sons générés en Web Audio, sans fichier. Animations coupées si l’appareil demande moins de mouvement.</p>
      </Card>

      <LevelUp trigger={level} level={4} />
    </div>
  );
}
