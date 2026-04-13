import type { ContractDocument } from '@pactum/pactum_core';
import { pdfjs } from 'react-pdf';

export interface RenderedPage {
  readonly index: number;
  readonly width: number;
  readonly height: number;
  readonly image: CanvasImageSource;
  readonly dispose?: () => void;
}

const detectImageMimeType = (bytes: Uint8Array): string => {
  if (bytes.length >= 8) {
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    if (isPng) return 'image/png';
  }
  if (bytes.length >= 3) {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (isJpeg) return 'image/jpeg';
  }
  if (bytes.length >= 12) {
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    if (isWebp) return 'image/webp';
  }
  return 'image/png';
};

const decodeImage = async (bytes: Uint8Array): Promise<RenderedPage> => {
  const mimeType = detectImageMimeType(bytes);
  const normalized = Uint8Array.from(bytes);
  const blob = new Blob([normalized], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await image.decode();
  URL.revokeObjectURL(objectUrl);

  return {
    index: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
    image,
  };
};

const renderPdfPages = async (pdfData: Uint8Array): Promise<RenderedPage[]> => {
  // pdf.js may transfer the underlying ArrayBuffer to the worker.
  // Use a fresh copy so the document model keeps an intact buffer for future renders.
  const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(pdfData) });
  const pdf = await loadingTask.promise;
  const pages: RenderedPage[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext('2d');
    if (!context) continue;

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    pages.push({
      index: i - 1,
      width: canvas.width,
      height: canvas.height,
      image: canvas,
    });
  }

  await pdf.destroy();
  return pages;
};

export const loadRenderedPages = async (
  documentModel: ContractDocument
): Promise<RenderedPage[]> => {
  const pageImages =
    'pageImages' in documentModel
      ? (
          documentModel as ContractDocument & {
            readonly pageImages?: readonly Uint8Array[];
          }
        ).pageImages
      : undefined;

  if (pageImages && pageImages.length > 0) {
    const decoded = await Promise.all(
      pageImages.map(async (bytes: Uint8Array, index: number) => {
        const page = await decodeImage(bytes);
        return { ...page, index };
      })
    );
    return decoded;
  }

  return renderPdfPages(documentModel.pdfData);
};

