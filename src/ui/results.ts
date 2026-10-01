import type { LoanResult, LoanValidationError } from '../calc/mortgage';
import { formatEur, formatEurExact, formatInt, formatPct } from '../format';
import { byId } from './dom';
import { renderDonut } from './donut';

const ERROR_MESSAGES: Record<LoanValidationError, string> = {
  'invalid-price-or-term': 'Zadajte platnú cenu nehnuteľnosti a dobu splácania.',
  'down-payment-exceeds-price': 'Vlastné zdroje nemôžu prevyšovať cenu nehnuteľnosti.',
};

export function showError(error: LoanValidationError | null): void {
  byId('err').textContent = error ? ERROR_MESSAGES[error] : '';
}

export function showResult(r: LoanResult): void {
  byId('monthlyPayment').textContent = formatEurExact(r.monthlyPayment);
  byId('legendPrincipal').textContent = formatEur(r.loan);
  byId('legendInterest').textContent = formatEur(r.totalInterest);
  byId('statLoan').textContent = formatEur(r.loan);
  byId('statTotal').textContent = formatEur(r.totalPaid);
  byId('statCount').textContent = formatInt(r.paymentCount);
  byId('statOverpay').textContent = formatPct(r.overpaymentRatio);

  renderDonut(r.principalShare);
  byId('sampleTag').hidden = true;
}
