import { useEffect, useState } from 'react';
import { PLANET_LABELS, PLANET_STATES, planetStateFromHealth } from '../engine/planet';
import {
  HealthBar,
  LevelUp,
  MuteButton,
  Particles,
  PixelButton,
  PixelFrame,
  Planet,
} from '../ui/components';
import { SFX_NAMES, type SfxName } from '../ui/sound';
import { Sprite } from '../ui/Sprite';
import { COIN, HEART, ICONS, planetSprite, type IconName } from '../ui/sprites';
import { usePlanet } from '../ui/store';

const SWATCHES = [
  ['Vert', '--green'], ['Cyan', '--cyan'], ['Jaune', '--yellow'], ['Orange', '--orange'],
  ['Rouge', '--red'], ['Violet', '--purple'], ['Fumée', '--smoke'], ['Ciel', '--sky'],
  ['Panneau', '--panel'], ['Panneau 2', '--panel-2'], ['Encre', '--ink'], ['Accent', '--accent'],
] as const;

const SFX_LABELS: Record<SfxName, string> = {
  click: 'Clic', toggle: 'Bascule', coin: 'Pièce', levelUp: 'Level up', error: 'Erreur',
};

export function GalleryScreen() {
  const health = usePlanet((s) => s.health);
  const setHealth = usePlanet((s) => s.setHealth);
  const [burst, setBurst] = useState(0);
  const [level, setLevel] = useState(0);

  // L'aperçu ne doit pas « abîmer » la planète en quittant la galerie.
  useEffect(() => () => setHealth(1), [setHealth]);

  const state = planetStateFromHealth(health);

  return (
    <div className="flex flex-col gap-8">
      <h1>Galerie de composants</h1>

      <PixelFrame title="Planète et barre de vie" accent>
        <div className="mt-3 flex flex-col items-center gap-3">
          <Planet health={health} scale={8} />
          <p className="font-pixel text-accent text-[0.7rem]">{PLANET_LABELS[state].name}</p>
        </div>
        <div className="mt-3"><HealthBar health={health} /></div>
        <label className="mt-3 block">
          <span>Fais varier la vie : toute l’interface change de teinte.</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(health * 100)}
            onChange={(e) => setHealth(Number(e.target.value) / 100)}
          />
        </label>
        <div className="mt-2 flex flex-wrap items-end justify-center gap-4">
          {PLANET_STATES.map((s) => (
            <figure key={s} className="flex flex-col items-center gap-2">
              <Sprite sprite={planetSprite(s)} scale={3} label={`Planète ${PLANET_LABELS[s].name}`} />
              <figcaption className="text-sm text-ink-dim">{PLANET_LABELS[s].name}</figcaption>
            </figure>
          ))}
        </div>
      </PixelFrame>

      <PixelFrame title="Palette">
        <ul className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-4">
          {SWATCHES.map(([name, v]) => (
            <li key={v} className="text-sm">
              <div className="swatch" style={{ background: `var(${v})` }} />
              <span className="mt-1 block">{name}</span>
            </li>
          ))}
        </ul>
      </PixelFrame>

      <PixelFrame title="Polices">
        <h1 className="mt-3">Titre : Press Start 2P</h1>
        <h2 className="mt-2">Où ça ? Là-bas, près du bœuf !</h2>
        <h3 className="mt-2">ÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ àâçéèêëîïôùûüÿœæ « € »</h3>
        <p className="mt-3">
          Texte courant en Atkinson Hyperlegible : « Dès Noël, où un zéphyr haï me vêt de glaçons
          würmiens, je dîne d’exquis rôtis de bœuf au kir à l’aÿ d’âge mûr &amp; cætera ! »
        </p>
        <p className="mt-1"><strong>Gras</strong> · <span className="text-ink-dim">Texte secondaire</span> · 1 234,5 kg CO2e</p>
      </PixelFrame>

      <PixelFrame title="Boutons">
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PixelButton>Principal</PixelButton>
          <PixelButton variant="secondary">Secondaire</PixelButton>
          <PixelButton variant="danger" sfx="error">Danger</PixelButton>
          <PixelButton disabled>Désactivé</PixelButton>
          <PixelButton big sfx="coin">Gros bouton</PixelButton>
          <MuteButton />
        </div>
      </PixelFrame>

      <PixelFrame title="Cadres">
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          <PixelFrame title="Simple"><p className="mt-1">Cadre standard.</p></PixelFrame>
          <PixelFrame title="Accent" accent><p className="mt-1">Suit la couleur de la planète.</p></PixelFrame>
        </div>
      </PixelFrame>

      <PixelFrame title="Sprites">
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Sprite sprite={COIN} scale={4} label="Pièce" />
          <Sprite sprite={HEART} scale={4} label="Cœur" />
          {(Object.keys(ICONS) as IconName[]).map((name) => (
            <Sprite key={name} sprite={ICONS[name]} scale={4} label={`Icône ${name}`} />
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-dim">
          Grilles de pixels faites maison, rendues en SVG, agrandies par multiples entiers.
        </p>
      </PixelFrame>

      <PixelFrame title="Sons chiptune">
        <div className="mt-3 flex flex-wrap gap-2">
          {SFX_NAMES.map((name) => (
            <PixelButton key={name} variant="secondary" sfx={name}>{SFX_LABELS[name]}</PixelButton>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-dim">Générés en Web Audio, sans fichier. Le bouton muet les coupe tous.</p>
      </PixelFrame>

      <PixelFrame title="Animations">
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <Sprite sprite={COIN} scale={4} className="anim-coin" />
          <span className="relative inline-block">
            <PixelButton
              sfx="coin"
              onClick={() => setBurst((b) => b + 1)}
            >
              Particules
            </PixelButton>
            <Particles burst={burst} />
          </span>
          <PixelButton
            sfx="levelUp"
            onClick={() => setLevel((l) => l + 1)}
          >
            Level up
          </PixelButton>
        </div>
        <p className="mt-2 text-sm text-ink-dim">
          Les animations sont désactivées si ton appareil demande moins de mouvement.
        </p>
      </PixelFrame>

      <LevelUp trigger={level} />
    </div>
  );
}
