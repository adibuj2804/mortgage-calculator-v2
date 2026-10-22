// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../api/client';
import { CLIENT_ID, deferred, example, fakeServer, LIST_PATH, reply } from '../testing/examples';
import type { Call } from '../testing/examples';
import { mountCalculator } from './form';

const $ = (id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
};

const type = (id: string, value: string) => {
  const input = $(id) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const fill = (loan: string, rate: string, years: string, extra = '') => {
  type('loan', loan);
  type('rate', rate);
  type('years', years);
  type('extra', extra);
};

const press = () => {
  const button = document.querySelector<HTMLButtonElement>('#calculator button[type="submit"]');
  if (!button) throw new Error('Missing Calculate button');
  button.click();
};

const settle = async () => {
  for (let round = 0; round < 12; round += 1) await new Promise((done) => setTimeout(done, 0));
};

const text = (id: string) => $(id).textContent;
const resultVisible = () => !$('result').hidden;
const slots = () => ['loan-error', 'rate-error', 'years-error'].map(text);
const figures = () => ['result-payment', 'result-total-paid', 'result-total-interest'].map(text);
const saveButton = () => $('save-button') as HTMLButtonElement;
const calcButton = () =>
  document.querySelector<HTMLButtonElement>('#calculator button[type="submit"]')!;

const isCalculate = (call: Call) => call.method === 'POST' && call.path === '/api/v1/calculate';
const isSave = (call: Call) => call.method === 'POST' && call.path === '/api/v1/calculations';
const isList = (call: Call) =>
  call.method === 'GET' && call.path.startsWith('/api/v1/calculations');
const offline = () => Promise.reject(new TypeError('network down'));
const exampleReply = (name: string) => {
  const found = example(name);
  return reply(found.status, found.response);
};
const listOfTwo = () => exampleReply('list-newest-first');

type Override = (call: Call, index: number) => Response | Promise<Response> | undefined;

function mount(override?: Override) {
  document.body.innerHTML = '<div id="root"></div>';
  const server = fakeServer(override);
  const api = createApiClient('http://api.test', server.fetchFn);
  mountCalculator($('root'), api, CLIENT_ID);
  return server;
}

const RATE_RANGE = 'Rate must be between 0 and 25 %';
const FAILED_SAVE = 'Could not save right now. Your result is still here.';
const NO_CONNECTION = "Can't reach the calculator. Try again.";

describe('calculator form end to end (ported from V1)', () => {
  it('e2e-happy-path-100k-4pct-20y', async () => {
    mount();
    fill('100000', '4', '20');
    press();
    await settle();

    expect(resultVisible()).toBe(true);
    expect(figures()).toEqual(['605.98 €', '145,435.20 €', '45,435.20 €']);
    expect(slots()).toEqual(['', '', '']);
  });

  it('e2e-zero-rate-120k-10y', async () => {
    mount();
    fill('120000', '0', '10');
    press();
    await settle();

    expect(figures()).toEqual(['1,000.00 €', '120,000.00 €', '0.00 €']);
  });

  it('e2e-no-result-before-calculate', async () => {
    mount();
    fill('100000', '4', '20');
    await settle();

    expect(resultVisible()).toBe(false);
  });

  it('e2e-enter-key-calculates', async () => {
    mount();
    fill('100000', '4', '20');
    ($('calculator') as HTMLFormElement).requestSubmit();
    await settle();

    expect(resultVisible()).toBe(true);
    expect(text('result-payment')).toBe('605.98 €');
  });

  it('e2e-invalid-shows-messages-no-result', async () => {
    mount();
    fill('', '30', '20');
    press();
    await settle();

    expect(slots()).toEqual(['Enter a number', RATE_RANGE, '']);
    expect(resultVisible()).toBe(false);
  });

  it('e2e-decimal-comma-shows-message', async () => {
    mount();
    fill('100000', '3,75', '20');
    press();
    await settle();

    expect(slots()).toEqual(['', 'Enter a number', '']);
    expect(resultVisible()).toBe(false);
  });

  it('e2e-invalid-after-result-clears-result', async () => {
    mount();
    fill('100000', '4', '20');
    press();
    await settle();
    expect(resultVisible()).toBe(true);

    type('rate', '30');
    press();
    await settle();

    expect(resultVisible()).toBe(false);
    expect(text('rate-error')).toBe(RATE_RANGE);
  });

  it('e2e-fixing-input-clears-messages', async () => {
    mount();
    fill('', '4', '20');
    press();
    await settle();
    expect(text('loan-error')).toBe('Enter a number');

    type('loan', '100000');
    press();
    await settle();

    expect(slots()).toEqual(['', '', '']);
    expect(resultVisible()).toBe(true);
    expect(text('result-payment')).toBe('605.98 €');
  });

  it('e2e-edit-hides-stale-result', async () => {
    mount();
    fill('100000', '4', '20');
    press();
    await settle();
    expect(resultVisible()).toBe(true);

    type('years', '25');
    expect(resultVisible()).toBe(false);

    press();
    await settle();
    expect(text('result-payment')).toBe('527.84 €');
  });

  it('e2e-edit-any-field-hides-result', async () => {
    mount();
    fill('100000', '4', '20');
    press();
    await settle();

    type('loan', '120000');
    expect(resultVisible()).toBe(false);

    press();
    await settle();
    expect(resultVisible()).toBe(true);

    type('rate', '5');
    expect(resultVisible()).toBe(false);
  });

  it('e2e-message-stays-until-next-press', async () => {
    mount();
    fill('', '4', '20');
    press();
    await settle();

    type('loan', '100000');
    expect(text('loan-error')).toBe('Enter a number');
    expect(resultVisible()).toBe(false);

    press();
    await settle();
    expect(text('loan-error')).toBe('');
    expect(resultVisible()).toBe(true);
  });

  it('e2e-currency-is-euro-only', async () => {
    mount();
    fill('100000', '4', '20');
    press();
    await settle();

    for (const figure of figures()) expect(figure?.endsWith(' €')).toBe(true);
    expect(document.querySelector('select')).toBeNull();
  });

  it('e2e-labels-are-linked-to-fields', () => {
    mount();
    const expected: Array<[string, string]> = [
      ['Loan amount (€)', 'loan'],
      ['Annual interest rate (%)', 'rate'],
      ['Term (years)', 'years'],
    ];
    for (const [labelText, id] of expected) {
      const label = Array.from(document.querySelectorAll('label')).find(
        (l) => l.textContent === labelText,
      );
      expect(label, labelText).toBeDefined();
      expect(label?.htmlFor).toBe(id);
      expect(document.getElementById(id)?.tagName).toBe('INPUT');
    }
  });
});

describe('requests in flight and failures (FR9, FR10)', () => {
  it('form-disables-button-while-pending', async () => {
    const gate = deferred<Response>();
    mount((call) => (isCalculate(call) ? gate.promise : undefined));
    fill('100000', '4', '20');
    press();

    expect(calcButton().disabled).toBe(true);
    expect(calcButton().textContent).toBe('Calculating…');

    gate.resolve(exampleReply('calculate-100k-4pct-20y'));
    await settle();
    expect(calcButton().disabled).toBe(false);
    expect(calcButton().textContent).toBe('Calculate');
  });

  it('form-ignores-submit-while-pending', async () => {
    const gate = deferred<Response>();
    const server = mount((call) => (isCalculate(call) ? gate.promise : undefined));
    fill('100000', '4', '20');
    press();
    press();
    ($('calculator') as HTMLFormElement).requestSubmit();

    gate.resolve(exampleReply('calculate-100k-4pct-20y'));
    await settle();
    expect(server.calls.filter(isCalculate)).toHaveLength(1);
  });

  it('form-ignores-late-reply-after-edit', async () => {
    const gate = deferred<Response>();
    mount((call) => (isCalculate(call) ? gate.promise : undefined));
    fill('100000', '4', '20');
    press();
    type('years', '25');

    gate.resolve(exampleReply('calculate-100k-4pct-20y'));
    await settle();
    expect(resultVisible()).toBe(false);
    expect(slots()).toEqual(['', '', '']);
    expect(calcButton().disabled).toBe(false);
  });

  it('form-ignores-late-422-and-failure-after-edit', async () => {
    const lateReplies: Array<() => Promise<Response> | Response> = [
      () => exampleReply('calculate-422-rate-30'),
      () => Promise.reject(new TypeError('network down')),
    ];
    for (const makeReply of lateReplies) {
      const gate = deferred<void>();
      mount((call) => (isCalculate(call) ? gate.promise.then(makeReply) : undefined));
      fill('100000', '4', '20');
      press();
      type('years', '25');

      gate.resolve();
      await settle();
      expect(resultVisible()).toBe(false);
      expect(slots()).toEqual(['', '', '']);
      expect(text('calc-error')).toBe('');
      expect(calcButton().disabled).toBe(false);
    }
  });

  it('form-offline-shows-message-and-keeps-values', async () => {
    mount((call) => (isCalculate(call) ? offline() : undefined));
    fill('100000', '4', '20');
    press();
    await settle();

    expect(text('calc-error')).toBe(NO_CONNECTION);
    expect(resultVisible()).toBe(false);
    expect(($('loan') as HTMLInputElement).value).toBe('100000');
    expect(($('rate') as HTMLInputElement).value).toBe('4');
    expect(($('years') as HTMLInputElement).value).toBe('20');
  });

  it('form-hides-old-result-when-calculation-fails-offline', async () => {
    let calculations = 0;
    mount((call) => {
      if (!isCalculate(call)) return undefined;
      calculations += 1;
      return calculations === 1 ? undefined : offline();
    });
    fill('100000', '4', '20');
    press();
    await settle();
    expect(resultVisible()).toBe(true);

    press();
    await settle();
    expect(resultVisible()).toBe(false);
    expect(text('calc-error')).toBe(NO_CONNECTION);
  });

  it('form-calc-error-cleared-on-next-submit', async () => {
    let calculations = 0;
    mount((call) => {
      if (!isCalculate(call)) return undefined;
      calculations += 1;
      return calculations === 1 ? offline() : undefined;
    });
    fill('100000', '4', '20');
    press();
    await settle();
    expect(text('calc-error')).toBe(NO_CONNECTION);

    press();
    await settle();
    expect(text('calc-error')).toBe('');
    expect(resultVisible()).toBe(true);
  });
});

describe('extra payment (FR6)', () => {
  it('form-extra-field-sent-and-extra-result-shown', async () => {
    const server = mount();
    fill('100000', '4', '20', '200');
    press();
    await settle();

    expect(server.calls.find(isCalculate)?.body).toEqual({
      loan: '100000',
      annual_rate_percent: '4',
      term_years: '20',
      extra_monthly_payment: '200',
    });
    expect($('extra-result').hidden).toBe(false);
    expect(text('result-payoff')).toBe('161 months');
    expect(text('result-months-saved')).toBe('79 months');
    expect(text('result-extra-interest')).toBe('29,263.29 €');
    expect(text('result-interest-saved')).toBe('16,171.92 €');
    expect(figures()).toEqual(['605.98 €', '145,435.20 €', '45,435.20 €']);
  });

  it('form-extra-singular-month', async () => {
    mount();
    fill('100000', '4', '20', '100000');
    press();
    await settle();

    expect(text('result-payoff')).toBe('1 month');
    expect(text('result-months-saved')).toBe('239 months');
    expect(text('result-extra-interest')).toBe('333.33 €');
    expect(text('result-interest-saved')).toBe('45,101.88 €');
  });

  it('form-extra-result-hidden-when-no-extra', async () => {
    mount();
    fill('100000', '4', '20');
    press();
    await settle();

    expect($('extra-result').hidden).toBe(true);
  });

  it('form-extra-error-is-shown-in-its-slot', async () => {
    mount();
    fill('100000', '4', '20', '100000.01');
    press();
    await settle();

    expect(text('extra-error')).toBe('Extra payment must be between 0 and the loan amount');
    expect(slots()).toEqual(['', '', '']);
    expect(resultVisible()).toBe(false);
  });

  it('form-edit-extra-hides-result', async () => {
    mount();
    fill('100000', '4', '20');
    press();
    await settle();
    expect(resultVisible()).toBe(true);

    type('extra', '200');
    expect(resultVisible()).toBe(false);
    expect($('schedule').closest('#result')?.hasAttribute('hidden')).toBe(true);
    expect($('save-button').closest('#result')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('repayment schedule and balance chart (FR11, FR12)', () => {
  const calculate = async (extra = '') => {
    mount();
    fill('100000', '4', '20', extra);
    press();
    await settle();
  };
  const cells = (row: Element) => Array.from(row.children).map((cell) => cell.textContent);
  const line = (name: 'standard' | 'extra') =>
    document.querySelector(`#balance-chart polyline.line--${name}`);

  it('form-schedule-table-shows-yearly-rows', async () => {
    await calculate();
    const rows = Array.from($('schedule-body').querySelectorAll('tr'));

    expect(rows).toHaveLength(20);
    expect(cells(rows[0]!)).toEqual(['1', '7,271.76 €', '3,939.34 €', '3,332.42 €', '96,667.58 €']);
    expect(cells(rows[19]!)).toEqual(['20', '7,271.77 €', '155.12 €', '7,116.65 €', '0.00 €']);
    expect(cells($('schedule-total'))).toEqual(['Total', '145,435.21 €', '45,435.21 €', '', '']);
  });

  it('form-schedule-note-is-shown', async () => {
    await calculate();
    expect(text('schedule-note')).toBe(
      'The last payment is adjusted so that the balance ends at exactly 0.00 €. The totals here can differ slightly from the figures above.',
    );
  });

  it('form-chart-has-balance-line', async () => {
    await calculate();
    const balances = line('standard')?.getAttribute('data-balances')?.split(',');

    expect(balances).toHaveLength(21);
    expect(balances?.[0]).toBe('10000000');
    expect(balances?.[20]).toBe('0');
    const chart = $('balance-chart');
    expect(chart.querySelector('title')?.textContent).toBe('Remaining balance by year');
    const labels = Array.from(chart.querySelectorAll('text.axis')).map(
      (label) => label.textContent,
    );
    expect(labels).toEqual(expect.arrayContaining(['Year 0', 'Year 20', '100,000.00 €', '0.00 €']));
  });

  it('form-chart-has-second-line-with-extra', async () => {
    await calculate('200');
    const balances = line('extra')?.getAttribute('data-balances')?.split(',');

    expect(balances).toHaveLength(15);
    expect(balances?.[0]).toBe('10000000');
    expect(balances?.[14]).toBe('0');
  });

  it('form-chart-second-line-ends-earlier', async () => {
    await calculate('200');
    const standard = line('standard')?.getAttribute('points') ?? '';
    const extra = line('extra')?.getAttribute('points') ?? '';

    expect(standard.startsWith('0,0 ')).toBe(true);
    expect(standard.endsWith(' 520,200')).toBe(true);
    expect(extra.startsWith('0,0 ')).toBe(true);
    expect(extra.endsWith(' 364,200')).toBe(true);
  });

  it('form-chart-has-no-second-line-without-extra', async () => {
    await calculate();
    expect(line('extra')).toBeNull();
  });
});

describe('saving (FR7)', () => {
  const calculated = async (override?: Override) => {
    const server = mount(override);
    fill('100000', '4', '20');
    press();
    await settle();
    return server;
  };

  it('form-save-button-saves-and-reports', async () => {
    const server = await calculated();
    saveButton().click();
    await settle();

    const saves = server.calls.filter(isSave);
    expect(saves).toHaveLength(1);
    expect(saves[0]?.body).toEqual({
      loan: '100000',
      annual_rate_percent: '4',
      term_years: '20',
      extra_monthly_payment: '',
      client_id: CLIENT_ID,
    });
    expect(text('save-status')).toBe('Saved.');
    expect(resultVisible()).toBe(true);
  });

  it('form-save-button-stays-disabled-after-saved', async () => {
    const server = await calculated();
    saveButton().click();
    await settle();

    expect(saveButton().disabled).toBe(true);
    expect(saveButton().textContent).toBe('Saved');
    saveButton().click();
    await settle();
    expect(server.calls.filter(isSave)).toHaveLength(1);
  });

  it('form-save-can-retry-after-failure', async () => {
    let saves = 0;
    const server = await calculated((call) => {
      if (!isSave(call)) return undefined;
      saves += 1;
      return saves === 1 ? exampleReply('save-database-unavailable') : undefined;
    });
    saveButton().click();
    await settle();
    expect(text('save-status')).toBe(FAILED_SAVE);
    expect(saveButton().disabled).toBe(false);
    expect(saveButton().textContent).toBe('Save this calculation');

    saveButton().click();
    await settle();
    expect(text('save-status')).toBe('Saved.');
    expect(server.calls.filter(isSave)).toHaveLength(2);
  });

  it('form-save-button-disabled-while-saving', async () => {
    const gate = deferred<Response>();
    const server = await calculated((call) => (isSave(call) ? gate.promise : undefined));
    saveButton().click();
    saveButton().click();

    expect(saveButton().disabled).toBe(true);
    expect(saveButton().textContent).toBe('Saving…');
    gate.resolve(exampleReply('save-100k-4pct-20y'));
    await settle();
    expect(server.calls.filter(isSave)).toHaveLength(1);
  });

  it('form-save-failure-shows-error-keeps-result', async () => {
    await calculated((call) =>
      isSave(call) ? exampleReply('save-database-unavailable') : undefined,
    );
    saveButton().click();
    await settle();

    expect(text('save-status')).toBe(FAILED_SAVE);
    expect(resultVisible()).toBe(true);
  });

  it('form-save-unreachable-shows-failure-message', async () => {
    await calculated((call) => (isSave(call) ? offline() : undefined));
    saveButton().click();
    await settle();

    expect(text('save-status')).toBe(FAILED_SAVE);
    expect(resultVisible()).toBe(true);
  });

  it('form-late-save-reply-after-edit-refreshes-list-only', async () => {
    const gate = deferred<Response>();
    const server = await calculated((call) => (isSave(call) ? gate.promise : undefined));
    saveButton().click();
    type('years', '25');

    gate.resolve(exampleReply('save-100k-4pct-20y'));
    await settle();
    expect(text('save-status')).toBe('');
    expect(resultVisible()).toBe(false);
    expect(server.calls.filter(isList)).toHaveLength(2);
  });

  it('form-clears-save-status-on-edit-and-next-calculation', async () => {
    await calculated();
    saveButton().click();
    await settle();
    expect(text('save-status')).toBe('Saved.');

    type('years', '25');
    expect(text('save-status')).toBe('');

    type('years', '20');
    press();
    await settle();
    expect(text('save-status')).toBe('');
  });

  it('form-does-not-save-automatically', async () => {
    const server = await calculated();
    await settle();
    expect(server.calls.filter(isSave)).toHaveLength(0);
  });
});

describe('saved list (FR8)', () => {
  it('form-saved-list-loads-on-mount', async () => {
    mount((call) => (isList(call) ? listOfTwo() : undefined));
    await settle();

    const items = Array.from($('saved-list').querySelectorAll('li')).map(
      (item) => item.textContent,
    );
    expect(items).toEqual([
      '120,000.00 € · 0 % · 10 years · 1,000.00 € per month · 2026-01-01',
      '100,000.00 € · 4 % · 20 years · 605.98 € per month · 2026-01-01',
    ]);
    expect(text('saved-message')).toBe('');
  });

  it('form-asks-for-20-saved-items', async () => {
    const server = mount();
    await settle();

    expect(server.calls[0]).toEqual({ method: 'GET', path: LIST_PATH, body: null });
    expect(server.calls[0]?.path).toContain('limit=20');
  });

  it('form-saved-list-empty-message', async () => {
    mount((call) => (isList(call) ? exampleReply('list-empty') : undefined));
    await settle();

    expect(text('saved-message')).toBe('Nothing saved yet.');
    expect($('saved-list').querySelectorAll('li')).toHaveLength(0);
  });

  it('form-saved-list-failure-does-not-block-calculator', async () => {
    mount((call) => (isList(call) ? exampleReply('list-database-unavailable') : undefined));
    await settle();
    expect(text('saved-message')).toBe('Saved calculations are unavailable right now.');

    fill('100000', '4', '20');
    press();
    await settle();
    expect(figures()).toEqual(['605.98 €', '145,435.20 €', '45,435.20 €']);
  });

  it('form-list-unreachable-shows-unavailable-message', async () => {
    mount((call) => (isList(call) ? offline() : undefined));
    await settle();

    expect(text('saved-message')).toBe('Saved calculations are unavailable right now.');
  });

  it('form-saved-list-refreshes-after-save', async () => {
    let lists = 0;
    const server = mount((call) => {
      if (!isList(call)) return undefined;
      lists += 1;
      return lists === 1 ? exampleReply('list-empty') : listOfTwo();
    });
    await settle();
    expect($('saved-list').querySelectorAll('li')).toHaveLength(0);

    fill('100000', '4', '20');
    press();
    await settle();
    saveButton().click();
    await settle();

    expect(server.calls.filter(isList)).toHaveLength(2);
    expect($('saved-list').querySelectorAll('li')).toHaveLength(2);
  });

  it('form-applies-only-the-newest-list-request', async () => {
    const first = deferred<Response>();
    let lists = 0;
    mount((call) => {
      if (!isList(call)) return undefined;
      lists += 1;
      return lists === 1 ? first.promise : listOfTwo();
    });
    fill('100000', '4', '20');
    press();
    await settle();
    saveButton().click();
    await settle();
    expect($('saved-list').querySelectorAll('li')).toHaveLength(2);

    first.resolve(exampleReply('list-empty'));
    await settle();
    expect($('saved-list').querySelectorAll('li')).toHaveLength(2);
    expect(text('saved-message')).toBe('');
  });
});
