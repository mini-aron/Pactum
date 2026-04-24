import { pdfjs } from 'react-pdf';

let configuredWorkerSrc: string | null = null;

export function isPdfWorkerConfigured(): boolean {
  return typeof pdfjs.GlobalWorkerOptions.workerSrc === 'string'
    && pdfjs.GlobalWorkerOptions.workerSrc.trim().length > 0;
}

/**
 * Configure the PDF.js worker URL. Call once when the app starts.
 * Pactum does not load a default worker from a remote CDN.
 */
export function configurePdfWorker(workerSrc?: string): void {
  const nextWorkerSrc = workerSrc?.trim();

  if (!nextWorkerSrc) return;

  if (configuredWorkerSrc === nextWorkerSrc) return;

  pdfjs.GlobalWorkerOptions.workerSrc = nextWorkerSrc;
  configuredWorkerSrc = nextWorkerSrc;
}
