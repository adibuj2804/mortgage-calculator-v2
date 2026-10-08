import type { ScheduleRow } from '../calc/schedule';
import { formatEur } from '../format';
import { byId } from './dom';

const W = 640;
const H = 240;
const PAD = { left: 64, right: 12, top: 12, bottom: 28 };
const NS = 'http://www.w3.org/2000/svg';

function el(name: string, attrs: Record<string, string>, text?: string): SVGElement {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Remaining-balance line chart; `extra` (if any) is drawn on top of the standard schedule. */
export function renderBalanceChart(
  loan: number,
  standard: ScheduleRow[],
  extra: ScheduleRow[] | null,
): void {
  const box = byId('balanceChart');
  byId('legendExtra').hidden = !extra;
  if (standard.length === 0 || loan <= 0) {
    box.replaceChildren();
    return;
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const totalMonths = standard.length;
  const x = (month: number) => PAD.left + (month / totalMonths) * plotW;
  const y = (balance: number) => PAD.top + (1 - balance / loan) * plotH;

  const line = (rows: ScheduleRow[]) =>
    ['M ' + x(0) + ' ' + y(loan), ...rows.map((r) => `L ${x(r.month)} ${y(r.balance)}`)].join(' ');

  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-label': 'Remaining loan balance over time',
  });

  for (const f of [0, 0.5, 1]) {
    const gy = y(loan * f);
    svg.append(
      el('line', {
        x1: String(PAD.left),
        x2: String(W - PAD.right),
        y1: String(gy),
        y2: String(gy),
        stroke: 'var(--grid-line)',
        'stroke-dasharray': '4 4',
      }),
      el(
        'text',
        { x: String(PAD.left - 8), y: String(gy + 4), 'text-anchor': 'end' },
        formatEur(loan * f),
      ),
    );
  }

  const totalYears = totalMonths / 12;
  const step = totalYears > 20 ? 5 : totalYears > 8 ? 2 : 1;
  for (let yr = 0; yr <= totalYears; yr += step) {
    svg.append(
      el('text', { x: String(x(yr * 12)), y: String(H - 8), 'text-anchor': 'middle' }, `${yr}y`),
    );
  }

  svg.append(
    el('path', { d: line(standard), fill: 'none', stroke: 'var(--plum)', 'stroke-width': '2.5' }),
  );
  if (extra) {
    svg.append(
      el('path', { d: line(extra), fill: 'none', stroke: 'var(--accent)', 'stroke-width': '2.5' }),
    );
  }

  box.replaceChildren(svg);
}
