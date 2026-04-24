import type { ContractDocument } from '@pactum-labs/core';
import { pdfjs } from 'react-pdf';

export interface RenderedPage {
  readonly index: number;
  readonly width: number;
  readonly height: number;
  readonly image: CanvasImageSource;
  readonly dispose?: () => void;
}

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new DOMException('Page rendering aborted.', 'AbortError');
  }
};

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

const decodeImage = async (
  bytes: Uint8Array,
  signal?: AbortSignal
): Promise<RenderedPage> => {
  throwIfAborted(signal);
  const mimeType = detectImageMimeType(bytes);
  const normalized = Uint8Array.from(bytes);
  const blob = new Blob([normalized], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();
    throwIfAborted(signal);

    return {
      index: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
      image,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const renderPdfPages = async (
  pdfData: Uint8Array,
  signal?: AbortSignal
): Promise<RenderedPage[]> => {
  throwIfAborted(signal);
  // pdf.js may transfer the underlying ArrayBuffer to the worker.
  // Use a fresh copy so the document model keeps an intact buffer for future renders.
  const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(pdfData) });
  const cancelLoading = () => {
    void loadingTask.destroy();
  };
  signal?.addEventListener('abort', cancelLoading, { once: true });

  try {
    const pdf = await loadingTask.promise;
    const pages: RenderedPage[] = [];

    try {
      for (let i = 1; i <= pdf.numPages; i += 1) {
        throwIfAborted(signal);

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        const context = canvas.getContext('2d');

        if (!context) {
          page.cleanup();
          continue;
        }

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });
        const cancelRender = () => {
          renderTask.cancel();
        };
        signal?.addEventListener('abort', cancelRender, { once: true });

        try {
          await renderTask.promise;
          throwIfAborted(signal);
        } finally {
          signal?.removeEventListener('abort', cancelRender);
          page.cleanup();
        }

        pages.push({
          index: i - 1,
          width: canvas.width,
          height: canvas.height,
          image: canvas,
          dispose: () => {
            canvas.width = 0;
            canvas.height = 0;
          },
        });
      }

      return pages;
    } finally {
      await pdf.destroy();
    }
  } finally {
    signal?.removeEventListener('abort', cancelLoading);
  }
};

export const loadRenderedPages = async (
  documentModel: ContractDocument,
  signal?: AbortSignal
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
        const page = await decodeImage(bytes, signal);
        return { ...page, index };
      })
    );
    return decoded;
  }

  return renderPdfPages(documentModel.pdfData, signal);
};

