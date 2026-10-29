import { formatCents } from '../format/euro';

const SVG = 'http://www.w3.org/2000/svg';
const PLOT = { width: 520, height: 200, left: 70, top: 34 };

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

// The filled area under a line: the line, then down to the baseline and back to the left edge.
export function areaPolygon(balances: number[], box: Box): string {
  const lastX = round(((balances.length - 1) / (box.points - 1)) * box.width);
  return `${chartPoints(balances, box)} ${lastX},${box.height} 0,${box.height}`;
}

// The index of the year whose point is closest to x (in plot units), clamped to the chart.
export function nearestYear(x: number, width: number, points: number): number {
  if (!(width > 0) || points < 2) return 0;
  const index = Math.round((x / width) * (points - 1));
  return Math.min(points - 1, Math.max(0, index));
}

function element<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function axisLabel(
  content: string,
  x: number,
  y: number,
  anchor: 'start' | 'middle' | 'end',
  className = 'axis',
): SVGTextElement {
  const label = element('text', {
    class: className,
    x: String(x),
    y: String(y),
    'text-anchor': anchor,
  });
  label.textContent = content;
  return label;
}

function gradient(name: string): SVGLinearGradientElement {
  const node = element('linearGradient', {
    id: `area-${name}`,
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
  });
  node.append(
    element('stop', { class: `stop stop--${name}`, offset: '0' }),
    element('stop', { class: `stop stop--${name}`, offset: '1', 'stop-opacity': '0' }),
  );
  return node;
}

export function renderChart(svg: SVGElement, standard: number[], extra?: number[] | null): void {
  const max = standard[0] ?? 0;
  const last = standard.length - 1;
  const box = { width: PLOT.width, height: PLOT.height, points: standard.length, max };
  const title = element('title', { id: 'balance-chart-title' });
  title.textContent = 'Remaining balance by year';

  const defs = element('defs', {});
  defs.append(gradient('standard'), gradient('extra'));

  const group = element('g', { transform: `translate(${PLOT.left},${PLOT.top})` });
  group.append(
    element('rect', { class: 'plot', width: String(PLOT.width), height: String(PLOT.height) }),
  );
  for (const share of [0.25, 0.5, 0.75]) {
    const y = String(PLOT.height * share);
    group.append(element('line', { class: 'grid', x1: '0', x2: String(PLOT.width), y1: y, y2: y }));
  }

  const lines: Array<[string, number[]]> = [['standard', standard]];
  if (extra) lines.push(['extra', extra]);
  for (const [name, balances] of lines) {
    group.append(
      element('polygon', {
        class: `area area--${name}`,
        points: areaPolygon(balances, box),
        fill: `url(#area-${name})`,
      }),
    );
  }
  for (const [name, balances] of lines) {
    group.append(
      element('polyline', {
        class: `line line--${name}`,
        'data-balances': balances.join(','),
        points: chartPoints(balances, box),
        fill: 'none',
        pathLength: '1',
      }),
    );
  }
  for (const [name, balances] of lines) {
    const endX = ((balances.length - 1) / last) * PLOT.width;
    const endY = max > 0 ? (1 - (balances[balances.length - 1] ?? 0) / max) * PLOT.height : 0;
    group.append(
      element('circle', {
        class: `dot dot--${name}`,
        cx: String(endX),
        cy: String(endY),
        r: '4.5',
      }),
    );
  }

  // The hover and keyboard cursor: a vertical line, one dot per line and a readout.
  const cursor = element('g', { class: 'cursor' });
  const cursorLine = element('line', { class: 'cursor-line', y1: '0', y2: String(PLOT.height) });
  const cursorDots = lines.map(([name]) =>
    element('circle', { class: `dot dot--${name}`, r: '5' }),
  );
  const readout = element('text', { class: 'readout', x: '0', y: '-12' });
  cursor.append(cursorLine, ...cursorDots, readout);
  group.append(cursor);

  const showYear = (year: number) => {
    const x = (year / last) * PLOT.width;
    cursorLine.setAttribute('x1', String(x));
    cursorLine.setAttribute('x2', String(x));
    lines.forEach(([, balances], index) => {
      const balance = balances[year] ?? 0;
      cursorDots[index]?.setAttribute('cx', String(x));
      cursorDots[index]?.setAttribute(
        'cy',
        String(max > 0 ? (1 - balance / max) * PLOT.height : 0),
      );
    });
    let text = `Year ${year}: ${formatCents(standard[year] ?? 0)}`;
    if (extra) text += ` · with extra ${formatCents(extra[year] ?? 0)}`;
    readout.textContent = text;
    cursor.classList.add('is-active');
  };
  const hide = () => cursor.classList.remove('is-active');

  let current = 0;
  svg.setAttribute('tabindex', '0');
  svg.onkeydown = (event) => {
    const target =
      event.key === 'ArrowRight'
        ? current + 1
        : event.key === 'ArrowLeft'
          ? current - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    current = Math.min(last, Math.max(0, target));
    showYear(current);
  };
  svg.onpointermove = (event) => {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const viewBoxWidth = (svg as SVGSVGElement).viewBox.baseVal.width || rect.width;
    const x = (event.clientX - rect.left) * (viewBoxWidth / rect.width) - PLOT.left;
    current = nearestYear(x, PLOT.width, standard.length);
    showYear(current);
  };
  svg.onpointerleave = hide;
  svg.onblur = hide;

  const bottom = PLOT.top + PLOT.height;
  const step = Math.ceil(last / 4);
  const ticks: SVGTextElement[] = [];
  for (let year = step; year < last - step / 2; year += step) {
    ticks.push(
      axisLabel(`${year}`, PLOT.left + (year / last) * PLOT.width, bottom + 22, 'middle', 'tick'),
    );
  }

  svg.replaceChildren(
    title,
    defs,
    group,
    ...ticks,
    axisLabel('Year 0', PLOT.left, bottom + 22, 'start'),
    axisLabel(`Year ${last}`, PLOT.left + PLOT.width, bottom + 22, 'end'),
    axisLabel(formatCents(max), PLOT.left + PLOT.width - 6, PLOT.top + 16, 'end'),
    axisLabel('0.00 €', PLOT.left + 6, bottom - 6, 'start'),
  );
}
