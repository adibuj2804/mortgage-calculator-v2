import { describe, expect, it } from 'vitest';
import { areaPolygon, chartPoints, nearestYear } from './chart';

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

describe('chart helpers for the area and the hover (FR12)', () => {
  it('chart-area-closes-polygon-to-baseline', () => {
    expect(areaPolygon([100, 0], { width: 200, height: 100, points: 3, max: 100 })).toBe(
      '0,0 100,100 100,100 0,100',
    );
  });

  it('chart-nearest-year-picks-closest', () => {
    expect(nearestYear(0, 200, 5)).toBe(0);
    expect(nearestYear(60, 200, 5)).toBe(1);
    expect(nearestYear(200, 200, 5)).toBe(4);
  });

  it('chart-nearest-year-clamps', () => {
    expect(nearestYear(-50, 200, 5)).toBe(0);
    expect(nearestYear(999, 200, 5)).toBe(4);
    expect(nearestYear(10, 0, 5)).toBe(0);
  });
});
