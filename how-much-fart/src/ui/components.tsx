import { useEffect, useState } from 'react';
import { Link, type LinkProps } from 'react-router';
import { clampHealth, PLANET_LABELS, planetStateFromHealth } from '../engine/planet';
import { Icon } from './icons';
import { EmptyArt, PlanetIllustration } from './illustrations';
import { playSfx, type SfxName } from './sound';
import { useSettings } from './store';

type Variant = 'primary' | 'secondary' | 'danger';

function btnClass(variant: Variant, big?: boolean, extra = ''): string {
  return [
    'btn',
    variant !== 'primary' ? `btn--${variant}` : '',
    big ? 'btn--big' : '',
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

export function Button({
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

export function ButtonLink({
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

export function Card({
  title,
  className = '',
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {title && <h2 className="card__title">{title}</h2>}
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
      className="btn btn--secondary btn--icon"
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

/** Bandeau de passage de niveau ; s'affiche à chaque changement de `trigger` (> 0). */
export function LevelUp({ trigger, level }: { trigger: number; level?: number }) {
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
      <div key={trigger} className="levelup__text">{level ? `Niveau ${level} !` : 'Niveau supérieur !'}</div>
    </div>
  );
}

/** Jauge fine générique (XP, quêtes, boss). `tone` choisit la couleur du remplissage. */
export function Meter({
  value,
  max,
  label,
  tone = 'brand',
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'brand' | 'good' | 'warn' | 'bad';
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      className={`meter meter--${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <div className="meter__fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

/** Écran ou bloc vide : illustration, message encourageant, action. */
export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__art"><EmptyArt /></div>
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}
