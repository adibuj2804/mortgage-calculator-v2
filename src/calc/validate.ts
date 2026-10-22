import type { LoanInput } from './payment';

export const LIMITS = {
  loan: { min: 1000, max: 10000000 },
  rate: { min: 0, max: 25 },
  years: { min: 1, max: 40 },
} as const;

export type RawInputs = { loan: string; rate: string; years: string };
export type FieldErrors = Partial<Record<keyof RawInputs, string>>;
export type ValidationResult = { ok: true; value: LoanInput } | { ok: false; errors: FieldErrors };

const grouped = (n: number) => n.toLocaleString('en-US');

const MESSAGES = {
  syntax: 'Enter a number',
  decimals: 'Use at most 2 decimals',
  wholeNumber: 'Term must be a whole number',
  loanRange: `Loan amount must be between ${grouped(LIMITS.loan.min)} and ${grouped(LIMITS.loan.max)} €`,
  rateRange: `Rate must be between ${LIMITS.rate.min} and ${LIMITS.rate.max} %`,
  yearsRange: `Term must be between ${LIMITS.years.min} and ${LIMITS.years.max} years`,
};

const NUMBER_SYNTAX = /^-?\d+(\.\d+)?$/;

type FieldRule = {
  range: { min: number; max: number };
  rangeMessage: string;
  decimalsMessage: string;
  maxDecimals: number;
};

type Parsed = { value: number } | { error: string };

function parseField(text: string, rule: FieldRule): Parsed {
  const trimmed = text.trim();
  const match = NUMBER_SYNTAX.exec(trimmed);
  if (!match) return { error: MESSAGES.syntax };

  const decimals = (match[1] ?? '').slice(1).replace(/0+$/, '');
  if (decimals.length > rule.maxDecimals) return { error: rule.decimalsMessage };

  const value = Number(trimmed) + 0; // "-0" becomes 0
  if (value < rule.range.min || value > rule.range.max) return { error: rule.rangeMessage };

  return { value };
}

const RULES: Record<keyof RawInputs, FieldRule> = {
  loan: {
    range: LIMITS.loan,
    rangeMessage: MESSAGES.loanRange,
    decimalsMessage: MESSAGES.decimals,
    maxDecimals: 2,
  },
  rate: {
    range: LIMITS.rate,
    rangeMessage: MESSAGES.rateRange,
    decimalsMessage: MESSAGES.decimals,
    maxDecimals: 2,
  },
  years: {
    range: LIMITS.years,
    rangeMessage: MESSAGES.yearsRange,
    decimalsMessage: MESSAGES.wholeNumber,
    maxDecimals: 0,
  },
};

export function validateInputs(raw: RawInputs): ValidationResult {
  const loan = parseField(raw.loan, RULES.loan);
  const rate = parseField(raw.rate, RULES.rate);
  const years = parseField(raw.years, RULES.years);

  if ('value' in loan && 'value' in rate && 'value' in years) {
    return {
      ok: true,
      value: { loan: loan.value, annualRatePercent: rate.value, months: years.value * 12 },
    };
  }

  const errors: FieldErrors = {};
  if ('error' in loan) errors.loan = loan.error;
  if ('error' in rate) errors.rate = rate.error;
  if ('error' in years) errors.years = years.error;
  return { ok: false, errors };
}
