import { describe, expect, it } from 'vitest';
import { formatDateValue, isIsoDateString } from '../src/format';

describe('date format', () => {
  it('formats ISO date values with date masks', () => {
    expect(formatDateValue('2026-04-22', 'yyyy.mm.dd')).toBe('2026.04.22');
    expect(formatDateValue('2026-04-22', 'yy.M.d')).toBe('26.4.22');
  });

  it('leaves non-ISO values unchanged', () => {
    expect(formatDateValue('04/22/2026', 'yyyy.mm.dd')).toBe('04/22/2026');
  });

  it('detects ISO date strings', () => {
    expect(isIsoDateString('2026-04-22')).toBe(true);
    expect(isIsoDateString('2026.04.22')).toBe(false);
  });
});
