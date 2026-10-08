import type { YearRow } from '../calc/schedule';
import { formatEur } from '../format';
import { byId } from './dom';

export function renderScheduleTable(years: YearRow[]): void {
  const body = byId('scheduleBody');
  body.replaceChildren(
    ...years.map((y) => {
      const tr = document.createElement('tr');
      for (const text of [
        String(y.year),
        formatEur(y.principal),
        formatEur(y.interest),
        formatEur(y.balance),
      ]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      }
      return tr;
    }),
  );
}
