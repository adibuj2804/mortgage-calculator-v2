import type { SavedCalculation } from '../api/types';
import { formatCents } from './euro';

function rate(hundredths: number): string {
  return (hundredths / 100)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}

export function formatSavedItem(item: SavedCalculation): string {
  const years = item.input.term_months / 12;
  return [
    formatCents(item.input.loan_cents),
    `${rate(item.input.annual_rate_hundredths)} %`,
    `${years} ${years === 1 ? 'year' : 'years'}`,
    `${formatCents(item.result.monthly_payment_cents)} per month`,
    item.created_at.slice(0, 10),
  ].join(' · ');
}
