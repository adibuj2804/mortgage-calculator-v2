export type LoanInput = {
  loan: number;
  annualRatePercent: number;
  months: number;
};

export type LoanResult = {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
};

function assertValid(balance: number, monthlyRate: number, months: number): void {
  const ok =
    Number.isFinite(balance) &&
    Number.isFinite(monthlyRate) &&
    Number.isFinite(months) &&
    balance > 0 &&
    monthlyRate >= 0 &&
    Number.isInteger(months) &&
    months >= 1;

  if (!ok) {
    throw new RangeError(
      `Invalid loan: balance ${balance}, monthly rate ${monthlyRate}, months ${months}`,
    );
  }
}

export function annuityPayment(balance: number, monthlyRate: number, months: number): number {
  assertValid(balance, monthlyRate, months);

  if (monthlyRate === 0) {
    return balance / months;
  }

  return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

export function calculateLoan({ loan, annualRatePercent, months }: LoanInput): LoanResult {
  const monthlyRate = annualRatePercent / 12 / 100;
  assertValid(loan, monthlyRate, months);

  const loanCents = Math.round(loan * 100);

  if (annualRatePercent === 0) {
    // Integer cents keep exact half-cent ties exact: floor((2L + n) / 2n) is L / n rounded half up.
    const paymentCents = Math.floor((2 * loanCents + months) / (2 * months));
    return {
      monthlyPayment: paymentCents / 100,
      totalPaid: loanCents / 100,
      totalInterest: 0,
    };
  }

  const paymentCents = Math.round(annuityPayment(loan, monthlyRate, months) * 100);
  const interestCents = Math.max(0, paymentCents * months - loanCents);

  return {
    monthlyPayment: paymentCents / 100,
    totalPaid: (loanCents + interestCents) / 100,
    totalInterest: interestCents / 100,
  };
}
