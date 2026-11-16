import type { PlanetState } from '../engine/planet';

/**
 * Illustrations vectorielles faites maison : aplats de couleurs vives, formes simples, pas de contour.
 * Leurs couleurs sont fixes (elles ne suivent pas le thème) : ce sont des images.
 */

const INK = '#1f2430';

/* ------------------------------------------------------------------ */
/* Planète-mascotte                                                    */
/* ------------------------------------------------------------------ */

const PLANET_LOOK: Record<PlanetState, { ocean: string; land: string; smoke?: string }> = {
  verdoyante: { ocean: '#2f9bf0', land: '#2fc46b' },
  fraiche: { ocean: '#3ea4ee', land: '#6fcf5a' },
  tiede: { ocean: '#5aa9d6', land: '#dcc24a' },
  enfumee: { ocean: '#7f9db3', land: '#c59a52', smoke: '#b3b9c6' },
  suffocante: { ocean: '#8b93a3', land: '#a58b6f', smoke: '#8a90a0' },
};

function Face({ state }: { state: PlanetState }) {
  const eyesClosed = state === 'suffocante';
  const mouth: Record<PlanetState, string> = {
    verdoyante: 'M86 121q14 15 28 0',
    fraiche: 'M88 122q12 10 24 0',
    tiede: 'M90 126h20',
    enfumee: 'M88 130q12-10 24 0',
    suffocante: 'M86 128q7-7 14 0t14 0',
  };
  return (
    <g>
      {eyesClosed ? (
        <path d="M76 104q7 6 14 0M110 104q7 6 14 0" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      ) : (
        <>
          <ellipse cx="83" cy="103" rx="6.5" ry="8.5" fill={INK} />
          <ellipse cx="117" cy="103" rx="6.5" ry="8.5" fill={INK} />
          <circle cx="85.5" cy="99.5" r="2.4" fill="#fff" />
          <circle cx="119.5" cy="99.5" r="2.4" fill="#fff" />
        </>
      )}
      <path d={mouth[state]} stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {(state === 'verdoyante' || state === 'fraiche') && (
        <>
          <circle cx="69" cy="118" r="7" fill="#ff9db8" />
          <circle cx="131" cy="118" r="7" fill="#ff9db8" />
        </>
      )}
    </g>
  );
}

