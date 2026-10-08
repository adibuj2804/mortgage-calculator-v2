import { describe, expect, it } from 'vitest';
import type { LoanInput } from './mortgage';
import { affordability, buildSchedule, summarizeByYear } from './schedule';

const base: LoanInput = { price: 250_000, downPayment: 50_000, annualRatePct: 4.5, years: 25 };

describe('buildSchedule', () => {
  it('amortizes the loan to zero over the full term', () => {
    const s = buildSchedule(base);
    expect(s.months).toHaveLength(300);
    expect(s.months[299]!.balance).toBeCloseTo(0, 4);
    expect(s.totalInterest).toBeCloseTo(133_499, 0);
  });

  it('charges interest on the opening balance in month one', () => {
    const first = buildSchedule(base).months[0]!;
    expect(first.interest).toBeCloseTo((200_000 * 0.045) / 12, 6);
    expect(first.principal + first.interest).toBeCloseTo(1111.66, 2);
  });

  it('handles a zero rate with equal principal slices', () => {
    const s = buildSchedule({ ...base, annualRatePct: 0 });
    expect(s.totalInterest).toBe(0);
    expect(s.months[0]!.principal).toBeCloseTo(200_000 / 300, 6);
  });

  it('returns an empty schedule when nothing is borrowed', () => {
    const s = buildSchedule({ ...base, downPayment: 250_000 });
    expect(s.months).toEqual([]);
    expect(s.totalInterest).toBe(0);
  });

  it('pays off sooner and saves interest with an extra monthly payment', () => {
    const plain = buildSchedule(base);
    const extra = buildSchedule(base, 200);
    expect(extra.months.length).toBeLessThan(plain.months.length);
    expect(extra.totalInterest).toBeLessThan(plain.totalInterest);
    expect(extra.months.at(-1)!.balance).toBeCloseTo(0, 6);
  });

  it('ignores a negative extra payment', () => {
    expect(buildSchedule(base, -50).months).toHaveLength(300);
  });

  it('returns an empty schedule for invalid input', () => {
    expect(buildSchedule({ ...base, price: 0 }).months).toEqual([]);
    expect(buildSchedule({ ...base, annualRatePct: -1 }).months).toEqual([]);
  });
});

describe('summarizeByYear', () => {
  it('groups months into years whose principal sums to the loan', () => {
    const years = summarizeByYear(buildSchedule(base).months);
    expect(years).toHaveLength(25);
    expect(years[0]!.year).toBe(1);
    expect(years.reduce((a, y) => a + y.principal, 0)).toBeCloseTo(200_000, 4);
    expect(years[24]!.balance).toBeCloseTo(0, 4);
  });

  it('keeps a partial final year', () => {
    const years = summarizeByYear(buildSchedule({ ...base, years: 1.5 }).months);
    expect(years).toHaveLength(2);
  });
});

describe('affordability', () => {
  it('rates payment-to-income ratios', () => {
    expect(affordability(600, 2000)).toEqual({ ratio: 0.3, level: 'comfortable' });
    expect(affordability(800, 2000)).toEqual({ ratio: 0.4, level: 'tight' });
    expect(affordability(1000, 2000)).toEqual({ ratio: 0.5, level: 'risky' });
  });

  it('returns null without a usable income', () => {
    expect(affordability(500, 0)).toBeNull();
    expect(affordability(500, NaN)).toBeNull();
  });
});
