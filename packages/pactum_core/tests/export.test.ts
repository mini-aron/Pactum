import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { exportToPdf } from '../src/export';
import { createDocument, createField, setFieldValue } from '../src/operations';
import { createTestDocumentInput, textField } from './helpers';

describe('export', () => {
  it('exportToPdf returns loadable PDF bytes with text field', async () => {
    const input = await createTestDocumentInput();
    let doc = createDocument(input);
    doc = createField(doc, textField({ id: 'f1', x: 0.1, y: 0.1, width: 0.4, height: 0.05 }));
    doc = setFieldValue(doc, 'f1', 'exported');

    const out = await exportToPdf(doc);
    expect(out.byteLength).toBeGreaterThan(100);

    const loaded = await PDFDocument.load(out);
    expect(loaded.getPageCount()).toBe(1);
  });
});