export function PlanetIllustration({ state, title }: { state: PlanetState; title?: string }) {
  const look = PLANET_LOOK[state];
  const clip = `planet-clip-${state}`;
  return (
    <svg viewBox="0 0 200 200" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={clip}>
          <circle cx="100" cy="100" r="72" />
        </clipPath>
      </defs>
      <circle cx="100" cy="100" r="72" fill={look.ocean} />
      <g clipPath={`url(#${clip})`}>
        <path fill={look.land} d="M44 74c6-26 36-40 60-28 14 8 8 26-8 30-12 4-12 20-28 22-16 2-28-8-24-24Z" />
        <path fill={look.land} d="M130 82c16-8 38 4 40 24 2 18-16 30-30 22-14-8-22-38-10-46Z" />
        <path fill={look.land} d="M66 132c16-10 40-2 42 16 2 16-16 30-32 22-16-8-24-30-10-38Z" />
        <circle cx="142" cy="52" r="10" fill={look.land} />
        {/* Ombre propre : un croissant plus sombre, en aplat. */}
        <path d="M100 172a72 72 0 0 0 72-72 92 92 0 0 1-72 72Z" fill="#000" opacity="0.14" />
        <path d="M100 172a72 72 0 0 0 72-72 120 120 0 0 1-72 72Z" fill="#000" opacity="0.08" />
        <ellipse cx="72" cy="58" rx="20" ry="9" fill="#fff" opacity="0.22" transform="rotate(-28 72 58)" />
      </g>
      <Face state={state} />

      {state === 'verdoyante' && (
        <g>
          <path d="M100 30V16" stroke="#1e9b53" strokeWidth="4" strokeLinecap="round" />
          <path d="M100 20c-2-12-14-14-20-10 2 10 10 14 20 10Z" fill="#2fc46b" />
          <path d="M100 18c4-10 16-10 20-4-4 8-12 10-20 4Z" fill="#57d98a" />
          <path d="m168 44 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#ffd23f" />
          <path d="m30 132 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd23f" />
        </g>
      )}
      {state === 'fraiche' && (
        // Petit nuage posé sur la planète (blanc sur bleu, lisible en clair comme en sombre).
        <g fill="#fff">
          <circle cx="132" cy="56" r="11" />
          <circle cx="147" cy="60" r="9" />
          <circle cx="119" cy="62" r="8" />
          <rect x="118" y="59" width="31" height="11" rx="5.5" />
        </g>
      )}
      {state === 'tiede' && (
        <g>
          <path d="M150 66c6 9 10 13 10 19a10 10 0 0 1-20 0c0-6 4-10 10-19Z" fill="#6ec8ff" />
          <circle cx="36" cy="44" r="13" fill="#ffc531" />
        </g>
      )}
      {look.smoke && (
        <g fill={look.smoke}>
          <circle cx="40" cy="58" r="16" />
          <circle cx="58" cy="46" r="13" />
          <circle cx="26" cy="74" r="11" />
          <circle cx="160" cy="140" r="17" />
          <circle cx="176" cy="124" r="12" />
          <circle cx="142" cy="154" r="11" />
          {state === 'suffocante' && (
            <>
              <circle cx="150" cy="40" r="15" />
              <circle cx="168" cy="54" r="11" />
              <circle cx="44" cy="150" r="15" />
              <circle cx="28" cy="134" r="10" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Cartes d'équivalence                                                */
/* ------------------------------------------------------------------ */

interface Art {
  tint: string;
  svg: React.ReactNode;
}

const ART: Record<string, Art> = {
  car: {
    tint: '#ffe3de',
    svg: (
      <>
        <path d="M28 48 36 31h25l10 17z" fill="#f0503c" />
        <rect x="13" y="46" width="70" height="23" rx="9" fill="#f0503c" />
        <path d="M34 46 39 35h9v11zM52 35h7l6 11H52z" fill="#bfe6ff" />
        <rect x="77" y="52" width="6" height="7" rx="2" fill="#ffd23f" />
        <circle cx="32" cy="70" r="9.5" fill={INK} />
        <circle cx="65" cy="70" r="9.5" fill={INK} />
        <circle cx="32" cy="70" r="3.6" fill="#c9ced8" />
        <circle cx="65" cy="70" r="3.6" fill="#c9ced8" />
      </>
    ),
  },
  train: {
    tint: '#ddf1ff',
    svg: (
      <>
        <rect x="6" y="75" width="84" height="3.5" rx="1.75" fill="#9aa3b2" />
        <path d="M10 32h52c15 0 26 13 26 27v7H10z" fill="#2f7fe6" />
        <rect x="10" y="53" width="78" height="5" fill="#fff" />
        <rect x="16" y="38" width="11" height="10" rx="2.5" fill="#cfeaff" />
        <rect x="31" y="38" width="11" height="10" rx="2.5" fill="#cfeaff" />
        <rect x="46" y="38" width="11" height="10" rx="2.5" fill="#cfeaff" />
        <path d="M62 38h6c7 0 11 5 13 10H62z" fill="#cfeaff" />
        <circle cx="26" cy="70" r="5.5" fill={INK} />
        <circle cx="46" cy="70" r="5.5" fill={INK} />
        <circle cx="72" cy="70" r="5.5" fill={INK} />
      </>
    ),
  },
  plane: {
    tint: '#e3ecff',
    svg: (
      <>
        <path d="M14 45 9 25h11l10 18z" fill="#5b6cf0" />
        <path d="M9 50c0-6 6-8 14-8h46c11 0 20 4 20 8s-9 8-20 8H23c-8 0-14-2-14-8Z" fill="#fff" />
        <path d="M40 52h17L45 78h-9z" fill="#5b6cf0" />
        <path d="M75 44c6 1 10 3 12 5H75z" fill={INK} opacity="0.75" />
        <circle cx="36" cy="48" r="2.3" fill="#5b6cf0" />
        <circle cx="46" cy="48" r="2.3" fill="#5b6cf0" />
        <circle cx="56" cy="48" r="2.3" fill="#5b6cf0" />
        <circle cx="66" cy="48" r="2.3" fill="#5b6cf0" />
      </>
    ),
  },
  cow: {
    tint: '#ffe9f1',
    svg: (
      <>
        <ellipse cx="22" cy="36" rx="9" ry="5.5" fill="#f3efe9" transform="rotate(-20 22 36)" />
        <ellipse cx="74" cy="36" rx="9" ry="5.5" fill="#f3efe9" transform="rotate(20 74 36)" />
        <ellipse cx="48" cy="46" rx="23" ry="21" fill="#fff" />
        <path d="M29 36c6-9 17-5 15 5-2 8-15 7-15-5Z" fill={INK} />
        <ellipse cx="48" cy="61" rx="17" ry="11.5" fill="#ff9ec0" />
        <circle cx="42" cy="61" r="2.6" fill="#c4487a" />
        <circle cx="54" cy="61" r="2.6" fill="#c4487a" />
        <circle cx="40" cy="44" r="3.2" fill={INK} />
        <circle cx="57" cy="44" r="3.2" fill={INK} />
      </>
    ),
  },
  steak: {
    tint: '#ffe1e1',
    svg: (
      <>
        <path d="M17 50c-2-20 18-31 38-27 20 4 31 20 24 38-7 16-29 20-45 13-11-5-16-13-17-24Z" fill="#fff1ea" />
        <path d="M23 50c-1-15 14-24 31-21 16 3 25 16 20 30-6 13-23 16-37 11-9-4-13-11-14-20Z" fill="#e5484d" />
        <circle cx="45" cy="48" r="7" fill="#fff1ea" />
        <path d="M59 40q6 7 2 15M33 58q6 5 13 3" stroke="#ff9a9a" strokeWidth="3" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  screen: {
    tint: '#e6e3ff',
    svg: (
      <>
        <rect x="42" y="66" width="12" height="9" fill="#9aa3b2" />
        <rect x="31" y="74" width="34" height="5" rx="2.5" fill="#9aa3b2" />
        <rect x="13" y="20" width="70" height="47" rx="7" fill={INK} />
        <rect x="18" y="25" width="60" height="37" rx="3.5" fill="#6c5ce7" />
        <path d="m43 34 15 9.5-15 9.5z" fill="#fff" />
      </>
    ),
  },
  battery: {
    tint: '#ddf7e7',
    svg: (
      <>
        <rect x="40" y="13" width="16" height="9" rx="3" fill={INK} />
        <rect x="29" y="20" width="38" height="62" rx="9" fill={INK} />
        <rect x="34" y="44" width="28" height="33" rx="5" fill="#2fc46b" />
        <path d="M51 26 39 48h8l-3 16 13-22h-8z" fill="#ffd23f" />
      </>
    ),
  },
  phone: {
    tint: '#ddf1ff',
    svg: (
      <>
        <rect x="29" y="12" width="38" height="72" rx="9" fill={INK} />
        <rect x="33" y="18" width="30" height="56" rx="4.5" fill="#41b6f5" />
        <rect x="37" y="24" width="9" height="9" rx="2.5" fill="#fff" opacity="0.9" />
        <rect x="50" y="24" width="9" height="9" rx="2.5" fill="#fff" opacity="0.9" />
        <rect x="37" y="37" width="9" height="9" rx="2.5" fill="#fff" opacity="0.9" />
        <rect x="50" y="37" width="9" height="9" rx="2.5" fill="#ffd23f" />
        <rect x="43" y="77.5" width="10" height="2.6" rx="1.3" fill="#8a8f99" />
      </>
    ),
  },
  jeans: {
    tint: '#dce9ff',
    svg: (
      <>
        <path d="M25 15h46l4 68H54l-6-39-6 39H21z" fill="#3d6fd9" />
        <rect x="25" y="15" width="46" height="8.5" fill="#2c54ad" />
        <path d="M30 29q6 8 12 0M54 29q6 8 12 0" stroke="#ffd23f" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <circle cx="48" cy="19.2" r="2.2" fill="#ffd23f" />
      </>
    ),
  },
  shower: {
    tint: '#ddf4ff',
    svg: (
      <>
        <path d="M24 84V32c0-14 22-14 26-3" stroke="#9aa3b2" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M34 36h36l-7-9H41z" fill="#5a606c" />
        {[42, 52, 62].map((x) => (
          <rect key={`a${x}`} x={x - 2} y="43" width="4" height="9" rx="2" fill="#41b6f5" />
        ))}
        {[47, 57].map((x) => (
          <rect key={`b${x}`} x={x - 2} y="56" width="4" height="9" rx="2" fill="#41b6f5" />
        ))}
        {[42, 52, 62].map((x) => (
          <rect key={`c${x}`} x={x - 2} y="69" width="4" height="9" rx="2" fill="#41b6f5" />
        ))}
      </>
    ),
  },
  flame: {
    tint: '#ffebd6',
    svg: (
      <>
        <path d="M48 11c4 17 25 25 25 46 0 16-11 28-25 28S23 73 23 57c0-12 8-18 12-29 4 6 6 8 9 10 0-10 2-18 4-27Z" fill="#ff7a1a" />
        <path d="M48 46c6 9 13 13 13 23 0 8-6 14-13 14s-13-6-13-14c0-9 8-13 13-23Z" fill="#ffd23f" />
      </>
    ),
  },
  fuel: {
    tint: '#fff1cc',
    svg: (
      <>
        <rect x="17" y="80" width="46" height="5" rx="2.5" fill={INK} />
        <rect x="22" y="22" width="36" height="60" rx="7" fill="#f2a516" />
        <rect x="28" y="28" width="24" height="17" rx="3.5" fill="#fff" />
        <path d="M40 53c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15Z" fill={INK} opacity="0.85" />
        <path d="M58 40h7c4 0 7 3 7 7v19c0 7 9 7 9 0V38l-8-8" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  tree: {
    tint: '#ddf7e7',
    svg: (
      <>
        <ellipse cx="48" cy="84" rx="25" ry="4" fill="#bfe8cf" />
        <rect x="43" y="54" width="10" height="29" rx="3" fill="#9a6b3f" />
        <circle cx="31" cy="48" r="15" fill="#27ae60" />
        <circle cx="65" cy="48" r="15" fill="#27ae60" />
        <circle cx="48" cy="35" r="23" fill="#2fc46b" />
        <circle cx="41" cy="28" r="6.5" fill="#7be0a0" opacity="0.85" />
      </>
    ),
  },
  ice: {
    tint: '#ddf1ff',
    svg: (
      <>
        <rect x="0" y="62" width="96" height="34" fill="#41b6f5" />
        <path d="M30 62h42L60 86l-16-4z" fill="#bfe6ff" opacity="0.75" />
        <path d="M30 62 42 27l10 13 8-17 12 39z" fill="#fff" />
        <path d="m52 40 8-17 12 39H58z" fill="#d4ecff" />
        <path d="M8 74q6-5 12 0t12 0M64 80q6-5 12 0t12 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.8" />
      </>
    ),
  },
  balloon: {
    tint: '#ffe1e6',
    svg: (
      <>
        <path d="M48 66c-7 9 6 12 0 22" stroke="#5a606c" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <ellipse cx="48" cy="38" rx="23" ry="27" fill="#f0457a" />
        <path d="M43 64h10l-5 7z" fill="#c92e5f" />
        <ellipse cx="39" cy="27" rx="5" ry="8.5" fill="#fff" opacity="0.5" transform="rotate(18 39 27)" />
      </>
    ),
  },
  target: {
    tint: '#ffe3de',
    svg: (
      <>
        <circle cx="46" cy="52" r="34" fill="#f0503c" />
        <circle cx="46" cy="52" r="24" fill="#fff" />
        <circle cx="46" cy="52" r="14" fill="#f0503c" />
        <circle cx="46" cy="52" r="5" fill="#fff" />
        <path d="M46 52 78 20" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="m72 14 4 10 10 4-6-12z" fill="#ffd23f" />
      </>
    ),
  },
  flag: {
    tint: '#e6ecff',
    svg: (
      <>
        <rect x="20" y="13" width="5.5" height="72" rx="2.75" fill="#5a606c" />
        <rect x="25" y="18" width="18" height="36" fill="#2f5fe0" />
        <rect x="43" y="18" width="18" height="36" fill="#fff" />
        <path d="M61 18h14a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H61z" fill="#f0503c" />
      </>
    ),
  },
};

/** Illustration d'une carte d'équivalence, sur son aplat de couleur. */
export function EquivalenceArt({ name }: { name: string }) {
  const art = ART[name];
  if (!art) return null;
  return (
    <div className="eq-card__art" style={{ '--tint': art.tint } as React.CSSProperties}>
      <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">{art.svg}</svg>
    </div>
  );
}

export const EQUIVALENCE_ART_NAMES = Object.keys(ART);
