import type { ContractDocument } from '@pactum-labs/core';
import { pdfjs } from 'react-pdf';
import { isPdfWorkerConfigured } from './configurePdfWorker';

export interface RenderedPage {
  readonly index: number;
  readonly width: number;
  readonly height: number;
  readonly surface: HTMLCanvasElement | HTMLImageElement;
  readonly dispose?: () => void;
}

type PageImageDocument = ContractDocument & {
  readonly pageImages?: readonly Uint8Array[];
};

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new DOMException('Page rendering aborted.', 'AbortError');
  }
};

const assertPdfWorkerConfigured = (): void => {
  if (isPdfWorkerConfigured()) return;

  throw new Error(
    'PDF rendering requires a configured pdf.js worker. Pass `pdfWorkerSrc` to ContractViewer or call configurePdfWorker(...) before rendering PDF-backed pages.'
  );
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

const disposeRenderedPage = (page: RenderedPage | null | undefined): void => {
  page?.dispose?.();
};

export const disposeRenderedPages = (pages: readonly RenderedPage[]): void => {
  pages.forEach((page) => page.dispose?.());
};

const decodeImage = async (
  bytes: Uint8Array,
  index: number,
  signal?: AbortSignal
): Promise<RenderedPage> => {
  throwIfAborted(signal);
  const blob = new Blob([Uint8Array.from(bytes)], { type: detectImageMimeType(bytes) });
  const objectUrl = URL.createObjectURL(blob);
  let completed = false;

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();
    throwIfAborted(signal);
    completed = true;

    return {
      index,
      width: image.naturalWidth,
      height: image.naturalHeight,
      surface: image,
      dispose: () => {
        image.src = '';
        URL.revokeObjectURL(objectUrl);
      },
    };
  } finally {
    if (!completed) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

const renderPdfPage = async (
  pdfData: Uint8Array,
  pageIndex: number,
  signal?: AbortSignal
): Promise<RenderedPage> => {
  throwIfAborted(signal);
  const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(pdfData) });
  const cancelLoading = () => {
    void loadingTask.destroy();
  };
  signal?.addEventListener('abort', cancelLoading, { once: true });

  let renderedPage: RenderedPage | null = null;

  try {
    const pdf = await loadingTask.promise;

    try {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const context = canvas.getContext('2d');

      if (!context) {
        page.cleanup();
        throw new Error(`Failed to create a rendering context for page ${pageIndex}.`);
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

      renderedPage = {
        index: pageIndex,
        width: canvas.width,
        height: canvas.height,
        surface: canvas,
        dispose: () => {
          canvas.width = 0;
          canvas.height = 0;
        },
      };

      return renderedPage;
    } finally {
      await pdf.destroy();
    }
  } catch (error) {
    disposeRenderedPage(renderedPage);
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancelLoading);
  }
};

export const getDocumentPageCount = (documentModel: ContractDocument): number =>
  Math.max(0, documentModel.pageCount);

export const loadRenderedPage = async (
  documentModel: ContractDocument,
  pageIndex: number,
  signal?: AbortSignal
): Promise<RenderedPage> => {
  if (pageIndex < 0 || pageIndex >= documentModel.pageCount) {
    throw new Error(`Page ${pageIndex} is outside the document page range.`);
  }

  const pageImages =
    'pageImages' in documentModel
      ? (documentModel as PageImageDocument).pageImages
      : undefined;
  const pageImage = pageImages?.[pageIndex];

  if (pageImage) {
    try {
      return await decodeImage(pageImage, pageIndex, signal);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        assertPdfWorkerConfigured();
      }
      throw error;
    }
  }

  assertPdfWorkerConfigured();
  return renderPdfPage(documentModel.pdfData, pageIndex, signal);
};
