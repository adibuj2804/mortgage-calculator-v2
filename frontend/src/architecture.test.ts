import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('./**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('architecture rules', () => {
  it('frontend-has-no-backend-or-supabase-reference', () => {
    const files = Object.entries(sources).filter(
      ([path]) => !path.endsWith('architecture.test.ts'),
    );
    expect(files.length).toBeGreaterThan(5);
    for (const [path, source] of files) {
      expect(source, path).not.toMatch(/supabase/i);
      expect(source, path).not.toContain('backend/');
      expect(source, path).not.toMatch(/\.py\b/);
    }
  });
});
