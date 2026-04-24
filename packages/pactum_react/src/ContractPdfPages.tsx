import type { ContractDocument } from '@pactum-labs/core';
import { useEffect, useState } from 'react';
import type { ContractMode } from './ContractMode';
import { ContractCanvasPages } from './ContractCanvasPages';
import {
  getDocumentPageCount,
  loadRenderedPage,
  type RenderedPage,
} from './pageSource';

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
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pageCount = getDocumentPageCount(document);

  useEffect(() => {
    if (file === undefined || file === null) return;
    console.warn(
      'ContractPdfPages ignores the deprecated "file" prop and renders from "document" instead.'
    );
  }, [file]);

  useEffect(() => {
    setActivePageIndex((prev) => Math.min(prev, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    void loadRenderedPage(document, activePageIndex, controller.signal)
      .then((nextPage) => {
        if (controller.signal.aborted) {
          nextPage.dispose?.();
          return;
        }
        setPage((prevPage) => {
          prevPage?.dispose?.();
          return nextPage;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPage((prevPage) => {
          prevPage?.dispose?.();
          return null;
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
  }, [activePageIndex, document]);

  useEffect(() => {
    return () => {
      page?.dispose?.();
    };
  }, [page]);

  if (loadError) {
    return (
      <div role="alert" style={{ padding: 12, color: '#991b1b', fontSize: 13 }}>
        Failed to load pages: {loadError}
      </div>
    );
  }

  if (isLoading && page === null) {
    return <span style={{ padding: 8 }}>Loading page...</span>;
  }

  return (
    <ContractCanvasPages
      page={page}
      document={document}
      mode={mode}
      onDocumentChange={onDocumentChange}
      pageWidth={pageWidth}
      zoom={zoom}
    />
  );
}
