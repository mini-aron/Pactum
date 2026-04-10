import { pdfjs } from 'react-pdf';

let configured = false;

/**
 * Configure the PDF.js worker URL. Call once when the app starts.
 * If `workerSrc` is omitted, a version-matched worker is loaded from unpkg.
 */
export function configurePdfWorker(workerSrc?: string): void {
  if (configured) return;
  pdfjs.GlobalWorkerOptions.workerSrc =
    workerSrc ??
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  configured = true;
}
