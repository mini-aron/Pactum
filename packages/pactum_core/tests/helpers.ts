import { PDFDocument } from 'pdf-lib';
import type { CreateDocumentInput } from '../src/types/document';
import type { TextField } from '../src/types/field';

export const minimalPdfData = async (): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return pdf.save();
};

export const createTestDocumentInput = async (): Promise<CreateDocumentInput> => {
  const pdfData = await minimalPdfData();
  return {
    id: 'doc-test',
    title: 'Test',
    pdfData,
    pageCount: 1,
    pages: [{ index: 0, width: 612, height: 792 }],
  };
};

export const textField = (overrides: Partial<TextField> & Pick<TextField, 'id'>): TextField => ({
  id: overrides.id,
  name: overrides.name ?? 'f',
  type: 'text',
  page: overrides.page ?? 0,
  x: overrides.x ?? 0.1,
  y: overrides.y ?? 0.1,
  width: overrides.width ?? 0.2,
  height: overrides.height ?? 0.05,
  ...overrides,
});
