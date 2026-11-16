import type { PlanetState } from '../engine/planet';

/** Un sprite = des lignes de caractères ; chaque caractère renvoie à une couleur. « . » = transparent. */
export interface SpriteDef {
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
}

const mono = (rows: string[]): SpriteDef => ({ rows, palette: { '#': 'currentColor' } });

export const ICONS = {
  home: mono(['...##...', '..####..', '.######.', '########', '.######.', '.##..##.', '.##..##.', '........']),
  list: mono(['........', '#.#####.', '........', '#.#####.', '........', '#.#####.', '........', '........']),
  plus: mono(['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...']),
  chart: mono(['......##', '......##', '...##.##', '...##.##', '##.##.##', '##.##.##', '##.##.##', '........']),
  trophy: mono(['########', '#.####.#', '#.####.#', '.######.', '..####..', '...##...', '..####..', '.######.']),
  gear: mono(['...##...', '.#.##.#.', '..####..', '###..###', '###..###', '..####..', '.#.##.#.', '...##...']),
  soundOn: mono(['...#..#.', '..##...#', '####.#.#', '####.#.#', '####.#.#', '####.#.#', '..##...#', '...#..#.']),
  soundOff: mono(['...#....', '..##....', '####.#.#', '####..#.', '####..#.', '####.#.#', '..##....', '...#....']),
} satisfies Record<string, SpriteDef>;

export type IconName = keyof typeof ICONS;

export const COIN: SpriteDef = {
  rows: ['..YYYY..', '.YWWYYO.', 'YWYYYYYO', 'YWYYYYYO', 'YYYYYYYO', 'YYYYYYOO', '.YYYYOO.', '..OOOO..'],
  palette: { Y: '#ffd23f', O: '#ff8a3c', W: '#fff7c9' },
};

export const HEART: SpriteDef = {
  rows: ['.RR..RR.', 'RWRRRRRR', 'RWRRRRRR', 'RRRRRRRR', '.RRRRRR.', '..RRRR..', '...RR...', '........'],
  palette: { R: '#ff4d5e', W: '#ffd0d5' },
};

/* ---------- Planète-mascotte (16×16, générée) ---------- */

const SIZE = 16;
// Étendue (début, fin) du disque pour chaque ligne.
const DISC: ReadonlyArray<readonly [number, number]> = [
  [5, 10], [3, 12], [2, 13], [1, 14], [1, 14], [0, 15], [0, 15], [0, 15],
  [0, 15], [0, 15], [0, 15], [1, 14], [1, 14], [2, 13], [3, 12], [5, 10],
];
const LAND = [
  '................',
  '....LLL.........',
  '...LLLLL....L...',
  '..LLLLL....LLL..',
  '..LLLL......LL..',
  '.LLL..........L.',
  '.LL.............',
  '................',
  '..........LL....',
  '.........LLLL...',
  'L.......LLLLL...',
  'LL.......LLL....',
  '.LL.......L.....',
  '..LLL...........',
  '....LL..........',
  '................',
];

const PLANET_PALETTES: Record<PlanetState, Record<string, string>> = {
  verdoyante: { o: '#41c7f5', O: '#2a8fd0', l: '#5ee66a', L: '#2fa84f' },
  fraiche: { o: '#4ab8e8', O: '#2f84c0', l: '#8fdc5a', L: '#56a83c' },
  tiede: { o: '#5aa6c8', O: '#3d789c', l: '#d8c04a', L: '#a08a2e' },
  enfumee: { o: '#6d8a9c', O: '#4c6474', l: '#b98a4a', L: '#86602e', S: '#9aa0b0' },
  suffocante: { o: '#6a6f80', O: '#4a4e5c', l: '#8a6a50', L: '#5e4634', S: '#c0c4d0' },
};

const SMOKE_DENSITY: Record<PlanetState, number> = {
  verdoyante: 0, fraiche: 0, tiede: 0, enfumee: 2, suffocante: 4,
};

type Face = ReadonlyArray<readonly [number, number]>;
const EYES_OPEN: Face = [[5, 6], [5, 7], [10, 6], [10, 7]];
const EYES_HALF: Face = [[5, 7], [10, 7]];
const MOUTH_FLAT: Face = [[6, 10], [7, 10], [8, 10], [9, 10]];
const FACES: Record<PlanetState, Face> = {
  verdoyante: [...EYES_OPEN, ...MOUTH_FLAT, [5, 9], [10, 9]],
  fraiche: [...EYES_OPEN, ...MOUTH_FLAT, [5, 9], [10, 9]],
  tiede: [...EYES_OPEN, ...MOUTH_FLAT],
  enfumee: [...EYES_OPEN, ...MOUTH_FLAT, [5, 11], [10, 11]],
  suffocante: [...EYES_HALF, [7, 10], [8, 10], [7, 11], [8, 11]],
};

export function planetSprite(state: PlanetState): SpriteDef {
  const grid: string[][] = [];
  for (let y = 0; y < SIZE; y++) {
    const [start, end] = DISC[y];
    const row: string[] = [];
    for (let x = 0; x < SIZE; x++) {
      if (x < start || x > end) {
        row.push('.');
        continue;
      }
      const shaded = x - 7.5 + (y - 7.5) > 6;
      const land = LAND[y][x] === 'L';
      let c = land ? (shaded ? 'L' : 'l') : shaded ? 'O' : 'o';
      if ((x * 7 + y * 13) % 11 < SMOKE_DENSITY[state]) c = 'S';
      row.push(c);
    }
    grid.push(row);
  }
  for (const [x, y] of FACES[state]) grid[y][x] = 'K';
  return {
    rows: grid.map((r) => r.join('')),
    palette: { ...PLANET_PALETTES[state], K: '#10142c' },
  };
}
