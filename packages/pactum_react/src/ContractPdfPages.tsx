import type { ContractDocument } from '@pactum/pactum_core';
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
  document,
  mode,
  onDocumentChange,
  pageWidth = 720,
  zoom = 1,
}: ContractPdfPagesProps): JSX.Element {
  const pageImages =
    'pageImages' in document ? document.pageImages : undefined;
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    void loadRenderedPages(document)
      .then((nextPages) => {
        if (!alive) return;
        setPages(nextPages);
      })
      .finally(() => {
        if (!alive) return;
        setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [pageImages, document.pdfData]);

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
