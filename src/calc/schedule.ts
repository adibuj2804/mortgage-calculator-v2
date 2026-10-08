import { calculateLoan, type LoanInput } from './mortgage';

export interface ScheduleRow {
  /** 1-based month number. */
  month: number;
  principal: number;
  interest: number;
  /** Remaining balance after this payment. */
  balance: number;
}

export interface Schedule {
  months: ScheduleRow[];
  totalInterest: number;
}

export interface YearRow {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}

export type AffordabilityLevel = 'comfortable' | 'tight' | 'risky';

const EMPTY: Schedule = { months: [], totalInterest: 0 };

/** Month-by-month amortization, optionally with an extra amount paid towards principal. */
export function buildSchedule(input: LoanInput, extraMonthly = 0): Schedule {
  const outcome = calculateLoan(input);
  if (!outcome.ok || outcome.result.loan <= 0) return EMPTY;

  const { loan, monthlyPayment, paymentCount } = outcome.result;
  const monthlyRate = input.annualRatePct / 100 / 12;
  const extra = Math.max(0, extraMonthly) || 0;

  const months: ScheduleRow[] = [];
  let balance = loan;
  let totalInterest = 0;

  for (let month = 1; month <= paymentCount && balance > 1e-9; month++) {
    const interest = balance * monthlyRate;
    const principal = Math.min(balance, monthlyPayment - interest + extra);
    balance = month === paymentCount ? 0 : Math.max(0, balance - principal);
    totalInterest += interest;
    months.push({ month, principal, interest, balance });
  }

  return { months, totalInterest };
}

export function summarizeByYear(months: ScheduleRow[]): YearRow[] {
  const years: YearRow[] = [];
  for (const m of months) {
    const year = Math.ceil(m.month / 12);
    let row = years[year - 1];
    if (!row) {
      row = { year, principal: 0, interest: 0, balance: 0 };
      years.push(row);
    }
    row.principal += m.principal;
    row.interest += m.interest;
    row.balance = m.balance;
  }
  return years;
}

/** Share of monthly income taken by the payment, with a rule-of-thumb verdict. */
export function affordability(
  monthlyPayment: number,
  monthlyIncome: number,
): { ratio: number; level: AffordabilityLevel } | null {
  if (!(monthlyIncome > 0)) return null;
  const ratio = monthlyPayment / monthlyIncome;
  const level = ratio <= 0.3 ? 'comfortable' : ratio <= 0.4 ? 'tight' : 'risky';
  return { ratio, level };
}
