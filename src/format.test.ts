import { describe, expect, it } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  it('formats years and months with correct plurals', () => {
    expect(formatDuration(0)).toBe('0 months');
    expect(formatDuration(1)).toBe('1 month');
    expect(formatDuration(12)).toBe('1 year');
    expect(formatDuration(53)).toBe('4 years 5 months');
  });
});
