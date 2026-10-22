// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mountCalculator } from './form';

const byId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

const type = (id: string, value: string) => {
  const input = byId(id) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const fill = (loan: string, rate: string, years: string) => {
  type('loan', loan);
  type('rate', rate);
  type('years', years);
};

const press = () => {
  const button = document.querySelector<HTMLButtonElement>('#calculator button[type="submit"]');
  if (!button) throw new Error('Missing Calculate button');
  button.click();
};

const resultVisible = () => !byId('result').hidden;
const errors = () =>
  [byId('loan-error'), byId('rate-error'), byId('years-error')].map((e) => e.textContent);
const figures = () => [
  byId('result-payment').textContent,
  byId('result-total-paid').textContent,
  byId('result-total-interest').textContent,
];

const RATE_RANGE = 'Rate must be between 0 and 25 %';

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  mountCalculator(byId('root'));
});

describe('calculator form end to end', () => {
  it('e2e-happy-path-100k-4pct-20y', () => {
    fill('100000', '4', '20');
    press();

    expect(resultVisible()).toBe(true);
    expect(figures()).toEqual(['605.98 €', '145,435.20 €', '45,435.20 €']);
    expect(errors()).toEqual(['', '', '']);
  });

  it('e2e-zero-rate-120k-10y', () => {
    fill('120000', '0', '10');
    press();

    expect(figures()).toEqual(['1,000.00 €', '120,000.00 €', '0.00 €']);
  });

  it('e2e-no-result-before-calculate', () => {
    fill('100000', '4', '20');

    expect(resultVisible()).toBe(false);
  });

  it('e2e-enter-key-calculates', () => {
    fill('100000', '4', '20');
    (byId('calculator') as HTMLFormElement).requestSubmit();

    expect(resultVisible()).toBe(true);
    expect(byId('result-payment').textContent).toBe('605.98 €');
  });

  it('e2e-invalid-shows-messages-no-result', () => {
    fill('', '30', '20');
    press();

    expect(errors()).toEqual(['Enter a number', RATE_RANGE, '']);
    expect(resultVisible()).toBe(false);
  });

  it('e2e-decimal-comma-shows-message', () => {
    fill('100000', '3,75', '20');
    press();

    expect(errors()).toEqual(['', 'Enter a number', '']);
    expect(resultVisible()).toBe(false);
  });

  it('e2e-invalid-after-result-clears-result', () => {
    fill('100000', '4', '20');
    press();
    expect(resultVisible()).toBe(true);

    type('rate', '30');
    press();

    expect(resultVisible()).toBe(false);
    expect(byId('rate-error').textContent).toBe(RATE_RANGE);
  });

  it('e2e-fixing-input-clears-messages', () => {
    fill('', '4', '20');
    press();
    expect(byId('loan-error').textContent).toBe('Enter a number');

    type('loan', '100000');
    press();

    expect(errors()).toEqual(['', '', '']);
    expect(resultVisible()).toBe(true);
    expect(byId('result-payment').textContent).toBe('605.98 €');
  });

  it('e2e-edit-hides-stale-result', () => {
    fill('100000', '4', '20');
    press();
    expect(resultVisible()).toBe(true);

    type('years', '25');
    expect(resultVisible()).toBe(false);

    press();
    expect(byId('result-payment').textContent).toBe('527.84 €');
  });

  it('e2e-edit-any-field-hides-result', () => {
    fill('100000', '4', '20');
    press();

    type('loan', '120000');
    expect(resultVisible()).toBe(false);

    press();
    expect(resultVisible()).toBe(true);

    type('rate', '5');
    expect(resultVisible()).toBe(false);
  });

  it('e2e-message-stays-until-next-press', () => {
    fill('', '4', '20');
    press();

    type('loan', '100000');
    expect(byId('loan-error').textContent).toBe('Enter a number');
    expect(resultVisible()).toBe(false);

    press();
    expect(byId('loan-error').textContent).toBe('');
    expect(resultVisible()).toBe(true);
  });

  it('e2e-currency-is-euro-only', () => {
    fill('100000', '4', '20');
    press();

    for (const text of figures()) {
      expect(text?.endsWith(' €')).toBe(true);
    }
    expect(document.querySelector('select')).toBeNull();
  });

  it('e2e-labels-are-linked-to-fields', () => {
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
