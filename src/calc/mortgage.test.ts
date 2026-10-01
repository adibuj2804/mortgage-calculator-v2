import { describe, expect, it } from 'vitest';
import {
  calculateLoan,
  downPaymentFromPct,
  downPaymentPctFromAmount,
  type LoanInput,
  type LoanResult,
} from './mortgage';

const base: LoanInput = { price: 250_000, downPayment: 50_000, annualRatePct: 4.5, years: 25 };

function ok(input: LoanInput): LoanResult {
  const outcome = calculateLoan(input);
  if (!outcome.ok) throw new Error(`expected success, got ${outcome.error}`);
  return outcome.result;
}

describe('calculateLoan', () => {
  it('computes the annuity payment for the default scenario', () => {
    const r = ok(base);
    expect(r.loan).toBe(200_000);
    expect(r.paymentCount).toBe(300);
    expect(r.monthlyPayment).toBeCloseTo(1111.66, 2);
    expect(r.totalPaid).toBeCloseTo(r.monthlyPayment * 300, 6);
    expect(r.totalInterest).toBeCloseTo(r.totalPaid - 200_000, 6);
  });

  it('splits payment into principal and interest shares that add up', () => {
    const r = ok(base);
    expect(r.principalShare).toBeCloseTo(r.loan / r.totalPaid, 10);
  });

  it('handles a zero interest rate', () => {
    const r = ok({ ...base, annualRatePct: 0 });
    expect(r.monthlyPayment).toBeCloseTo(200_000 / 300, 6);
    expect(r.totalInterest).toBe(0);
    expect(r.overpaymentRatio).toBe(0);
  });

  it('handles a fully paid-up purchase', () => {
    const r = ok({ ...base, downPayment: 250_000 });
    expect(r.loan).toBe(0);
    expect(r.monthlyPayment).toBe(0);
    expect(r.principalShare).toBe(0);
  });

  it('treats negative down payment and rate as zero', () => {
    expect(ok({ ...base, downPayment: -5, annualRatePct: -1 }).loan).toBe(250_000);
  });

  it('rejects a non-positive price or term', () => {
    expect(calculateLoan({ ...base, price: 0 })).toEqual({
      ok: false,
      error: 'invalid-price-or-term',
    });
    expect(calculateLoan({ ...base, years: 0 })).toEqual({
      ok: false,
      error: 'invalid-price-or-term',
    });
    expect(calculateLoan({ ...base, price: NaN })).toEqual({
      ok: false,
      error: 'invalid-price-or-term',
    });
  });

  it('rejects a down payment above the price', () => {
    expect(calculateLoan({ ...base, downPayment: 250_001 })).toEqual({
      ok: false,
      error: 'down-payment-exceeds-price',
    });
  });
});

describe('down payment sync helpers', () => {
  it('converts percentage to euros, clamped to 0..100 %', () => {
    expect(downPaymentFromPct(250_000, 20)).toBe(50_000);
    expect(downPaymentFromPct(250_000, 150)).toBe(250_000);
    expect(downPaymentFromPct(250_000, -5)).toBe(0);
  });

  it('converts euros to a one-decimal percentage', () => {
    expect(downPaymentPctFromAmount(250_000, 50_000)).toBe(20);
    expect(downPaymentPctFromAmount(300_000, 10_000)).toBe(3.3);
  });

  it('returns null when the price is not usable', () => {
    expect(downPaymentPctFromAmount(0, 100)).toBeNull();
  });
});
