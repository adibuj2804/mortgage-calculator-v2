const LOCALE = 'en-IE';

const eur = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const eurFrac = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export const formatEur = (n: number) => eur.format(n);
export const formatEurExact = (n: number) => eurFrac.format(n);
export const formatInt = (n: number) => n.toLocaleString(LOCALE);
export const formatPct = (ratio: number) => `${Math.round(ratio * 100)}%`;

export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? 'month' : 'months'}`);
  return parts.join(' ') || '0 months';
}
