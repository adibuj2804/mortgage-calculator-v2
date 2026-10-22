import { describe, expect, it } from 'vitest';
import { formatSavedItem } from './saved';

const item = (rate: number, months: number) => ({
  id: 'x',
  created_at: '2026-01-01T00:00:01+00:00',
  input: {
    loan_cents: 10000000,
    annual_rate_hundredths: rate,
    term_months: months,
    extra_monthly_cents: 0,
  },
  result: {
    monthly_payment_cents: 60598,
    total_paid_cents: 14543520,
    total_interest_cents: 4543520,
  },
  extra_payment: null,
});

describe('formatSavedItem (FR8)', () => {
  it('format-saved-item-text', () => {
    expect(formatSavedItem(item(400, 240))).toBe(
      '100,000.00 € · 4 % · 20 years · 605.98 € per month · 2026-01-01',
    );
    expect(formatSavedItem(item(450, 12))).toBe(
      '100,000.00 € · 4.5 % · 1 year · 605.98 € per month · 2026-01-01',
    );
    expect(formatSavedItem(item(375, 240))).toContain(' · 3.75 % · ');
    expect(formatSavedItem(item(1, 240))).toContain(' · 0.01 % · ');
    expect(formatSavedItem(item(0, 240))).toContain(' · 0 % · ');
  });
});
