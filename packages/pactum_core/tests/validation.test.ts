import { describe, expect, it } from 'vitest';
import {
  validateDocument,
  validateField,
  validateSharedFieldGroup,
} from '../src/validation';
import type { SignatureField, TextField } from '../src/types/field';
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

const signature: SignatureField = {
  id: 'sig1',
  name: 'sig',
  type: 'signature',
  page: 0,
  x: 0.1,
  y: 0.1,
  width: 0.2,
  height: 0.1,
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

  it('validateDocument uses resolved default values for non-shared fields', () => {
    const withDefault: TextField = {
      ...text,
      defaultValue: 'fallback',
    };

    const r = validateDocument(doc([withDefault], {}, {}));
    expect(r.valid).toBe(true);
  });

  it('validateField rejects invalid regex patterns without throwing', () => {
    const r = validateField(
      {
        ...text,
        validation: { pattern: '(' },
      },
      'value'
    );

    expect(r.valid).toBe(false);
    expect(r.errors[0]?.code).toBe('PATTERN_MISMATCH');
  });

  it('validateField rejects values incompatible with the field type', () => {
    const r = validateField(text, true as never);
    expect(r.valid).toBe(false);
    expect(r.errors[0]?.code).toBe('INVALID_TYPE');
  });

  it('validateField rejects unsupported signature image formats', () => {
    const r = validateField(signature, {
      type: 'signature',
      image: Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      mimeType: 'image/webp',
    });

    expect(r.valid).toBe(false);
    expect(r.errors[0]?.code).toBe('INVALID_TYPE');
  });
});
