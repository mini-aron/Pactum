import type { ContractDocument } from '@pactum-labs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pdfData = new Uint8Array([1, 2, 3]);
const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createDocument(overrides?: Partial<ContractDocument>): ContractDocument {
  return {
    id: 'doc_1',
    title: 'Contract',
    pdfData,
    pageCount: 5,
    pages: Array.from({ length: 5 }, (_, index) => ({
      index,
      width: 600,
      height: 800,
    })),
    fields: [],
    fieldValues: {},
    sharedValues: {},
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    ...overrides,
  };
}

async function loadPageSource() {
  vi.resetModules();
  const globalWorkerOptions = { workerSrc: '/assets/pdf.worker.min.mjs' };
  const cleanup = vi.fn();
  const getPage = vi.fn(async (pageNumber: number) => ({
    getViewport: ({ scale }: { scale: number }) => ({
      width: (100 + pageNumber) * scale,
      height: (200 + pageNumber) * scale,
    }),
    render: ({ canvasContext }: { canvasContext: object | null }) => ({
      promise: Promise.resolve(canvasContext),
      cancel: vi.fn(),
    }),
    cleanup,
  }));

  const getDocument = vi.fn(({ data }: { data: Uint8Array }) => ({
    promise: Promise.resolve({
      numPages: 5,
      getPage,
      destroy: vi.fn(async () => data),
    }),
    destroy: vi.fn(async () => data),
  }));

  vi.doMock('react-pdf', () => ({
    pdfjs: {
      getDocument,
      GlobalWorkerOptions: globalWorkerOptions,
    },
  }));

  const module = await import('../src/pageSource');
  return { ...module, cleanup, getDocument, getPage, globalWorkerOptions };
}

describe('pageSource', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    let objectUrlIndex = 0;
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => `blob:mock-${objectUrlIndex += 1}`),
      revokeObjectURL: vi.fn(),
    });

    class MockImage {
      naturalWidth = 400;
      naturalHeight = 500;
      decoding = 'async';
      src = '';

      decode = vi.fn(async () => undefined);
    }

    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('document', {
      createElement: (tagName: string) => {
        if (tagName !== 'canvas') {
          throw new Error(`Unexpected element requested: ${tagName}`);
        }

        return {
          width: 0,
          height: 0,
          getContext: () => ({}),
        };
      },
    });
  });

  it('loads the requested page image without touching PDF', async () => {
    const { loadRenderedPage, getDocument } = await loadPageSource();
    const documentModel = createDocument({
      pageImages: [pngBytes, pngBytes, pngBytes, pngBytes, pngBytes],
    });

    const page = await loadRenderedPage(documentModel, 3);

    expect(getDocument).not.toHaveBeenCalled();
    expect(page).toMatchObject({ index: 3, width: 400, height: 500 });
  });

  it('falls back to the matching PDF page when no page image exists for that index', async () => {
    const { loadRenderedPage, getDocument, getPage } = await loadPageSource();
    const documentModel = createDocument({
      pageImages: [pngBytes, pngBytes],
    });

    const page = await loadRenderedPage(documentModel, 4);

    expect(getDocument).toHaveBeenCalledOnce();
    expect(getPage).toHaveBeenCalledOnce();
    expect(getPage).toHaveBeenCalledWith(5);
    expect(page).toMatchObject({ index: 4, width: 210, height: 410 });
  });

  it('disposes rendered pages via the shared helper', async () => {
    const { disposeRenderedPages } = await loadPageSource();
    const disposeA = vi.fn();
    const disposeB = vi.fn();

    disposeRenderedPages([
      { index: 0, width: 1, height: 1, surface: {} as HTMLCanvasElement, dispose: disposeA },
      { index: 1, width: 1, height: 1, surface: {} as HTMLCanvasElement, dispose: disposeB },
    ]);

    expect(disposeA).toHaveBeenCalledOnce();
    expect(disposeB).toHaveBeenCalledOnce();
  });

  it('fails fast when PDF rendering is needed but no worker was configured', async () => {
    const { loadRenderedPage, globalWorkerOptions } = await loadPageSource();
    globalWorkerOptions.workerSrc = '';

    await expect(loadRenderedPage(createDocument(), 0)).rejects.toThrow(
      'PDF rendering requires a configured pdf.js worker.'
    );
  });
});
