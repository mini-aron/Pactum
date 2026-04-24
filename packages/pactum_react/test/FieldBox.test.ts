import { describe, expect, it } from 'vitest';
import { parseNumberInputValue } from '../src/FieldBox';

describe('parseNumberInputValue', () => {
  it('returns an empty state for a blank string so optional number fields can clear', () => {
    expect(parseNumberInputValue('', Number.NaN)).toEqual({ kind: 'empty' });
    expect(parseNumberInputValue('   ', Number.NaN)).toEqual({ kind: 'empty' });
  });

  it('returns the parsed number for finite numeric input', () => {
    expect(parseNumberInputValue('12', 12)).toEqual({ kind: 'number', value: 12 });
    expect(parseNumberInputValue('3.5', 3.5)).toEqual({ kind: 'number', value: 3.5 });
  });

  it('preserves intermediate numeric input states instead of clearing them', () => {
    expect(parseNumberInputValue('-', Number.NaN)).toEqual({ kind: 'intermediate' });
    expect(parseNumberInputValue('1.', 1)).toEqual({ kind: 'intermediate' });
    expect(parseNumberInputValue('1e', Number.NaN)).toEqual({ kind: 'intermediate' });
  });
});
