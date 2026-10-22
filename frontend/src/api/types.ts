export type CalculateRequest = {
  loan: string;
  annual_rate_percent: string;
  term_years: string;
  extra_monthly_payment: string;
};

export type CalculationInput = {
  loan_cents: number;
  annual_rate_hundredths: number;
  term_months: number;
  extra_monthly_cents: number;
};

export type CalculationResult = {
  monthly_payment_cents: number;
  total_paid_cents: number;
  total_interest_cents: number;
};

export type ExtraPayment = {
  months_to_payoff: number;
  months_saved: number;
  total_interest_cents: number;
  interest_saved_cents: number;
};

export type YearRow = {
  year: number;
  payments_cents: number;
  interest_cents: number;
  principal_cents: number;
  end_balance_cents: number;
};

export type Schedule = {
  yearly: YearRow[];
  total_payments_cents: number;
  total_interest_cents: number;
  extra_balance_by_year_cents: number[] | null;
};

export type CalculateResponse = {
  input: CalculationInput;
  result: CalculationResult;
  extra_payment: ExtraPayment | null;
  schedule: Schedule;
};

export type SavedCalculation = {
  id: string;
  created_at: string;
  input: CalculationInput;
  result: CalculationResult;
  extra_payment: ExtraPayment | null;
};
