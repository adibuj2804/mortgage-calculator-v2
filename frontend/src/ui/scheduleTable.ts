import { formatCents } from '../format/euro';
import type { Schedule } from '../api/types';

function row(cells: string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const content of cells) {
    const td = document.createElement('td');
    td.textContent = content;
    tr.append(td);
  }
  return tr;
}

export function renderSchedule(
  tbody: HTMLElement,
  totalRow: HTMLElement,
  schedule: Schedule,
): void {
  tbody.replaceChildren(
    ...schedule.yearly.map((year) =>
      row([
        String(year.year),
        formatCents(year.payments_cents),
        formatCents(year.interest_cents),
        formatCents(year.principal_cents),
        formatCents(year.end_balance_cents),
      ]),
    ),
  );
  totalRow.replaceChildren(
    ...row([
      'Total',
      formatCents(schedule.total_payments_cents),
      formatCents(schedule.total_interest_cents),
      '',
      '',
    ]).children,
  );
}
