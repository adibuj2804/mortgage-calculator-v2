import type { LoanResult, LoanValidationError } from '../calc/mortgage';
import type { AffordabilityLevel } from '../calc/schedule';
import { formatDuration, formatEur, formatEurExact, formatInt, formatPct } from '../format';
import { byId } from './dom';
import { renderDonut } from './donut';
import { renderBalanceChart } from './balanceChart';
import { renderScheduleTable } from './scheduleTable';
import type { Schedule } from '../calc/schedule';
import { summarizeByYear } from '../calc/schedule';

const ERROR_MESSAGES: Record<LoanValidationError, string> = {
  'invalid-price-or-term': 'Enter a valid property price and loan term (at least 1 month).',
  'down-payment-exceeds-price': 'Down payment cannot exceed the property price.',
  'negative-rate': 'The interest rate cannot be negative.',
};

const VERDICTS: Record<AffordabilityLevel, string> = {
  comfortable: 'Comfortable — this payment leaves plenty of room in your budget.',
  tight: 'Tight — doable, but you would have little spare money each month.',
  risky: 'Risky — most banks would be wary of a payment this large for your income.',
};

const PLACEHOLDER_IDS = [
  'monthlyPayment',
  'legendPrincipal',
  'legendInterest',
  'statLoan',
  'statTotal',
  'statCount',
  'statOverpay',
  'donutPct',
];

export function showError(error: LoanValidationError | null): void {
  byId('err').textContent = error ? ERROR_MESSAGES[error] : '';
}

/** Blank out every result so a stale number never sits next to an error message. */
export function clearResults(): void {
  for (const id of PLACEHOLDER_IDS) byId(id).textContent = '—';
  for (const id of ['arcPrincipal', 'arcInterest'])
    byId(id).setAttribute('stroke-dasharray', '0 999');
  byId('donutPct').textContent = '—';
  byId('meter').hidden = true;
  byId('savings').hidden = true;
  renderBalanceChart(0, [], null);
  renderScheduleTable([]);
  byId('results').classList.add('is-empty');
}

export function showResult(r: LoanResult): void {
  byId('results').classList.remove('is-empty');
  byId('monthlyPayment').textContent = formatEurExact(r.monthlyPayment);
  byId('legendPrincipal').textContent = formatEur(r.loan);
  byId('legendInterest').textContent = formatEur(r.totalInterest);
  byId('statLoan').textContent = formatEur(r.loan);
  byId('statTotal').textContent = formatEur(r.totalPaid);
  byId('statCount').textContent = formatInt(r.paymentCount);
  byId('statOverpay').textContent = formatPct(r.overpaymentRatio);

  renderDonut(r.principalShare);
}

export function showAffordability(a: { ratio: number; level: AffordabilityLevel } | null): void {
  const meter = byId('meter');
  meter.hidden = !a;
  if (!a) return;
  meter.dataset.level = a.level;
  byId('meterPct').textContent = formatPct(a.ratio);
  byId('meterFill').style.width = `${Math.min(100, (a.ratio * 100) / 0.6)}%`;
  byId('meterVerdict').textContent = VERDICTS[a.level];
}

export function showSchedule(loan: number, standard: Schedule, extra: Schedule | null): void {
  renderBalanceChart(loan, standard.months, extra ? extra.months : null);
  renderScheduleTable(summarizeByYear((extra ?? standard).months));

  const box = byId('savings');
  box.hidden = !extra;
  if (!extra) return;
  const monthsSaved = standard.months.length - extra.months.length;
  const interestSaved = standard.totalInterest - extra.totalInterest;
  box.replaceChildren();
  const strong = (t: string) => {
    const b = document.createElement('strong');
    b.textContent = t;
    return b;
  };
  box.append(
    'Nice! With your extra payment you finish ',
    strong(formatDuration(monthsSaved)),
    ' sooner and save ',
    strong(formatEur(interestSaved)),
    ' in interest.',
  );
}
