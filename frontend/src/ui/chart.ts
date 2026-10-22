import { formatCents } from '../format/euro';

const SVG = 'http://www.w3.org/2000/svg';
const PLOT = { width: 520, height: 200, left: 70, top: 10 };

type Box = { width: number; height: number; points: number; max: number };

const round = (value: number) => String(Number(value.toFixed(2)));

// Both lines use the scale of the standard line, so a shorter line ends before the right edge.
export function chartPoints(balances: number[], { width, height, points, max }: Box): string {
  if (balances.length === 0 || points < 2 || max <= 0 || balances.length > points) {
    throw new RangeError('Cannot draw this series');
  }
  return balances
    .map((balance, index) => {
      const x = (index / (points - 1)) * width;
      const y = (1 - balance / max) * height;
      return `${round(x)},${round(y)}`;
    })
    .join(' ');
}

function element<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function axisLabel(content: string, x: number, y: number, anchor: 'start' | 'end'): SVGTextElement {
  const label = element('text', {
    class: 'axis',
    x: String(x),
    y: String(y),
    'text-anchor': anchor,
  });
  label.textContent = content;
  return label;
}

export function renderChart(svg: SVGElement, standard: number[], extra?: number[] | null): void {
  const max = standard[0] ?? 0;
  const box = { width: PLOT.width, height: PLOT.height, points: standard.length, max };
  const title = element('title', { id: 'balance-chart-title' });
  title.textContent = 'Remaining balance by year';

  const group = element('g', { transform: `translate(${PLOT.left},${PLOT.top})` });
  group.append(
    element('rect', { class: 'plot', width: String(PLOT.width), height: String(PLOT.height) }),
  );
  const lines: Array<[string, number[]]> = [['standard', standard]];
  if (extra) lines.push(['extra', extra]);
  for (const [name, balances] of lines) {
    group.append(
      element('polyline', {
        class: `line line--${name}`,
        'data-balances': balances.join(','),
        points: chartPoints(balances, box),
        fill: 'none',
      }),
    );
  }

  const bottom = PLOT.top + PLOT.height;
  svg.replaceChildren(
    title,
    group,
    axisLabel('Year 0', PLOT.left, bottom + 22, 'start'),
    axisLabel(`Year ${standard.length - 1}`, PLOT.left + PLOT.width, bottom + 22, 'end'),
    axisLabel(formatCents(max), PLOT.left + PLOT.width - 6, PLOT.top + 16, 'end'),
    axisLabel('0.00 €', PLOT.left + 6, bottom - 6, 'start'),
  );
}
