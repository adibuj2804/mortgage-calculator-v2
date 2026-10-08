import './styles/main.css';
import { calculateLoan, downPaymentFromPct, downPaymentPctFromAmount } from './calc/mortgage';
import { affordability, buildSchedule } from './calc/schedule';
import { byId, readNumber } from './ui/dom';
import { clearResults, showAffordability, showError, showResult, showSchedule } from './ui/results';

const priceEl = byId<HTMLInputElement>('price');
const dpAmountEl = byId<HTMLInputElement>('dpAmount');
const dpPctEl = byId<HTMLInputElement>('dpPct');
const rateEl = byId<HTMLInputElement>('rate');
const yearsEl = byId<HTMLInputElement>('years');
const incomeEl = byId<HTMLInputElement>('income');
const extraEl = byId<HTMLInputElement>('extra');
const scenarios = byId('scenarios');
const form = byId<HTMLFormElement>('form');
const presets = byId('presets');

const presetButtons = () => presets.querySelectorAll<HTMLButtonElement>('button');

function syncFromPct(): void {
  dpAmountEl.value = String(downPaymentFromPct(readNumber(priceEl), readNumber(dpPctEl)));
}

function syncFromAmount(): void {
  const pct = downPaymentPctFromAmount(readNumber(priceEl), readNumber(dpAmountEl));
  if (pct !== null) dpPctEl.value = String(pct);
}

function markPreset(years: string): void {
  presetButtons().forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.years === years)));
}

function calculate(): void {
  const input = {
    price: readNumber(priceEl),
    downPayment: readNumber(dpAmountEl),
    annualRatePct: readNumber(rateEl),
    years: readNumber(yearsEl),
  };
  const outcome = calculateLoan(input);

  if (!outcome.ok) {
    showError(outcome.error);
    clearResults();
    return;
  }

  showError(null);
  const { result } = outcome;
  showResult(result);
  showAffordability(affordability(result.monthlyPayment, readNumber(incomeEl)));

  const extra = readNumber(extraEl);
  const standard = buildSchedule(input);
  showSchedule(result.loan, standard, extra > 0 ? buildSchedule(input, extra) : null);
}

dpPctEl.addEventListener('input', syncFromPct);
dpAmountEl.addEventListener('input', syncFromAmount);
// Price changed: keep the down-payment percentage fixed, recompute the euro amount.
priceEl.addEventListener('input', syncFromPct);
yearsEl.addEventListener('input', () => markPreset(String(yearsEl.value)));

presets.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-years]');
  if (!btn?.dataset.years) return;
  yearsEl.value = btn.dataset.years;
  markPreset(btn.dataset.years);
});

scenarios.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-price]');
  if (!btn) return;
  const d = btn.dataset;
  priceEl.value = d.price ?? '';
  dpPctEl.value = d.dp ?? '';
  syncFromPct();
  rateEl.value = d.rate ?? '';
  yearsEl.value = d.years ?? '';
  incomeEl.value = d.income ?? '';
  markPreset(String(yearsEl.value));
  scenarios
    .querySelectorAll('button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  calculate();
});

// Recalculate live so students can see the effect of every change.
form.addEventListener('input', calculate);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  calculate();
});

syncFromPct();
calculate();
