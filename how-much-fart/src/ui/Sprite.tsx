import type { SpriteDef } from './sprites';

interface Props {
  sprite: SpriteDef;
  /** Facteur d'agrandissement : toujours un entier pour garder des pixels nets. */
  scale?: number;
  label?: string;
  className?: string;
}

export function Sprite({ sprite, scale = 2, label, className = '' }: Props) {
  const s = Math.max(1, Math.round(scale));
  const h = sprite.rows.length;
  const w = sprite.rows[0]?.length ?? 0;
  const rects: React.ReactNode[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === c) run++;
      const fill = sprite.palette[c];
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={fill} />);
      x += run;
    }
  });
  return (
    <svg
      className={`sprite ${className}`}
      width={w * s}
      height={h * s}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects}
    </svg>
  );
}
