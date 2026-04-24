import { beforeEach, describe, expect, it, vi } from 'vitest';

const defaultWorkerSrc =
  'https://unpkg.com/pdfjs-dist@4.0.0/build/pdf.worker.min.mjs';

async function loadModule() {
  vi.resetModules();

  const globalWorkerOptions = { workerSrc: '' };

  vi.doMock('react-pdf', () => ({
    pdfjs: {
      version: '4.0.0',
      GlobalWorkerOptions: globalWorkerOptions,
    },
  }));

  const module = await import('../src/configurePdfWorker');
  return { ...module, globalWorkerOptions };
}

describe('configurePdfWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('uses the default worker when no workerSrc is provided', async () => {
    const { configurePdfWorker, globalWorkerOptions } = await loadModule();

    configurePdfWorker();

    expect(globalWorkerOptions.workerSrc).toBe(defaultWorkerSrc);
  });

  it('resets to the default worker after a custom workerSrc was used', async () => {
    const { configurePdfWorker, globalWorkerOptions } = await loadModule();

    configurePdfWorker('https://cdn.example.com/pdf.worker.min.mjs');
    configurePdfWorker();

    expect(globalWorkerOptions.workerSrc).toBe(defaultWorkerSrc);
  });
});
