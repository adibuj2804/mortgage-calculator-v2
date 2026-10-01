const LOCALE = 'sk-SK';

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
