import type { ContractDocument, ContractField } from '@pactum/pactum_core';
import { useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import type { DocumentProps } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { ContractMode } from './ContractMode';
import { FieldBox } from './FieldBox';

/** Same as `react-pdf` `<Document file={…} />` (pdf.js source). */
export type PdfFileSource = NonNullable<DocumentProps['file']>;

export interface ContractPdfPagesProps {
  readonly file: PdfFileSource | null;
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageWidth?: number;
}

export function ContractPdfPages({
  file,
  document,
  mode,
  onDocumentChange,
  pageWidth = 720,
}: ContractPdfPagesProps): JSX.Element {
  const [numPages, setNumPages] = useState(0);

  const pages = useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i);
  }, [numPages]);

  if (file === null) {
    return <span style={{ padding: 8 }}>No PDF</span>;
  }

  return (
    <Document
      file={file}
      onLoadSuccess={({ numPages: n }) => setNumPages(n)}
      loading={<span style={{ padding: 8 }}>Loading PDF…</span>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pages.map((pageIndex) => (
          <PageWithFields
            key={pageIndex}
            pageIndex={pageIndex}
            pageWidth={pageWidth}
            document={document}
            mode={mode}
            onDocumentChange={onDocumentChange}
          />
        ))}
      </div>
    </Document>
  );
}

function PageWithFields({
  pageIndex,
  pageWidth,
  document,
  mode,
  onDocumentChange,
}: {
  readonly pageIndex: number;
  readonly pageWidth: number;
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly onDocumentChange: (next: ContractDocument) => void;
}): JSX.Element {
  const overlayRef = useRef<HTMLDivElement>(null);
  const fields = document.fields.filter((f: ContractField) => f.page === pageIndex);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Page
        pageNumber={pageIndex + 1}
        width={pageWidth}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: mode === 'readonly' ? 'none' : 'auto',
        }}
      >
        {fields.map((field: ContractField) => (
          <FieldBox
            key={field.id}
            field={field}
            document={document}
            mode={mode}
            onDocumentChange={onDocumentChange}
            pageOverlayRef={overlayRef}
          />
        ))}
      </div>
    </div>
  );
}
