import { byId } from './dom';
import { formatPct } from '../format';

const RADIUS = 66;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function renderDonut(principalShare: number): void {
  const interestShare = 1 - principalShare;
  const principalArc = byId('arcPrincipal');
  const interestArc = byId('arcInterest');

  principalArc.setAttribute(
    'stroke-dasharray',
    `${CIRCUMFERENCE * principalShare} ${CIRCUMFERENCE}`,
  );
  interestArc.setAttribute('stroke-dasharray', `${CIRCUMFERENCE * interestShare} ${CIRCUMFERENCE}`);
  interestArc.setAttribute('transform', `rotate(${-90 + principalShare * 360} 84 84)`);

  byId('donutPct').textContent = formatPct(principalShare);
}
