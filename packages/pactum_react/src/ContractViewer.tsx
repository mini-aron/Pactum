import type { ContractDocument } from '@pactum/pactum_core';
import { useEffect, useMemo, type CSSProperties } from 'react';
import type { ContractMode } from './ContractMode';
import { ContractPdfPages } from './ContractPdfPages';
import { configurePdfWorker } from './configurePdfWorker';

export interface ContractViewerProps {
  readonly mode: ContractMode;
  readonly document: ContractDocument;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageWidth?: number;
  readonly pdfWorkerSrc?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * PDF preview with field overlays. The parent owns `ContractDocument` state and passes
 * updates from core operations via `onDocumentChange`.
 */
export function ContractViewer({
  mode,
  document,
  onDocumentChange,
  pageWidth,
  pdfWorkerSrc,
  className,
  style,
}: ContractViewerProps): JSX.Element {
  useEffect(() => {
    configurePdfWorker(pdfWorkerSrc);
  }, [pdfWorkerSrc]);

  const file = useMemo(
    () => ({ data: document.pdfData }),
    [document.pdfData]
  );

  return (
    <div className={className} style={style}>
      <ContractPdfPages
        file={file}
        document={document}
        mode={mode}
        onDocumentChange={onDocumentChange}
        {...(pageWidth !== undefined ? { pageWidth } : {})}
      />
    </div>
  );
}
