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

/** Durée lisible à partir d'un nombre d'années : jours, mois ou ans, arrondie (c'est un ordre de grandeur). */
export function formatYears(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return 'moins d’un jour';
  const days = years * 365;
  if (days < 1) return 'moins d’un jour';
  if (days < 45) {
    const d = Math.round(days);
    return `${d} jour${d > 1 ? 's' : ''}`;
  }
  const months = years * 12;
  if (months < 23.5) return `${Math.round(months)} mois`;
  if (years < 10) return `${ONE.format(Math.round(years * 2) / 2)} ans`;
  return `${INT.format(Math.round(years))} ans`;
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
