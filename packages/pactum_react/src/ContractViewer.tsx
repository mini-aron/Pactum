import type {
  ContractDocument,
  ContractFieldType,
  ContractFieldValue,
  SignatureField,
  SignatureInputMode,
} from '@pactum-labs/core';
import { setFieldValue } from '@pactum-labs/core';
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
import SignatureCanvasImport from 'react-signature-canvas';
import type { ContractMode } from './ContractMode';
import { ContractCanvasPages } from './ContractCanvasPages';
import { configurePdfWorker } from './configurePdfWorker';
import {
  MAX_SIGNATURE_IMAGE_BYTES,
  toValidatedSignatureImage,
} from './imageGuards';
import {
  getDocumentPageCount,
  loadRenderedPage,
  type RenderedPage,
} from './pageSource';

export interface ContractViewerProps {
  readonly mode: ContractMode;
  readonly document: ContractDocument;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageWidth?: number;
  readonly viewportHeight?: number | string;
  readonly showPageNavigation?: boolean;
  readonly pdfWorkerSrc?: string;
  className?: string;
  style?: CSSProperties;
}

export interface ContractViewerHandle {
  beginDragCreate: (
    fieldType: ContractFieldType,
    options?: ContractViewerDragCreateOptions
  ) => void;
  cancelDragCreate: () => void;
  goToPage: (pageIndex: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  getActivePageIndex: () => number;
  getPageCount: () => number;
  setFieldImage: (fieldId: string, image: ContractViewerImageInput) => void;
  setSignatureImage: (fieldId: string, image: ContractViewerBinaryImageInput) => void;
  setStampImage: (fieldId: string, image: ContractViewerBinaryImageInput) => void;
}

export interface ContractViewerDragCreateOptions {
  readonly placeholder?: string;
  readonly dateFormat?: string;
}

export interface ContractViewerBinaryImageInput {
  readonly image: Uint8Array | ArrayBuffer;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface ContractViewerImageInput extends ContractViewerBinaryImageInput {
  readonly source?: 'draw' | 'stamp';
}

const SignatureCanvas =
  (
    SignatureCanvasImport as unknown as {
      readonly default?: typeof SignatureCanvasImport;
    }
  ).default ?? SignatureCanvasImport;

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const [, base64 = ''] = dataUrl.split(',');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function resolveSignatureMode(field: SignatureField): SignatureInputMode {
  return field.signatureMode ?? 'all';
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const ContractViewer = forwardRef<ContractViewerHandle, ContractViewerProps>(function ContractViewer({
  mode,
  document,
  onDocumentChange,
  pageWidth,
  viewportHeight = '80vh',
  showPageNavigation = false,
  pdfWorkerSrc,
  className,
  style,
}: ContractViewerProps, ref): JSX.Element {
  const [zoom, setZoom] = useState(1);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [dragCreate, setDragCreate] = useState<{
    type: ContractFieldType;
    placeholder?: string;
    dateFormat?: string;
  } | null>(null);
  const [activeSignatureRequest, setActiveSignatureRequest] = useState<{
    fieldId: string;
    mode: SignatureInputMode;
  } | null>(null);
  const [page, setPage] = useState<RenderedPage | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageLoadError, setPageLoadError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });
  const signaturePadRef = useRef<InstanceType<typeof SignatureCanvas> | null>(null);
  const stampUploadInputRef = useRef<HTMLInputElement>(null);

  const pageCount = getDocumentPageCount(document);
  const clampPageIndex = useCallback((pageIndex: number) => {
    if (pageCount <= 0) return 0;
    return Math.max(0, Math.min(pageCount - 1, Math.floor(pageIndex)));
  }, [pageCount]);

  const applyFieldImage = useCallback((fieldId: string, input: ContractViewerImageInput) => {
    const field = document.fields.find((candidate) => candidate.id === fieldId);
    if (!field) {
      throw new Error(`Field ID "${fieldId}" was not found.`);
    }
    if (field.type !== 'signature') {
      throw new Error(`Field "${fieldId}" is not a signature field.`);
    }

    const mode = resolveSignatureMode(field);
    const source = input.source ?? 'draw';
    if (mode === 'sign-only' && source === 'stamp') {
      throw new Error(`Field "${fieldId}" allows signature drawing only.`);
    }
    if (mode === 'stamp-only' && source === 'draw') {
      throw new Error(`Field "${fieldId}" allows stamp upload only.`);
    }

    const normalized = toValidatedSignatureImage(input);
    const value: ContractFieldValue = {
      type: 'signature',
      source,
      image: normalized.image,
      ...(normalized.mimeType ? { mimeType: normalized.mimeType } : {}),
      ...(typeof normalized.width === 'number' ? { width: normalized.width } : {}),
      ...(typeof normalized.height === 'number' ? { height: normalized.height } : {}),
    };
    onDocumentChange(setFieldValue(document, fieldId, value));
    setSignatureError(null);
    if (activeSignatureRequest?.fieldId === fieldId) {
      setActiveSignatureRequest(null);
      signaturePadRef.current?.clear();
    }
  }, [activeSignatureRequest, document, onDocumentChange]);

  useEffect(() => {
    configurePdfWorker(pdfWorkerSrc);
  }, [pdfWorkerSrc]);

  useEffect(() => {
    if (mode !== 'builder' && dragCreate !== null) {
      setDragCreate(null);
    }
  }, [dragCreate, mode]);

  useEffect(() => {
    setActivePageIndex((prev) => clampPageIndex(prev));
  }, [clampPageIndex]);

  const goToPage = useCallback((pageIndex: number) => {
    setActivePageIndex(clampPageIndex(pageIndex));
  }, [clampPageIndex]);

  const nextPage = useCallback(() => {
    setActivePageIndex((prev) => clampPageIndex(prev + 1));
  }, [clampPageIndex]);

  const previousPage = useCallback(() => {
    setActivePageIndex((prev) => clampPageIndex(prev - 1));
  }, [clampPageIndex]);

  useImperativeHandle(
    ref,
    () => ({
      beginDragCreate: (
        fieldType: ContractFieldType,
        options?: ContractViewerDragCreateOptions
      ) => {
        const placeholder = normalizeOptionalText(options?.placeholder);
        const dateFormat = normalizeOptionalText(options?.dateFormat);
        setDragCreate({
          type: fieldType,
          ...(placeholder ? { placeholder } : {}),
          ...(fieldType === 'date' && dateFormat ? { dateFormat } : {}),
        });
      },
      cancelDragCreate: () => {
        setDragCreate(null);
      },
      goToPage,
      nextPage,
      previousPage,
      getActivePageIndex: () => activePageIndex,
      getPageCount: () => pageCount,
      setFieldImage: (fieldId: string, image: ContractViewerImageInput) => {
        applyFieldImage(fieldId, image);
      },
      setSignatureImage: (fieldId: string, image: ContractViewerBinaryImageInput) => {
        applyFieldImage(fieldId, { ...image, source: 'draw' });
      },
      setStampImage: (fieldId: string, image: ContractViewerBinaryImageInput) => {
        applyFieldImage(fieldId, { ...image, source: 'stamp' });
      },
    }),
    [activePageIndex, applyFieldImage, goToPage, nextPage, pageCount, previousPage]
  );

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingPage(true);
    setPageLoadError(null);

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
        setPageLoadError(
          error instanceof Error ? error.message : 'Failed to load document pages.'
        );
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoadingPage(false);
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
      if (mode === 'builder' && dragCreate !== null) return;
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
    [dragCreate, mode]
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

  const saveSignature = useCallback(() => {
    const fieldId = activeSignatureRequest?.fieldId;
    const pad = signaturePadRef.current;
    if (!fieldId || !pad || pad.isEmpty()) return;
    try {
      applyFieldImage(fieldId, {
        source: 'draw',
        image: dataUrlToUint8Array(pad.toDataURL('image/png')),
        mimeType: 'image/png',
      });
    } catch (error) {
      setSignatureError(
        error instanceof Error ? error.message : 'Failed to save signature image.'
      );
    }
  }, [activeSignatureRequest, applyFieldImage]);

  const onStampUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fieldId = activeSignatureRequest?.fieldId;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!fieldId || !file) return;

