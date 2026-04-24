import type { ContractDocument } from '@pactum-labs/core';
import { useEffect, useState } from 'react';
import type { ContractMode } from './ContractMode';
import { ContractCanvasPages } from './ContractCanvasPages';
import { loadRenderedPages, type RenderedPage } from './pageSource';

/**
 * @deprecated Kept for compatibility. Prefer `ContractCanvasPages`.
 * `file` is ignored and pages are resolved from `document` internally.
 */
export type PdfFileSource = unknown;

export interface ContractPdfPagesProps {
  readonly file?: PdfFileSource | null;
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageWidth?: number;
  readonly zoom?: number;
}

export function ContractPdfPages({
  file,
  document,
  mode,
  onDocumentChange,
  pageWidth = 720,
  zoom = 1,
}: ContractPdfPagesProps): JSX.Element {
  useEffect(() => {
    if (file === undefined || file === null) return;
    console.warn(
      'ContractPdfPages ignores the deprecated "file" prop and renders from "document" instead.'
    );
  }, [file]);

  const pageImages =
    'pageImages' in document ? document.pageImages : undefined;
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    void loadRenderedPages(document, controller.signal)
      .then((nextPages) => {
        if (controller.signal.aborted) {
          nextPages.forEach((page) => page.dispose?.());
          return;
        }
        setPages((prevPages) => {
          prevPages.forEach((page) => page.dispose?.());
          return nextPages;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPages((prevPages) => {
          prevPages.forEach((page) => page.dispose?.());
          return [];
        });
        setLoadError(
          error instanceof Error ? error.message : 'Failed to load document pages.'
        );
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [document.pdfData, pageImages]);

  if (loadError) {
    return (
      <div role="alert" style={{ padding: 12, color: '#991b1b', fontSize: 13 }}>
        Failed to load pages: {loadError}
      </div>
    );
  }

  if (isLoading && pages.length === 0) {
    return <span style={{ padding: 8 }}>Loading pages…</span>;
  }

  return (
    <ContractCanvasPages
      pages={pages}
      document={document}
      mode={mode}
      onDocumentChange={onDocumentChange}
      pageWidth={pageWidth}
      zoom={zoom}
    />
  );
}
