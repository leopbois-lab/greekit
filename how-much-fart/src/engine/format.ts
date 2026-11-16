const nf = (maximumFractionDigits: number, minimumFractionDigits = 0) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits, minimumFractionDigits });

const INT = nf(0);
const ONE = nf(1);
const TWO = nf(2);

/** Nombre lisible : pas de fausse précision sur des estimations. */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 0.01) return '< 0,01';
  if (n < 10) return TWO.format(n);
  if (n < 100) return ONE.format(n);
  return INT.format(n);
}

/** Masse de CO2e avec l'unité adaptée : g, kg ou t. */
export function formatKg(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '0 g CO2e';
  if (kg < 0.001) return '< 1 g CO2e';
  if (kg < 1) return `${INT.format(kg * 1000)} g CO2e`;
  if (kg < 1000) return `${formatCount(kg)} kg CO2e`;
  return `${TWO.format(kg / 1000)} t CO2e`;
}

/** Date AAAA-MM-JJ en heure locale. */
export function toDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** « 16/11/2026 » à partir de AAAA-MM-JJ. */
export function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}