    if (file.size > MAX_SIGNATURE_IMAGE_BYTES) {
      setSignatureError(
        `Image files must be ${Math.floor(MAX_SIGNATURE_IMAGE_BYTES / (1024 * 1024))} MB or smaller.`
      );
      return;
    }

    try {
      const image = new Uint8Array(await file.arrayBuffer());
      applyFieldImage(fieldId, {
        source: 'stamp',
        image,
        ...(file.type ? { mimeType: file.type } : {}),
      });
    } catch (error) {
      setSignatureError(
        error instanceof Error ? error.message : 'Failed to upload stamp image.'
      );
    }
  }, [activeSignatureRequest, applyFieldImage]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
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
          position: 'absolute',
          left: 0,
          right: 0,
          top: 8,
          zIndex: 5,
          paddingInline: 8,
          pointerEvents: 'none',
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
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
            pointerEvents: 'auto',
          }}
        >
          {showPageNavigation && pageCount > 1 ? (
            <>
              <RoundIconButton
                ariaLabel="Previous page"
                onClick={previousPage}
                disabled={activePageIndex <= 0}
              >
                <ChevronLeftIcon />
              </RoundIconButton>
              <button
                type="button"
                onClick={() => goToPage(activePageIndex)}
                style={{
                  minWidth: 62,
                  height: 30,
                  borderRadius: 999,
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  background: 'rgba(248, 250, 252, 0.9)',
                  color: '#0f172a',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'default',
                  letterSpacing: 0.2,
                }}
                aria-label="Current page"
              >
                {activePageIndex + 1}/{pageCount}
              </button>
              <RoundIconButton
                ariaLabel="Next page"
                onClick={nextPage}
                disabled={activePageIndex >= pageCount - 1}
              >
                <ChevronRightIcon />
              </RoundIconButton>
              <div
                style={{
                  width: 1,
                  height: 20,
                  background: 'rgba(148, 163, 184, 0.35)',
                  marginInline: 2,
                }}
              />
            </>
          ) : null}
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
          height: '100%',
          minHeight: 0,
          overflow: 'auto',
          cursor:
            mode === 'builder' && dragCreate !== null
              ? 'crosshair'
              : isPanning
                ? 'grabbing'
                : zoom > 1
                  ? 'grab'
                  : 'default',
          touchAction: zoom > 1 ? 'none' : 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {pageLoadError ? (
          <div role="alert" style={{ padding: 12, color: '#991b1b', fontSize: 13 }}>
            Failed to load pages: {pageLoadError}
          </div>
        ) : null}
        {isLoadingPage && page === null ? (
          <span style={{ padding: 8 }}>Loading page...</span>
        ) : (
          <ContractCanvasPages
            page={page}
            document={document}
            mode={mode}
            dragCreateType={dragCreate?.type ?? null}
            onDragCreateComplete={() => setDragCreate(null)}
            onSignatureRequest={(fieldId, signatureMode) => {
              if (mode !== 'sign') return;
              setActiveSignatureRequest({ fieldId, mode: signatureMode });
            }}
            zoom={zoom}
            onDocumentChange={onDocumentChange}
            pageWidth={scaledPageWidth}
            {...(dragCreate?.placeholder
              ? { dragCreatePlaceholder: dragCreate.placeholder }
              : {})}
            {...(dragCreate?.dateFormat
              ? { dragCreateDateFormat: dragCreate.dateFormat }
              : {})}
          />
        )}
      </div>
      {activeSignatureRequest ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 'min(720px, 92vw)',
              background: '#fff',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.35)',
              padding: 14,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Signature Pad ({activeSignatureRequest.fieldId})
            </div>
            {signatureError ? (
              <div
                role="alert"
                style={{ marginBottom: 8, color: '#991b1b', fontSize: 12 }}
              >
                {signatureError}
              </div>
            ) : null}
            {activeSignatureRequest.mode !== 'stamp-only' ? (
              <div
                style={{
                  border: '1px solid rgba(148,163,184,0.45)',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <SignatureCanvas
                  ref={signaturePadRef}
                  clearOnResize={false}
                  canvasProps={{
                    style: {
                      width: '100%',
                      height: 260,
                      display: 'block',
                      background: '#fff',
                    },
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  border: '1px dashed rgba(148,163,184,0.55)',
                  borderRadius: 6,
                  padding: 14,
                  textAlign: 'center',
                  color: '#475569',
                  fontSize: 12,
                }}
              >
                This field accepts stamp image only.
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 10,
              }}
            >
              <input
                ref={stampUploadInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  void onStampUpload(event);
                }}
                style={{ display: 'none' }}
              />
              {activeSignatureRequest.mode !== 'sign-only' ? (
                <button
                  type="button"
                  onClick={() => stampUploadInputRef.current?.click()}
                  style={inlineActionButtonStyle()}
                >
                  Upload Stamp
                </button>
              ) : null}
              {activeSignatureRequest.mode !== 'stamp-only' ? (
                <button
                  type="button"
                  onClick={() => signaturePadRef.current?.clear()}
                  style={inlineActionButtonStyle()}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setActiveSignatureRequest(null);
                  setSignatureError(null);
                  signaturePadRef.current?.clear();
                }}
                style={inlineActionButtonStyle()}
              >
                Cancel
              </button>
              {activeSignatureRequest.mode !== 'stamp-only' ? (
                <button
                  type="button"
                  onClick={saveSignature}
                  style={inlineActionButtonStyle()}
                >
                  Save Signature
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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

function ChevronLeftIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M7.75 2.25L4 6L7.75 9.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M4.25 2.25L8 6L4.25 9.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function inlineActionButtonStyle(
  tone: 'default' | 'primary' = 'default'
): CSSProperties {
  return {
    border: '1px solid rgba(148,163,184,0.45)',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    color: tone === 'primary' ? '#fff' : '#0f172a',
    background: tone === 'primary' ? 'rgba(37,99,235,0.95)' : '#fff',
  };
}
