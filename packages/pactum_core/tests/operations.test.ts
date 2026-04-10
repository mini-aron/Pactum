import { describe, expect, it } from 'vitest';
import {
  createDocument,
  createField,
  getResolvedFieldValue,
  getResolvedValues,
  removeField,
  setFieldValue,
  updateField,
} from '../src/operations';
import { createTestDocumentInput, textField } from './helpers';

describe('operations', () => {
  it('createDocument initializes empty fields and values', async () => {
    const input = await createTestDocumentInput();
    const d = createDocument(input);
    expect(d.fields).toHaveLength(0);
    expect(d.fieldValues).toEqual({});
    expect(d.sharedValues).toEqual({});
  });

  it('setFieldValue writes fieldValues for non-shared field', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(d, textField({ id: 'a' }));
    d = setFieldValue(d, 'a', 'hello');
    expect(d.fieldValues.a).toBe('hello');
  });

  it('setFieldValue writes sharedValues for source field', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(
      d,
      textField({
        id: 'src',
        sharedKey: 'K',
        sharedMode: 'source',
      })
    );
    d = createField(
      d,
      textField({
        id: 'mir',
        x: 0.5,
        sharedKey: 'K',
        sharedMode: 'mirror',
      })
    );
    d = setFieldValue(d, 'src', 'shared-val');
    expect(d.sharedValues.K).toBe('shared-val');
    expect(getResolvedFieldValue(d, 'mir')).toBe('shared-val');
  });

  it('setFieldValue rejects mirror', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(
      d,
      textField({ id: 'src', sharedKey: 'K', sharedMode: 'source' })
    );
    d = createField(
      d,
      textField({ id: 'mir', x: 0.5, sharedKey: 'K', sharedMode: 'mirror' })
    );
    expect(() => setFieldValue(d, 'mir', 'x')).toThrow(/mirror/);
  });

  it('removeField drops shared value when last source removed', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(
      d,
      textField({ id: 'src', sharedKey: 'K', sharedMode: 'source' })
    );
    d = setFieldValue(d, 'src', 'v');
    d = removeField(d, 'src');
    expect(d.sharedValues.K).toBeUndefined();
  });

  it('getResolvedValues returns all field ids with values', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(d, textField({ id: 'x' }));
    d = setFieldValue(d, 'x', '1');
    const all = getResolvedValues(d);
    expect(all.x).toBe('1');
  });

  it('updateField normalizes geometry', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(d, textField({ id: 'x' }));
    d = updateField(d, 'x', { x: -1, y: 2 });
    const f = d.fields.find((ff) => ff.id === 'x');
    expect(f?.x).toBe(0);
    expect(f?.y).toBe(1);
  });

  it('createField throws when two sources share the same key', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(
      d,
      textField({ id: 'a', sharedKey: 'K', sharedMode: 'source' })
    );
    expect(() =>
      createField(d, textField({ id: 'b', x: 0.5, sharedKey: 'K', sharedMode: 'source' }))
    ).toThrow(/only one source/);
  });

  it('setFieldValue rejects readonly fields', async () => {
    let d = createDocument(await createTestDocumentInput());
    d = createField(d, textField({ id: 'ro', readonly: true }));
    expect(() => setFieldValue(d, 'ro', 'nope')).toThrow(/read-only/);
  });
});
