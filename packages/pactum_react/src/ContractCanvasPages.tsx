import type { ContractDocument, ContractField } from '@pactum/pactum_core';
import { useEffect, useMemo, useRef } from 'react';
import type { ContractMode } from './ContractMode';
import { FieldBox } from './FieldBox';
import type { RenderedPage } from './pageSource';

export interface ContractCanvasPagesProps {
  readonly pages: readonly RenderedPage[];
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageWidth?: number;
  readonly zoom?: number;
}

export function ContractCanvasPages({
  pages,
  document,
  mode,
  onDocumentChange,
  pageWidth = 720,
  zoom = 1,
}: ContractCanvasPagesProps): JSX.Element {
  if (pages.length === 0) {
    return <span style={{ padding: 8 }}>Loading pages…</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {pages.map((page) => (
        <CanvasPageWithFields
          key={page.index}
          page={page}
          pageWidth={pageWidth}
          document={document}
          mode={mode}
          zoom={zoom}
          onDocumentChange={onDocumentChange}
        />
      ))}
    </div>
  );
}

function CanvasPageWithFields({
  page,
  pageWidth,
  document,
  mode,
  zoom,
  onDocumentChange,
}: {
  readonly page: RenderedPage;
  readonly pageWidth: number;
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly zoom: number;
  readonly onDocumentChange: (next: ContractDocument) => void;
}): JSX.Element {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fields = document.fields.filter((f: ContractField) => f.page === page.index);

  const displayHeight = useMemo(() => {
    const safeWidth = Math.max(1, page.width);
    return Math.round((page.height / safeWidth) * pageWidth);
  }, [page.height, page.width, pageWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = page.width;
    canvas.height = page.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(page.image, 0, 0, canvas.width, canvas.height);
  }, [page.height, page.image, page.width]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: pageWidth, height: displayHeight }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
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
            zoom={zoom}
            onDocumentChange={onDocumentChange}
            pageOverlayRef={overlayRef}
          />
        ))}
      </div>
    </div>
  );
}

