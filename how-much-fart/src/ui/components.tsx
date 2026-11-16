import { useEffect, useState } from 'react';
import { Link, type LinkProps } from 'react-router';
import { clampHealth, PLANET_LABELS, planetStateFromHealth } from '../engine/planet';
import { Icon } from './icons';
import { PlanetIllustration } from './illustrations';
import { playSfx, type SfxName } from './sound';
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

/** Barre de vie : part du budget du mois encore disponible. Sa couleur suit l'état de la planète. */
export function HealthBar({ health }: { health: number }) {
  const h = clampHealth(health);
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
      <div className="hp__track">
        {/* Tant qu'il reste de la vie, la barre reste visible. */}
        <div className="hp__fill" style={{ width: h === 0 ? '0%' : `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  );
}

/** Planète-mascotte : grande illustration vectorielle qui change avec la vie restante. */
export function Planet({ health, size = 220, float = true }: { health: number; size?: number; float?: boolean }) {
  const state = planetStateFromHealth(health);
  return (
    <div className={`planet ${float ? 'anim-float' : ''}`} style={{ width: size, maxWidth: '100%' }}>
      <PlanetIllustration state={state} title={`Planète ${PLANET_LABELS[state].name.toLowerCase()}`} />
    </div>
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
      <Icon name={muted ? 'soundOff' : 'soundOn'} />
    </button>
  );
}

const PARTICLE_COLORS = ['var(--cat-energie)', 'var(--cat-boissons)', 'var(--cat-alimentation)', 'var(--cat-transport)', 'var(--cat-electronique)'];

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
      <div key={trigger} className="levelup__text">Niveau supérieur !</div>
    </div>
  );
}
