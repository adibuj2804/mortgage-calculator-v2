import './styles/main.css';
import { calculateLoan, downPaymentFromPct, downPaymentPctFromAmount } from './calc/mortgage';
import { byId, readNumber } from './ui/dom';
import { showError, showResult } from './ui/results';

const priceEl = byId<HTMLInputElement>('price');
const dpAmountEl = byId<HTMLInputElement>('dpAmount');
const dpPctEl = byId<HTMLInputElement>('dpPct');
const rateEl = byId<HTMLInputElement>('rate');
const yearsEl = byId<HTMLInputElement>('years');
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
  const outcome = calculateLoan({
    price: readNumber(priceEl),
    downPayment: readNumber(dpAmountEl),
    annualRatePct: readNumber(rateEl),
    years: readNumber(yearsEl),
  });

  if (!outcome.ok) {
    showError(outcome.error);
    return;
  }
  showError(null);
  showResult(outcome.result);
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

form.addEventListener('submit', (e) => {
  e.preventDefault();
  calculate();
});

syncFromPct();
calculate();
