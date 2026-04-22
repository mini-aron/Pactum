import type {
  ContractDocument,
  ContractFieldType,
  ContractFieldValue,
  SignatureField,
  SignatureInputMode,
} from '@pactum/pactum_core';
import { setFieldValue } from '@pactum/pactum_core';
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
  beginDragCreate: (
    fieldType: ContractFieldType,
    options?: ContractViewerDragCreateOptions
  ) => void;
  cancelDragCreate: () => void;
  setFieldImage: (fieldId: string, image: ContractViewerImageInput) => void;
  setSignatureImage: (fieldId: string, image: ContractViewerBinaryImageInput) => void;
  setStampImage: (fieldId: string, image: ContractViewerBinaryImageInput) => void;
}

export interface ContractViewerDragCreateOptions {
  readonly placeholder?: string;
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

function toUint8Array(image: Uint8Array | ArrayBuffer): Uint8Array {
  if (image instanceof Uint8Array) {
    return Uint8Array.from(image);
  }
  return new Uint8Array(image.slice(0));
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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
  const [dragCreate, setDragCreate] = useState<{
    type: ContractFieldType;
    placeholder?: string;
  } | null>(null);
  const [activeSignatureRequest, setActiveSignatureRequest] = useState<{
    fieldId: string;
    mode: SignatureInputMode;
  } | null>(null);
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
  const signaturePadRef = useRef<InstanceType<typeof SignatureCanvas> | null>(null);
  const stampUploadInputRef = useRef<HTMLInputElement>(null);

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

    const value: ContractFieldValue = {
      type: 'signature',
      source,
      image: toUint8Array(input.image),
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
      ...(typeof input.width === 'number' ? { width: input.width } : {}),
      ...(typeof input.height === 'number' ? { height: input.height } : {}),
    };
    onDocumentChange(setFieldValue(document, fieldId, value));
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

  useImperativeHandle(
    ref,
    () => ({
      beginDragCreate: (
        fieldType: ContractFieldType,
        options?: ContractViewerDragCreateOptions
      ) => {
        const placeholder = normalizeOptionalText(options?.placeholder);
        setDragCreate({
          type: fieldType,
          ...(placeholder ? { placeholder } : {}),
        });
      },
      cancelDragCreate: () => {
        setDragCreate(null);
      },
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
    [applyFieldImage]
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
    applyFieldImage(fieldId, {
      source: 'draw',
      image: dataUrlToUint8Array(pad.toDataURL('image/png')),
      mimeType: 'image/png',
    });
  }, [activeSignatureRequest, applyFieldImage]);

  const onStampUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fieldId = activeSignatureRequest?.fieldId;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!fieldId || !file) return;

    const image = new Uint8Array(await file.arrayBuffer());
    applyFieldImage(fieldId, {
      source: 'stamp',
      image,
      ...(file.type ? { mimeType: file.type } : {}),
    });
  }, [activeSignatureRequest, applyFieldImage]);

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
        {isLoadingPages && pages.length === 0 ? (
          <span style={{ padding: 8 }}>Loading pages…</span>
        ) : (
          <ContractCanvasPages
            pages={pages}
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
