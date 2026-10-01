export interface LoanInput {
  /** Property price in EUR. */
  price: number;
  /** Down payment in EUR. */
  downPayment: number;
  /** Nominal annual interest rate, in percent. */
  annualRatePct: number;
  /** Loan term in years. */
  years: number;
}

export interface LoanResult {
  loan: number;
  monthlyPayment: number;
  paymentCount: number;
  totalPaid: number;
  totalInterest: number;
  /** Interest as a share of the loan, 0..n (e.g. 0.8 = 80 %). */
  overpaymentRatio: number;
  /** Principal as a share of everything paid, 0..1. */
  principalShare: number;
}

export type LoanValidationError = 'invalid-price-or-term' | 'down-payment-exceeds-price';

export type LoanOutcome =
  { ok: true; result: LoanResult } | { ok: false; error: LoanValidationError };

export function calculateLoan(input: LoanInput): LoanOutcome {
  const price = input.price;
  const downPayment = Math.max(0, input.downPayment);
  const annualRatePct = Math.max(0, input.annualRatePct);

  if (!(price > 0) || !(input.years > 0)) return { ok: false, error: 'invalid-price-or-term' };
  if (downPayment > price) return { ok: false, error: 'down-payment-exceeds-price' };

  const loan = price - downPayment;
  const paymentCount = Math.round(input.years * 12);
  const monthlyRate = annualRatePct / 100 / 12;

  let monthlyPayment: number;
  if (loan <= 0) monthlyPayment = 0;
  else if (monthlyRate === 0) monthlyPayment = loan / paymentCount;
  else monthlyPayment = (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -paymentCount));

  const totalPaid = monthlyPayment * paymentCount;
  const totalInterest = Math.max(0, totalPaid - loan);

  return {
    ok: true,
    result: {
      loan,
      monthlyPayment,
      paymentCount,
      totalPaid,
      totalInterest,
      overpaymentRatio: loan > 0 ? totalInterest / loan : 0,
      principalShare: totalPaid > 0 ? loan / (loan + totalInterest) : 0,
    },
  };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Down payment in EUR for a given percentage of the price. */
export function downPaymentFromPct(price: number, pct: number): number {
  return Math.round((price * clamp(pct, 0, 100)) / 100);
}

/** Down payment percentage (one decimal) for a given amount; `null` when the price is unusable. */
export function downPaymentPctFromAmount(price: number, amount: number): number | null {
  if (!(price > 0)) return null;
  return Math.round((Math.max(0, amount) / price) * 1000) / 10;
}
