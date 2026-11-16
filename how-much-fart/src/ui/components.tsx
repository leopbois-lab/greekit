import { useEffect, useState } from 'react';
import { Link, type LinkProps } from 'react-router';
import {
  clampHealth,
  filledSegments,
  PLANET_LABELS,
  planetStateFromHealth,
} from '../engine/planet';
import { playSfx, type SfxName } from './sound';
import { Sprite } from './Sprite';
import { ICONS, planetSprite } from './sprites';
import { useSettings } from './store';

type Variant = 'primary' | 'secondary' | 'danger';

function btnClass(variant: Variant, big?: boolean, extra = ''): string {
  return [
    'px-btn',
    variant !== 'primary' ? `px-btn--${variant}` : '',
    big ? 'px-btn--big' : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  big?: boolean;
  /** Son joué au clic (« click » par défaut). */
  sfx?: SfxName | null;
}

export function PixelButton({
  variant = 'primary',
  big,
  sfx = 'click',
  className,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={btnClass(variant, big, className)}
      onClick={(e) => {
        if (sfx) playSfx(sfx);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function PixelLink({
  variant = 'primary',
  big,
  className,
  onClick,
  ...rest
}: LinkProps & { variant?: Variant; big?: boolean }) {
  return (
    <Link
      className={btnClass(variant, big, className)}
      onClick={(e) => {
        playSfx('click');
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function PixelFrame({
  title,
  accent,
  className = '',
  children,
}: {
  title?: string;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`px-frame ${accent ? 'px-frame--accent' : ''} ${className}`}>
      {title && <h2 className="px-frame__title">{title}</h2>}
      {children}
    </section>
  );
}

export function HealthBar({ health, segments = 10 }: { health: number; segments?: number }) {
  const h = clampHealth(health);
  const on = filledSegments(h, segments);
  const pct = Math.round(h * 100);
  return (
    <div
      className="hp"
      role="progressbar"
      aria-label="Vie de la planète"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${pct} % du budget du mois restant`}
    >
      <span className="hp__label" aria-hidden="true">PV</span>
      <div className="hp__track" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={`hp__seg ${i < on ? 'hp__seg--on' : ''}`} />
        ))}
      </div>
      <span className="hp__value" aria-hidden="true">{pct} %</span>
    </div>
  );
}

export function Planet({
  health,
  scale = 10,
  float = true,
}: {
  health: number;
  scale?: number;
  float?: boolean;
}) {
  const state = planetStateFromHealth(health);
  return (
    <Sprite
      sprite={planetSprite(state)}
      scale={scale}
      label={`Planète ${PLANET_LABELS[state].name.toLowerCase()}`}
      className={float ? 'anim-float' : ''}
    />
  );
}

export function MuteButton() {
  const muted = useSettings((s) => s.muted);
  const toggle = useSettings((s) => s.toggleMuted);
  return (
    <button
      type="button"
      className="px-btn px-btn--secondary px-btn--icon"
      aria-pressed={muted}
      aria-label="Couper le son"
      title={muted ? 'Son coupé' : 'Son activé'}
      onClick={() => {
        toggle();
        // Joué après la bascule : audible seulement quand on réactive le son.
        playSfx('toggle');
      }}
    >
      <Sprite sprite={muted ? ICONS.soundOff : ICONS.soundOn} scale={3} />
    </button>
  );
}

const PARTICLE_COLORS = ['var(--yellow)', 'var(--cyan)', 'var(--green)', 'var(--red)', 'var(--purple)'];

/** Gerbe de particules carrées ; se relance à chaque changement de `burst`. */
export function Particles({ burst }: { burst: number }) {
  if (burst === 0) return null;
  return (
    <span key={burst} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 40 + (i % 3) * 16;
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * dist)}px`,
          '--dy': `${Math.round(Math.sin(angle) * dist)}px`,
          '--c': PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        } as React.CSSProperties;
        return <span key={i} className="particle" style={style} />;
      })}
    </span>
  );
}

/** Bandeau « LEVEL UP » ; s'affiche à chaque changement de `trigger` (> 0). */
export function LevelUp({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(id);
  }, [trigger]);
  if (!visible) return null;
  return (
    <div className="levelup" role="status">
      <div key={trigger} className="levelup__text">LEVEL UP !</div>
    </div>
  );
}
