import { describe, expect, it } from 'vitest';
import { formatEuro } from './euro';

describe('formatEuro (FR4)', () => {
  it('format-euro-thousands', () => {
    expect(formatEuro(145435.2)).toBe('145,435.20 €');
  });

  it('format-euro-below-thousand', () => {
    expect(formatEuro(605.98)).toBe('605.98 €');
  });

  it('format-euro-pads-two-decimals', () => {
    expect(formatEuro(1000)).toBe('1,000.00 €');
  });

  it('format-euro-zero', () => {
    expect(formatEuro(0)).toBe('0.00 €');
  });

  it('format-euro-hundred-millions', () => {
    expect(formatEuro(100005033.6)).toBe('100,005,033.60 €');
  });

  it('format-euro-float-noise', () => {
    expect(formatEuro(0.1 + 0.2)).toBe('0.30 €');
  });

  it('format-euro-regular-space', () => {
    const text = formatEuro(1000);
    expect(text.charCodeAt(text.length - 2)).toBe(32);
  });

  it('format-euro-rounds-half-up', () => {
    expect(formatEuro(0.005)).toBe('0.01 €');
  });

  it('format-euro-rounds-down-below-half', () => {
    expect(formatEuro(0.004)).toBe('0.00 €');
  });

  it('format-euro-carries-into-next-thousand', () => {
    expect(formatEuro(999.999)).toBe('1,000.00 €');
  });

  it('format-euro-rejects-negative', () => {
    expect(() => formatEuro(-0.04)).toThrow(RangeError);
  });

  it('format-euro-rejects-not-finite', () => {
    expect(() => formatEuro(NaN)).toThrow(RangeError);
    expect(() => formatEuro(Infinity)).toThrow(RangeError);
  });
});
