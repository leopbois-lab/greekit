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
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5" />,
  pencil: <path d="M4 20l1-4.5L16 4.5l3.5 3.5-11 11zM14 6.5l3.5 3.5" />,
  barcode: <path d="M4 6v12M7.5 6v12M11 6v12M13.5 6v12M17 6v12M20 6v12" />,
  receipt: <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8.5h6M9 12.5h6" />,
  flame: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4.5 3-7 1 1.5 2 2 2.5 2.5C11.5 8 11.5 5.5 12 3z" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.200-2.8-5.200 2.8 1-5.8-4.3-4.1 5.9-.9z" />,
  calendar: <path d="M5 6.5h14V20H5zM5 10.5h14M8.5 4v4M15.5 4v4" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  flag: <path d="M6 21V4M6 5h11l-2 3.5 2 3.5H6" />,
  leaf: <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l7-7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.6" />,
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
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
