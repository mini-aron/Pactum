import {
  PDFDocument,
  PDFPage,
  StandardFonts,
  rgb,
  type PDFFont,
} from 'pdf-lib';
import type { ContractDocument } from '../types/document';
import type { ContractField } from '../types/field';
import type { ContractFieldValue } from '../types/value';
import { isSignatureValue, isStampValue } from '../types/value';
import { resolveFieldValue } from '../shared';
import { toAbsoluteRect } from '../coordinates';

interface PageDimension {
  readonly width: number;
  readonly height: number;
}

const getPageDimension = (page: PDFPage): PageDimension => ({
  width: page.getWidth(),
  height: page.getHeight(),
});

const drawTextField = (
  page: PDFPage,
  field: ContractField,
  value: string,
  font: PDFFont,
  pageDim: PageDimension
): void => {
  const abs = toAbsoluteRect(field, pageDim.width, pageDim.height);
  const fontSize = 10;
  const textY = pageDim.height - abs.y - abs.height / 2 - fontSize / 2;

  page.drawText(value, {
    x: abs.x + 2,
    y: Math.max(0, textY),
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
    maxWidth: abs.width - 4,
  });
};

const drawCheckboxField = (
  page: PDFPage,
  field: ContractField,
  value: boolean,
  pageDim: PageDimension
): void => {
  if (!value) return;

  const abs = toAbsoluteRect(field, pageDim.width, pageDim.height);
  const centerX = abs.x + abs.width / 2;
  const centerY = pageDim.height - abs.y - abs.height / 2;

  page.drawLine({
    start: { x: abs.x + 2, y: centerY },
    end: { x: centerX, y: pageDim.height - abs.y - abs.height + 2 },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: centerX, y: pageDim.height - abs.y - abs.height + 2 },
    end: { x: abs.x + abs.width - 2, y: pageDim.height - abs.y - 2 },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });
};

const drawImageField = async (
  page: PDFPage,
  pdfDoc: PDFDocument,
  field: ContractField,
  imageData: Uint8Array,
  mimeType: string | undefined,
  pageDim: PageDimension
): Promise<void> => {
  const abs = toAbsoluteRect(field, pageDim.width, pageDim.height);
  const y = pageDim.height - abs.y - abs.height;

  const isJpeg =
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    (mimeType === undefined && imageData[0] === 0xff && imageData[1] === 0xd8);

  const embeddedImage = isJpeg
    ? await pdfDoc.embedJpg(imageData)
    : await pdfDoc.embedPng(imageData);

  page.drawImage(embeddedImage, {
    x: abs.x,
    y: Math.max(0, y),
    width: abs.width,
    height: abs.height,
  });
};

const renderField = async (
  page: PDFPage,
  pdfDoc: PDFDocument,
  field: ContractField,
  value: ContractFieldValue | undefined,
  font: PDFFont,
  pageDim: PageDimension
): Promise<void> => {
  if (value === undefined || field.hidden) return;

  if (isSignatureValue(value) || isStampValue(value)) {
    await drawImageField(
      page,
      pdfDoc,
      field,
      value.image,
      value.mimeType,
      pageDim
    );
    return;
  }

  if (typeof value === 'boolean') {
    if (field.type === 'checkbox') {
      drawCheckboxField(page, field, value, pageDim);
    }
    return;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    drawTextField(page, field, value, font, pageDim);
    return;
  }

  if (typeof value === 'number') {
    drawTextField(page, field, String(value), font, pageDim);
  }
};

export interface ExportOptions {
  readonly embedFonts?: boolean;
}

export const exportToPdf = async (
  document: ContractDocument,
  options: ExportOptions = {}
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(document.pdfData);
  const font = await pdfDoc.embedFont(
    options.embedFonts !== false ? StandardFonts.Helvetica : StandardFonts.Helvetica
  );

  const pages = pdfDoc.getPages();

  const fieldsByPage = new Map<number, ContractField[]>();
  for (const field of document.fields) {
    const pageFields = fieldsByPage.get(field.page) ?? [];
    fieldsByPage.set(field.page, [...pageFields, field]);
  }

  for (const [pageIndex, pageFields] of fieldsByPage) {
    const page = pages[pageIndex];
    if (!page) continue;

    const pageDim = getPageDimension(page);

    for (const field of pageFields) {
      const value = resolveFieldValue(
        field,
        document.fieldValues,
        document.sharedValues
      );
      await renderField(page, pdfDoc, field, value, font, pageDim);
    }
  }

  return pdfDoc.save();
};
