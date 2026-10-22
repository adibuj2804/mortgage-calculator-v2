import { describe, expect, it } from 'vitest';
import { annuityPayment, calculateLoan } from './payment';

const calc = (loan: number, annualRatePercent: number, months: number) =>
  calculateLoan({ loan, annualRatePercent, months });

describe('calculateLoan: monthly payment (FR1)', () => {
  it('payment-standard-100k-4pct-20y', () => {
    expect(calc(100000, 4, 240).monthlyPayment).toBe(605.98);
  });

  it('payment-standard-200k-3.5pct-30y', () => {
    expect(calc(200000, 3.5, 360).monthlyPayment).toBe(898.09);
  });

  it('payment-typical-250k-4.5pct-25y', () => {
    expect(calc(250000, 4.5, 300).monthlyPayment).toBe(1389.58);
  });

  it('payment-zero-rate-120k-10y', () => {
    expect(calc(120000, 0, 120).monthlyPayment).toBe(1000);
  });

  it('payment-zero-rate-rounds-up', () => {
    expect(calc(100000, 0, 36).monthlyPayment).toBe(2777.78);
  });

  it('payment-zero-rate-rounds-down', () => {
    expect(calc(1000, 0, 12).monthlyPayment).toBe(83.33);
  });

  it('payment-tie-half-up-not-half-even', () => {
    expect(calc(1000.14, 0, 12).monthlyPayment).toBe(83.35);
  });

  it('payment-tie-float-hazard', () => {
    expect(calc(1000.02, 0, 12).monthlyPayment).toBe(83.34);
  });

  it('payment-min-loan-max-rate-1y', () => {
    expect(calc(1000, 25, 12).monthlyPayment).toBe(95.04);
  });

  it('payment-max-loan-max-rate-max-term', () => {
    expect(calc(10000000, 25, 480).monthlyPayment).toBe(208343.82);
  });

  it('payment-tiny-rate-0.01pct', () => {
    expect(calc(100000, 0.01, 120).monthlyPayment).toBe(833.75);
  });

  it('payment-one-month-term', () => {
    expect(calc(5000, 6, 1).monthlyPayment).toBe(5025);
  });

  it('payment-no-v1-maximum', () => {
    expect(calc(20000000, 4, 240).monthlyPayment).toBe(121196.07);
  });
});

describe('calculateLoan: totals (FR2)', () => {
  it('totals-100k-4pct-20y', () => {
    const result = calc(100000, 4, 240);
    expect(result.totalPaid).toBe(145435.2);
    expect(result.totalInterest).toBe(45435.2);
  });

  it('totals-200k-3.5pct-30y', () => {
    const result = calc(200000, 3.5, 360);
    expect(result.totalPaid).toBe(323312.4);
    expect(result.totalInterest).toBe(123312.4);
  });

  it('totals-typical-250k-4.5pct-25y', () => {
    const result = calc(250000, 4.5, 300);
    expect(result.totalPaid).toBe(416874);
    expect(result.totalInterest).toBe(166874);
  });

  it('totals-zero-rate-120k-10y', () => {
    const result = calc(120000, 0, 120);
    expect(result.totalPaid).toBe(120000);
    expect(result.totalInterest).toBe(0);
  });

  it('totals-zero-rate-rounds-up-no-interest', () => {
    const result = calc(100000, 0, 36);
    expect(result.totalPaid).toBe(100000);
    expect(result.totalInterest).toBe(0);
  });

  it('totals-zero-rate-rounds-down-not-negative', () => {
    const result = calc(1000, 0, 12);
    expect(result.totalPaid).toBe(1000);
    expect(result.totalInterest).toBe(0);
  });

  it('totals-positive-rate-never-negative', () => {
    const result = calc(1013, 0.01, 480);
    expect(result.monthlyPayment).toBe(2.11);
    expect(result.totalPaid).toBe(1013);
    expect(result.totalInterest).toBe(0);
  });

  it('totals-max-case', () => {
    const result = calc(10000000, 25, 480);
    expect(result.totalPaid).toBe(100005033.6);
    expect(result.totalInterest).toBe(90005033.6);
  });

  it('totals-one-month-term', () => {
    const result = calc(5000, 6, 1);
    expect(result.totalPaid).toBe(5025);
    expect(result.totalInterest).toBe(25);
  });
});

describe('payment module contract (exact annuity payment and errors)', () => {
  it('annuity-payment-exact-value', () => {
    expect(annuityPayment(100000, 0.04 / 12, 240)).toBeCloseTo(605.9803292994, 9);
  });

  it('annuity-payment-zero-rate', () => {
    expect(annuityPayment(1200, 0, 12)).toBe(100);
  });

  it('payment-rejects-zero-months', () => {
    expect(() => calc(100000, 4, 0)).toThrow(RangeError);
  });

  it('payment-rejects-fractional-months', () => {
    expect(() => calc(100000, 4, 12.5)).toThrow(RangeError);
  });

  it('payment-rejects-negative-rate', () => {
    expect(() => calc(100000, -1, 120)).toThrow(RangeError);
  });

  it('payment-rejects-zero-loan', () => {
    expect(() => calc(0, 4, 120)).toThrow(RangeError);
  });

  it('payment-rejects-not-a-number', () => {
    expect(() => calc(NaN, 4, 120)).toThrow(RangeError);
    expect(() => calc(100000, Infinity, 120)).toThrow(RangeError);
  });

  it('annuity-payment-rejects-zero-balance', () => {
    expect(() => annuityPayment(0, 0.003, 12)).toThrow(RangeError);
  });
});
