import { describe, expect, it } from 'vitest';
import { LIMITS, validateInputs } from './validate';

const check = (loan: string, rate: string, years: string) => validateInputs({ loan, rate, years });

const ok = (loan: number, annualRatePercent: number, months: number) => ({
  ok: true,
  value: { loan, annualRatePercent, months },
});

const fails = (errors: Record<string, string>) => ({ ok: false, errors });

const LOAN_RANGE = 'Loan amount must be between 1,000 and 10,000,000 €';
const RATE_RANGE = 'Rate must be between 0 and 25 %';
const TERM_RANGE = 'Term must be between 1 and 40 years';

describe('validateInputs (FR3)', () => {
  it('validate-valid-typical', () => {
    expect(check('100000', '4', '20')).toEqual(ok(100000, 4, 240));
  });

  it('validate-trims-spaces', () => {
    expect(check(' 100000 ', ' 4', '20 ')).toEqual(ok(100000, 4, 240));
  });

  it('validate-loan-empty', () => {
    expect(check('', '4', '20')).toEqual(fails({ loan: 'Enter a number' }));
  });

  it('validate-loan-not-numeric', () => {
    expect(check('abc', '4', '20')).toEqual(fails({ loan: 'Enter a number' }));
  });

  it('validate-loan-whitespace-only', () => {
    expect(check('   ', '4', '20')).toEqual(fails({ loan: 'Enter a number' }));
  });

  it('validate-rejects-non-decimal-syntax', () => {
    const spellings = ['1e3', 'Infinity', 'NaN', '.5', '5.', '+5', '0x10', '1,000', '1.2.3'];
    for (const spelling of spellings) {
      expect(check(spelling, '4', '20'), spelling).toEqual(fails({ loan: 'Enter a number' }));
    }
  });

  it('validate-decimal-comma-rejected', () => {
    expect(check('100000', '3,75', '20')).toEqual(fails({ rate: 'Enter a number' }));
  });

  it('validate-leading-zeros-allowed', () => {
    expect(check('0001000', '4', '20')).toEqual(ok(1000, 4, 240));
  });

  it('validate-negative-zero-is-zero', () => {
    expect(check('100000', '-0', '20')).toEqual(ok(100000, 0, 240));
  });

  it('validate-loan-three-decimals', () => {
    expect(check('1000.005', '4', '20')).toEqual(fails({ loan: 'Use at most 2 decimals' }));
  });

  it('validate-rate-three-decimals', () => {
    expect(check('100000', '4.005', '20')).toEqual(fails({ rate: 'Use at most 2 decimals' }));
  });

  it('validate-trailing-zeros-allowed', () => {
    expect(check('1000.500', '4.250', '20')).toEqual(ok(1000.5, 4.25, 240));
  });

  it('validate-decimals-checked-before-range', () => {
    expect(check('100000', '25.001', '20')).toEqual(fails({ rate: 'Use at most 2 decimals' }));
  });

  it('validate-term-fraction', () => {
    expect(check('100000', '4', '20.5')).toEqual(fails({ years: 'Term must be a whole number' }));
  });

  it('validate-term-trailing-zero', () => {
    expect(check('100000', '4', '20.0')).toEqual(ok(100000, 4, 240));
  });

  it('validate-loan-below-min', () => {
    expect(check('999.99', '4', '20')).toEqual(fails({ loan: LOAN_RANGE }));
  });

  it('validate-loan-at-min', () => {
    expect(check('1000', '4', '20')).toEqual(ok(1000, 4, 240));
  });

  it('validate-loan-at-max', () => {
    expect(check('10000000', '4', '20')).toEqual(ok(10000000, 4, 240));
  });

  it('validate-loan-above-max', () => {
    expect(check('10000000.01', '4', '20')).toEqual(fails({ loan: LOAN_RANGE }));
  });

  it('validate-loan-negative', () => {
    expect(check('-5000', '4', '20')).toEqual(fails({ loan: LOAN_RANGE }));
  });

  it('validate-rate-zero-allowed', () => {
    expect(check('100000', '0', '20')).toEqual(ok(100000, 0, 240));
  });

  it('validate-rate-negative', () => {
    expect(check('100000', '-0.01', '20')).toEqual(fails({ rate: RATE_RANGE }));
  });

  it('validate-rate-at-max', () => {
    expect(check('100000', '25', '20')).toEqual(ok(100000, 25, 240));
  });

  it('validate-rate-above-max', () => {
    expect(check('100000', '25.01', '20')).toEqual(fails({ rate: RATE_RANGE }));
  });

  it('validate-term-zero', () => {
    expect(check('100000', '4', '0')).toEqual(fails({ years: TERM_RANGE }));
  });

  it('validate-term-negative', () => {
    expect(check('100000', '4', '-1')).toEqual(fails({ years: TERM_RANGE }));
  });

  it('validate-term-at-bounds', () => {
    expect(check('100000', '4', '1')).toEqual(ok(100000, 4, 12));
    expect(check('100000', '4', '40')).toEqual(ok(100000, 4, 480));
  });

  it('validate-term-above-max', () => {
    expect(check('100000', '4', '41')).toEqual(fails({ years: TERM_RANGE }));
  });

  it('validate-each-field-own-message', () => {
    expect(check('', '30', '20')).toEqual(fails({ loan: 'Enter a number', rate: RATE_RANGE }));
  });

  it('validate-all-fields-invalid', () => {
    expect(check('', 'x', '')).toEqual(
      fails({ loan: 'Enter a number', rate: 'Enter a number', years: 'Enter a number' }),
    );
  });

  it('validate-limits-constants', () => {
    expect(LIMITS).toEqual({
      loan: { min: 1000, max: 10000000 },
      rate: { min: 0, max: 25 },
      years: { min: 1, max: 40 },
    });
  });
});
