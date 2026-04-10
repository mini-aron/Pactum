import type { ContractDocument } from '@pactum/pactum_core';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
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
  const [zoom, setZoom] = useState(1);
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

  const file = useMemo(
    () => ({ data: document.pdfData }),
    [document.pdfData]
  );

  const basePageWidth = pageWidth ?? 720;
  const scaledPageWidth = Math.round(basePageWidth * zoom);

  const onZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))));
  }, []);

  const onZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))));
  }, []);

  const onZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const onViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1) return;
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest('[data-field-id]')) return;

      const viewport = viewportRef.current;
      if (!viewport) return;

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
    [zoom]
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
    <div className={className} style={style}>
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
        style={{
          overflow: 'auto',
          cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
        }}
      >
        <ContractPdfPages
          file={file}
          document={document}
          mode={mode}
          onDocumentChange={onDocumentChange}
          pageWidth={scaledPageWidth}
        />
      </div>
    </div>
  );
}

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
