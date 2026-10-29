import { ApiValidationError } from '../api/client';
import type { ApiClient } from '../api/client';
import type { CalculateRequest, CalculateResponse } from '../api/types';
import { formatCents } from '../format/euro';
import { formatSavedItem } from '../format/saved';
import { renderChart } from './chart';
import { renderSchedule } from './scheduleTable';

const SAVED_LIST_SIZE = 20;
const NO_CONNECTION = "Can't reach the calculator. Try again.";
const SAVE_FAILED = 'Could not save right now. Your result is still here.';
const LIST_UNAVAILABLE = 'Saved calculations are unavailable right now.';
const SCHEDULE_NOTE =
  'The last payment is adjusted so that the balance ends at exactly 0.00 €. The totals here can differ slightly from the figures above.';

// API field name -> id of the input on the page (the error slot is `<id>-error`).
const FIELDS = {
  loan: 'loan',
  annual_rate_percent: 'rate',
  term_years: 'years',
  extra_monthly_payment: 'extra',
} as const;
type Field = keyof typeof FIELDS;

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
    <div class="field">
      <label for="extra">Extra monthly payment (€, optional)</label>
      <input id="extra" name="extra" type="text" inputmode="decimal" autocomplete="off" placeholder="0" aria-describedby="extra-error">
      <p id="extra-error" class="error" role="alert"></p>
    </div>
    <button type="submit" class="button">Calculate</button>
    <p id="calc-error" class="error" role="alert"></p>
  </form>
  <section id="result" class="card result" aria-live="polite" hidden>
    <h2 class="result__title">Your mortgage</h2>
    <dl class="figures">
      <div class="figure figure--main"><dt>Monthly payment</dt><dd id="result-payment"></dd></div>
      <div class="figure"><dt>Total paid</dt><dd id="result-total-paid"></dd></div>
      <div class="figure"><dt>Total interest</dt><dd id="result-total-interest"></dd></div>
    </dl>
    <div id="extra-result" class="extra" hidden>
      <h3>With your extra payment</h3>
      <dl class="figures">
        <div class="figure"><dt>Loan ends after</dt><dd id="result-payoff"></dd></div>
        <div class="figure"><dt>Months saved</dt><dd id="result-months-saved"></dd></div>
        <div class="figure"><dt>Interest with extra payments</dt><dd id="result-extra-interest"></dd></div>
        <div class="figure"><dt>Interest saved</dt><dd id="result-interest-saved"></dd></div>
      </dl>
    </div>
    <section id="schedule" class="schedule">
      <h3>Repayment schedule</h3>
      <svg id="balance-chart" viewBox="0 0 640 284" role="img" aria-labelledby="balance-chart-title"></svg>
      <ul class="chart-legend">
        <li><span class="swatch swatch--standard"></span>Standard payments</li>
        <li id="chart-legend-extra" hidden><span class="swatch swatch--extra"></span>With extra payment</li>
      </ul>
      <p class="chart-hint">Hover or use the arrow keys on the chart to read the balance for each year.</p>
      <div class="table-wrap">
        <table id="schedule-table">
          <thead><tr><th>Year</th><th>Paid</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead>
          <tbody id="schedule-body"></tbody>
          <tfoot><tr id="schedule-total"></tr></tfoot>
        </table>
      </div>
      <p id="schedule-note" class="note"></p>
    </section>
    <div class="save">
      <button type="button" id="save-button" class="button button--secondary">Save this calculation</button>
      <p id="save-status" role="status"></p>
    </div>
  </section>
  <section id="saved" class="card">
    <h2 class="result__title">Saved calculations</h2>
    <ul id="saved-list"></ul>
    <p id="saved-message" role="status"></p>
  </section>
