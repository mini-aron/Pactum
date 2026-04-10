import { describe, expect, it } from 'vitest';
import {
  getMirrorFields,
  getSourceField,
  resolveAllSharedValues,
  resolveFieldValue,
  setSharedFieldValue,
} from '../src/shared';
import type { TextField } from '../src/types/field';

const source: TextField = {
  id: 's1',
  name: 'source',
  type: 'text',
  page: 0,
  x: 0,
  y: 0,
  width: 0.1,
  height: 0.05,
  sharedKey: 'A',
  sharedMode: 'source',
};

const mirror: TextField = {
  id: 'm1',
  name: 'mirror',
  type: 'text',
  page: 0,
  x: 0.5,
  y: 0,
  width: 0.1,
  height: 0.05,
  sharedKey: 'A',
  sharedMode: 'mirror',
};

describe('shared', () => {
  it('getSourceField returns source for key', () => {
    expect(getSourceField([source, mirror], 'A')?.id).toBe('s1');
  });

  it('getMirrorFields lists mirrors', () => {
    expect(getMirrorFields([source, mirror], 'A').map((f) => f.id)).toEqual(['m1']);
  });

  it('resolveFieldValue prefers sharedValues for shared fields', () => {
    const v = resolveFieldValue(
      source,
      { s1: 'direct' },
      { A: 'shared' }
    );
    expect(v).toBe('shared');
  });

  it('resolveFieldValue falls back to fieldValues then default', () => {
    const f: TextField = { ...source, sharedKey: undefined, sharedMode: undefined, defaultValue: 'd' };
    expect(resolveFieldValue(f, {}, {})).toBe('d');
  });

  it('setSharedFieldValue requires a source field', () => {
    expect(() =>
      setSharedFieldValue([mirror], {}, 'A', 'x')
    ).toThrow(/source/);
  });

  it('setSharedFieldValue updates map when source exists', () => {
    const next = setSharedFieldValue([source, mirror], {}, 'A', 'hello');
    expect(next.A).toBe('hello');
  });

  it('resolveAllSharedValues merges resolved per field', () => {
    const map = resolveAllSharedValues(
      [source, mirror],
      {},
      { A: 'one' }
    );
    expect(map.s1).toBe('one');
    expect(map.m1).toBe('one');
  });
});
