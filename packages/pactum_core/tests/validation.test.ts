import { describe, expect, it } from 'vitest';
import {
  validateDocument,
  validateField,
  validateSharedFieldGroup,
} from '../src/validation';
import type { TextField } from '../src/types/field';
import type { ContractDocument } from '../src/types/document';

const text: TextField = {
  id: 't1',
  name: 't',
  type: 'text',
  page: 0,
  x: 0,
  y: 0,
  width: 0.1,
  height: 0.05,
  required: true,
};

const mirror: TextField = {
  id: 'm1',
  name: 'm',
  type: 'text',
  page: 0,
  x: 0.2,
  y: 0,
  width: 0.1,
  height: 0.05,
  sharedKey: 'K',
  sharedMode: 'mirror',
};

const source: TextField = {
  id: 's1',
  name: 's',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0,
  width: 0.1,
  height: 0.05,
  sharedKey: 'K',
  sharedMode: 'source',
  required: true,
};

const doc = (fields: TextField[], fv = {}, sv = {}): ContractDocument => ({
  id: 'd',
  title: 'd',
  pdfData: new Uint8Array([1]),
  pageCount: 1,
  pages: [{ index: 0, width: 100, height: 100 }],
  fields,
  fieldValues: fv,
  sharedValues: sv,
  createdAt: '',
  updatedAt: '',
});

describe('validation', () => {
  it('validateField skips mirror', () => {
    const r = validateField(mirror, undefined);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('validateField reports required', () => {
    const r = validateField(text, undefined);
    expect(r.valid).toBe(false);
    expect(r.errors[0]?.code).toBe('REQUIRED');
  });

  it('validateSharedFieldGroup validates source only', () => {
    const ok = validateSharedFieldGroup([source, mirror], {}, { K: 'ok' }, 'K');
    expect(ok.valid).toBe(true);
  });

  it('validateDocument validates shared key once from source', () => {
    const d = doc([source, mirror], {}, {});
    const r = validateDocument(d);
    expect(r.valid).toBe(false);
    const r2 = validateDocument(doc([source, mirror], {}, { K: 'filled' }));
    expect(r2.valid).toBe(true);
  });
});