`;

function byId<T extends Element = HTMLElement>(root: HTMLElement, id: string): T {
  const element = root.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
}

const months = (count: number) => `${count} ${count === 1 ? 'month' : 'months'}`;

export function mountCalculator(root: HTMLElement, api: ApiClient, clientId: string): void {
  root.innerHTML = TEMPLATE;

  const form = byId<HTMLFormElement>(root, 'calculator');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const result = byId(root, 'result');
  const calcError = byId(root, 'calc-error');
  const extraBlock = byId(root, 'extra-result');
  const saveButton = byId<HTMLButtonElement>(root, 'save-button');
  const saveStatus = byId(root, 'save-status');
  const savedList = byId(root, 'saved-list');
  const savedMessage = byId(root, 'saved-message');
  const inputs = Object.fromEntries(
    (Object.entries(FIELDS) as Array<[Field, string]>).map(([field, id]) => [
      field,
      byId<HTMLInputElement>(root, id),
    ]),
  ) as Record<Field, HTMLInputElement>;
  const slots = Object.fromEntries(
    (Object.entries(FIELDS) as Array<[Field, string]>).map(([field, id]) => [
      field,
      byId(root, `${id}-error`),
    ]),
  ) as Record<Field, HTMLElement>;

  let counter = 0;
  let calculating = false;
  let saving = false;
  let saved = false;
  let listCounter = 0;
  let shown: CalculateRequest | null = null;

  const setText = (id: string, content: string) => {
    byId(root, id).textContent = content;
  };

  function showErrors(errors: Partial<Record<Field, string>>): void {
    for (const field of Object.keys(FIELDS) as Field[]) {
      const message = errors[field] ?? '';
      slots[field].textContent = message;
      inputs[field].setAttribute('aria-invalid', String(message !== ''));
    }
  }

  function setSaveButton(state: 'ready' | 'saving' | 'saved'): void {
    saveButton.disabled = state !== 'ready';
    saveButton.textContent = { ready: 'Save this calculation', saving: 'Saving…', saved: 'Saved' }[
      state
    ];
  }

  function showResult(response: CalculateResponse): void {
    const { result: figures, extra_payment: extra, schedule, input } = response;
    setText('result-payment', formatCents(figures.monthly_payment_cents));
    setText('result-total-paid', formatCents(figures.total_paid_cents));
    setText('result-total-interest', formatCents(figures.total_interest_cents));

    extraBlock.hidden = extra === null;
    if (extra) {
      setText('result-payoff', months(extra.months_to_payoff));
      setText('result-months-saved', months(extra.months_saved));
      setText('result-extra-interest', formatCents(extra.total_interest_cents));
      setText('result-interest-saved', formatCents(extra.interest_saved_cents));
    }

    renderSchedule(byId(root, 'schedule-body'), byId(root, 'schedule-total'), schedule);
    setText('schedule-note', SCHEDULE_NOTE);
    byId(root, 'chart-legend-extra').hidden = schedule.extra_balance_by_year_cents === null;
    renderChart(
      byId<SVGElement>(root, 'balance-chart'),
      [input.loan_cents, ...schedule.yearly.map((year) => year.end_balance_cents)],
      schedule.extra_balance_by_year_cents,
    );

    saved = false;
    saveStatus.textContent = '';
    setSaveButton('ready');
    result.hidden = false;
  }

  async function loadList(): Promise<void> {
    const mine = (listCounter += 1);
    try {
      const items = await api.list(clientId, SAVED_LIST_SIZE);
      if (mine !== listCounter) return;
      savedList.replaceChildren(
        ...items.map((item) => {
          const li = document.createElement('li');
          li.textContent = formatSavedItem(item);
          return li;
        }),
      );
      savedMessage.textContent = items.length === 0 ? 'Nothing saved yet.' : '';
    } catch {
      if (mine !== listCounter) return;
      savedList.replaceChildren();
      savedMessage.textContent = LIST_UNAVAILABLE;
    }
  }

  async function save(): Promise<void> {
    if (saving || saved || shown === null) return;
    const request = shown;
    const started = counter;
    saving = true;
    setSaveButton('saving');
    try {
      await api.save(request, clientId);
      if (counter === started) {
        saveStatus.textContent = 'Saved.';
        saved = true;
        setSaveButton('saved');
      }
      void loadList();
    } catch {
      if (counter === started) {
        saveStatus.textContent = SAVE_FAILED;
        setSaveButton('ready');
      }
    } finally {
      saving = false;
    }
  }

  form.addEventListener('input', () => {
    counter += 1;
    result.hidden = true;
    saveStatus.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (calculating) return;

    const request: CalculateRequest = {
      loan: inputs.loan.value,
      annual_rate_percent: inputs.annual_rate_percent.value,
      term_years: inputs.term_years.value,
      extra_monthly_payment: inputs.extra_monthly_payment.value,
    };
    const started = (counter += 1);
    result.hidden = true;
    calcError.textContent = '';
    saveStatus.textContent = '';
    calculating = true;
    submit.disabled = true;
    submit.textContent = 'Calculating…';

    try {
      const response = await api.calculate(request);
      if (counter !== started) return;
      showErrors({});
      shown = request;
      showResult(response);
    } catch (error) {
      if (counter !== started) return;
      if (error instanceof ApiValidationError) showErrors(error.errors);
      else calcError.textContent = NO_CONNECTION;
    } finally {
      calculating = false;
      submit.disabled = false;
      submit.textContent = 'Calculate';
    }
  });

  saveButton.addEventListener('click', () => void save());
  void loadList();
}
