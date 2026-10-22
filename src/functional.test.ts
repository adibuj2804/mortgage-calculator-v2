import { describe, expect, it } from 'vitest';
import { calculateLoan } from './calc/payment';
import { validateInputs } from './calc/validate';
import { formatEuro } from './format/euro';

function textsFor(loan: string, rate: string, years: string) {
  const checked = validateInputs({ loan, rate, years });
  if (!checked.ok) throw new Error('Expected valid inputs');

  const result = calculateLoan(checked.value);
  return [
    formatEuro(result.monthlyPayment),
    formatEuro(result.totalPaid),
    formatEuro(result.totalInterest),
  ];
}

describe('modules working together (FR1, FR2, FR4)', () => {
  it('functional-text-to-euro-100k-4pct-20y', () => {
    expect(textsFor('100000', '4', '20')).toEqual(['605.98 €', '145,435.20 €', '45,435.20 €']);
  });

  it('functional-zero-rate-120k-10y', () => {
    expect(textsFor('120000', '0', '10')).toEqual(['1,000.00 €', '120,000.00 €', '0.00 €']);
  });
});
