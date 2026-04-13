import type { ContractDocument, ContractFieldType } from '@pactum/pactum_core';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { ContractMode } from './ContractMode';
import { ContractCanvasPages } from './ContractCanvasPages';
import { configurePdfWorker } from './configurePdfWorker';
import { loadRenderedPages, type RenderedPage } from './pageSource';

export interface ContractViewerProps {
  readonly mode: ContractMode;
  readonly document: ContractDocument;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageWidth?: number;
  readonly viewportHeight?: number | string;
  readonly pdfWorkerSrc?: string;
  className?: string;
  style?: CSSProperties;
}

export interface ContractViewerHandle {
  beginDragCreate: (fieldType: ContractFieldType) => void;
  cancelDragCreate: () => void;
}

/**
 * Canvas-based contract page viewer with field overlays.
 * The parent owns `ContractDocument` state and passes updates via `onDocumentChange`.
 */
export const ContractViewer = forwardRef<ContractViewerHandle, ContractViewerProps>(function ContractViewer({
  mode,
  document,
  onDocumentChange,
  pageWidth,
  viewportHeight = '80vh',
  pdfWorkerSrc,
  className,
  style,
}: ContractViewerProps, ref): JSX.Element {
  const pageImages =
    'pageImages' in document ? document.pageImages : undefined;
  const [zoom, setZoom] = useState(1);
  const [dragCreateType, setDragCreateType] = useState<ContractFieldType | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  useEffect(() => {
    configurePdfWorker(pdfWorkerSrc);
  }, [pdfWorkerSrc]);

  useEffect(() => {
    if (mode !== 'builder' && dragCreateType !== null) {
      setDragCreateType(null);
    }
  }, [dragCreateType, mode]);

  useImperativeHandle(
    ref,
    () => ({
      beginDragCreate: (fieldType: ContractFieldType) => {
        setDragCreateType(fieldType);
      },
      cancelDragCreate: () => {
        setDragCreateType(null);
      },
    }),
    []
  );

  useEffect(() => {
    let alive = true;
    setIsLoadingPages(true);

    void loadRenderedPages(document)
      .then((nextPages) => {
        if (!alive) return;
        setPages(nextPages);
      })
      .finally(() => {
        if (!alive) return;
        setIsLoadingPages(false);
      });

    return () => {
      alive = false;
    };
  }, [pageImages, document.pdfData]);

  const basePageWidth = pageWidth ?? 720;
  const scaledPageWidth = Math.round(basePageWidth * zoom);

  const clampZoom = useCallback((value: number) => {
    return Math.max(0.5, Math.min(2, Number(value.toFixed(2))));
  }, []);

  const onZoomIn = useCallback(() => {
    setZoom((prev) => clampZoom(prev + 0.1));
  }, [clampZoom]);

  const onZoomOut = useCallback(() => {
    setZoom((prev) => clampZoom(prev - 0.1));
  }, [clampZoom]);

  const onZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const onViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      if (event.button !== 0) return;
      if (mode === 'builder' && dragCreateType !== null) return;
      const target = event.target as HTMLElement;
      if (target.closest('[data-field-id]')) return;
      const canPan =
        viewport.scrollWidth > viewport.clientWidth ||
        viewport.scrollHeight > viewport.clientHeight;
      if (!canPan) return;
      event.preventDefault();

      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: viewport.scrollLeft,
        startScrollTop: viewport.scrollTop,
      };
      setIsPanning(true);
      viewport.setPointerCapture(event.pointerId);
    },
    [dragCreateType, mode]
  );

  const onViewportPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    if (event.pointerId !== panRef.current.pointerId) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const dx = event.clientX - panRef.current.startX;
    const dy = event.clientY - panRef.current.startY;
    viewport.scrollLeft = panRef.current.startScrollLeft - dx;
    viewport.scrollTop = panRef.current.startScrollTop - dy;
  }, [isPanning]);

  const onViewportPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== panRef.current.pointerId) return;

    const viewport = viewportRef.current;
    if (viewport && viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
  }, []);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: viewportHeight,
        minHeight: 0,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
          position: 'sticky',
          top: 8,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: 4,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
          }}
        >
          <RoundIconButton
            ariaLabel="Zoom out"
            onClick={onZoomOut}
            disabled={zoom <= 0.5}
          >
            <MinusIcon />
          </RoundIconButton>
          <button
            type="button"
            onClick={onZoomReset}
            style={{
              minWidth: 56,
              height: 30,
              borderRadius: 999,
              border: '1px solid rgba(148, 163, 184, 0.35)',
              background: 'rgba(248, 250, 252, 0.9)',
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: 0.2,
            }}
            aria-label="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <RoundIconButton
            ariaLabel="Zoom in"
            onClick={onZoomIn}
            disabled={zoom >= 2}
          >
            <PlusIcon />
          </RoundIconButton>
        </div>
      </div>
      <div
        ref={viewportRef}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
        onPointerLeave={onViewportPointerUp}
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          touchAction: zoom > 1 ? 'none' : 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {isLoadingPages && pages.length === 0 ? (
          <span style={{ padding: 8 }}>Loading pages…</span>
        ) : (
          <ContractCanvasPages
            pages={pages}
            document={document}
            mode={mode}
            dragCreateType={dragCreateType}
            onDragCreateComplete={() => setDragCreateType(null)}
            zoom={zoom}
            onDocumentChange={onDocumentChange}
            pageWidth={scaledPageWidth}
          />
        )}
      </div>
    </div>
  );
});

function RoundIconButton({
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  readonly ariaLabel: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): JSX.Element {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      disabled={disabled}
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        border: '1px solid rgba(148, 163, 184, 0.35)',
        background: disabled ? 'rgba(241, 245, 249, 0.85)' : 'rgba(255,255,255,0.95)',
        color: disabled ? '#94a3b8' : '#0f172a',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        transform: pressed && !disabled ? 'scale(0.94)' : 'scale(1)',
        transition: 'transform 120ms ease',
      }}
    >
      {children}
    </button>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.25V10.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.25 6H10.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MinusIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1.25 6H10.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
