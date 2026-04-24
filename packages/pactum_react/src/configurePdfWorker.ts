import { pdfjs } from 'react-pdf';

let configuredWorkerSrc: string | null = null;

function getDefaultWorkerSrc(): string {
  return `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Configure the PDF.js worker URL. Call once when the app starts.
 * If `workerSrc` is omitted, a version-matched worker is loaded from unpkg.
 */
export function configurePdfWorker(workerSrc?: string): void {
  const nextWorkerSrc = workerSrc ?? getDefaultWorkerSrc();

  if (configuredWorkerSrc === nextWorkerSrc) return;

  pdfjs.GlobalWorkerOptions.workerSrc = nextWorkerSrc;
  configuredWorkerSrc = nextWorkerSrc;
}
