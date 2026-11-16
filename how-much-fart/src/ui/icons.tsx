/** Icônes au trait, faites maison (24 × 24, trait de 2). Décoratives : le libellé est porté par le lien ou le bouton. */

const PATHS = {
  home: <path d="M4 11.5 12 4.5l8 7V20h-5.5v-5.5h-5V20H4z" />,
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="2.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" strokeWidth="2.4" />,
  chart: <path d="M5 20v-7M12 20V5M19 20v-10" strokeWidth="2.6" />,
  trophy: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 14v4M8.5 20h7" />
    </>
  ),
  gear: (
    <>
      <path d="M4 7h9M18 7h2M4 17h2M11 17h9" />
      <circle cx="15.5" cy="7" r="2.3" />
      <circle cx="8.5" cy="17" r="2.3" />
    </>
  ),
  soundOn: (
    <>
      <path d="M4 10v4h3.5l5 4V6l-5 4z" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 10v4h3.5l5 4V6l-5 4z" />
      <path d="m16.5 9.5 5 5M21.5 9.5l-5 5" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
