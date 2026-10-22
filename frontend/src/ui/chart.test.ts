import { describe, expect, it } from 'vitest';
import { chartPoints } from './chart';

describe('chartPoints (FR12)', () => {
  it('chart-points-scale-to-box', () => {
    expect(chartPoints([100, 50, 0], { width: 200, height: 100, points: 3, max: 100 })).toBe(
      '0,0 100,50 200,100',
    );
  });

  it('chart-points-shorter-line-ends-before-the-edge', () => {
    expect(chartPoints([100, 0], { width: 200, height: 100, points: 3, max: 100 })).toBe(
      '0,0 100,100',
    );
    expect(chartPoints([3, 2, 1, 0], { width: 100, height: 100, points: 4, max: 3 })).toBe(
      '0,0 33.33,33.33 66.67,66.67 100,100',
    );
  });

  it('chart-points-rejects-bad-input', () => {
    const box = { width: 200, height: 100, points: 3, max: 100 };
    expect(() => chartPoints([], box)).toThrow(RangeError);
    expect(() => chartPoints([100, 0], { ...box, points: 1 })).toThrow(RangeError);
    expect(() => chartPoints([100, 0], { ...box, max: 0 })).toThrow(RangeError);
    expect(() => chartPoints([100, 50, 0, 0], box)).toThrow(RangeError);
  });
});
