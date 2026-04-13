import {
  createField,
  type ContractDocument,
  type ContractField,
  type ContractFieldType,
} from '@pactum/pactum_core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContractMode } from './ContractMode';
import { FieldBox } from './FieldBox';
import type { RenderedPage } from './pageSource';

export interface ContractCanvasPagesProps {
  readonly pages: readonly RenderedPage[];
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly dragCreateType?: ContractFieldType | null;
  readonly onDragCreateComplete?: () => void;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageWidth?: number;
  readonly zoom?: number;
}

export function ContractCanvasPages({
  pages,
  document,
  mode,
  dragCreateType = null,
  onDragCreateComplete,
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
          dragCreateType={dragCreateType}
          zoom={zoom}
          onDocumentChange={onDocumentChange}
          {...(onDragCreateComplete
            ? { onDragCreateComplete }
            : {})}
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
  dragCreateType,
  onDragCreateComplete,
  zoom,
  onDocumentChange,
}: {
  readonly page: RenderedPage;
  readonly pageWidth: number;
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly dragCreateType: ContractFieldType | null;
  readonly onDragCreateComplete?: () => void;
  readonly zoom: number;
  readonly onDocumentChange: (next: ContractDocument) => void;
}): JSX.Element {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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

  const onCreatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'builder' || dragCreateType === null) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-field-id]')) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    e.stopPropagation();
    e.preventDefault();

    const el = e.currentTarget;
    const r = overlay.getBoundingClientRect();
    const startX = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const startY = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setDraftRect({ x: startX, y: startY, width: 0, height: 0 });
    el.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const currentX = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      const currentY = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      setDraftRect({ x, y, width, height });
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);

      const currentX = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      const currentY = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      setDraftRect(null);

      if (width < 0.01 || height < 0.01) return;
      const fieldCount = document.fields.length + 1;
      const newFieldId = `field_${Date.now()}_${fieldCount}`;
      onDocumentChange(
        createField(document, {
          id: newFieldId,
          name: `Field ${fieldCount}`,
          label: `Field ${fieldCount}`,
          type: dragCreateType,
          page: page.index,
          x,
          y,
          width,
          height,
        })
      );
      onDragCreateComplete?.();
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

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
        onPointerDown={onCreatePointerDown}
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
        {mode === 'builder' && dragCreateType !== null && draftRect ? (
          <div
            style={{
              position: 'absolute',
              left: `${draftRect.x * 100}%`,
              top: `${draftRect.y * 100}%`,
              width: `${draftRect.width * 100}%`,
              height: `${draftRect.height * 100}%`,
              border: '1px dashed rgba(37, 99, 235, 0.9)',
              background: 'rgba(37, 99, 235, 0.12)',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

