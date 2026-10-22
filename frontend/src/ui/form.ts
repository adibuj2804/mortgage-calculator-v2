import { calculateLoan } from '../calc/payment';
import { validateInputs, type FieldErrors, type RawInputs } from '../calc/validate';
import { formatEuro } from '../format/euro';

const FIELDS = ['loan', 'rate', 'years'] as const;

const TEMPLATE = `
  <form id="calculator" class="card" novalidate>
    <div class="field">
      <label for="loan">Loan amount (€)</label>
      <input id="loan" name="loan" type="text" inputmode="decimal" autocomplete="off" placeholder="100000" aria-describedby="loan-error">
      <p id="loan-error" class="error" role="alert"></p>
    </div>
    <div class="field">
      <label for="rate">Annual interest rate (%)</label>
      <input id="rate" name="rate" type="text" inputmode="decimal" autocomplete="off" placeholder="4" aria-describedby="rate-error">
      <p id="rate-error" class="error" role="alert"></p>
    </div>
    <div class="field">
      <label for="years">Term (years)</label>
      <input id="years" name="years" type="text" inputmode="numeric" autocomplete="off" placeholder="20" aria-describedby="years-error">
      <p id="years-error" class="error" role="alert"></p>
    </div>
    <button type="submit" class="button">Calculate</button>
  </form>
  <section id="result" class="card result" aria-live="polite" hidden>
    <h2 class="result__title">Your mortgage</h2>
    <dl class="figures">
      <div class="figure figure--main"><dt>Monthly payment</dt><dd id="result-payment"></dd></div>
      <div class="figure"><dt>Total paid</dt><dd id="result-total-paid"></dd></div>
      <div class="figure"><dt>Total interest</dt><dd id="result-total-interest"></dd></div>
    </dl>
  </section>
`;

function byId<T extends HTMLElement>(root: HTMLElement, id: string): T {
  const element = root.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
}

export function mountCalculator(root: HTMLElement): void {
  root.innerHTML = TEMPLATE;

  const form = byId<HTMLFormElement>(root, 'calculator');
  const result = byId(root, 'result');
  const figures = {
    payment: byId(root, 'result-payment'),
    totalPaid: byId(root, 'result-total-paid'),
    totalInterest: byId(root, 'result-total-interest'),
  };
  const inputs = Object.fromEntries(
    FIELDS.map((field) => [field, byId<HTMLInputElement>(root, field)]),
  ) as Record<(typeof FIELDS)[number], HTMLInputElement>;
  const slots = Object.fromEntries(
    FIELDS.map((field) => [field, byId(root, `${field}-error`)]),
  ) as Record<(typeof FIELDS)[number], HTMLElement>;

  function showErrors(errors: FieldErrors): void {
    for (const field of FIELDS) {
      const message = errors[field] ?? '';
      slots[field].textContent = message;
      inputs[field].setAttribute('aria-invalid', String(message !== ''));
    }
  }

  form.addEventListener('input', () => {
    result.hidden = true;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const raw: RawInputs = {
      loan: inputs.loan.value,
      rate: inputs.rate.value,
      years: inputs.years.value,
    };
    const checked = validateInputs(raw);

    if (!checked.ok) {
      showErrors(checked.errors);
      result.hidden = true;
      return;
    }

    showErrors({});
    const loan = calculateLoan(checked.value);
    figures.payment.textContent = formatEuro(loan.monthlyPayment);
    figures.totalPaid.textContent = formatEuro(loan.totalPaid);
    figures.totalInterest.textContent = formatEuro(loan.totalInterest);
    result.hidden = false;
  });
}
