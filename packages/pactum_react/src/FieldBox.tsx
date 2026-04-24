import type { ContractDocument } from '@pactum-labs/core';
import {
  clearFieldValue,
  formatDateValue,
  getResolvedFieldValue,
  isIsoDateString,
  isSignatureValue,
  moveField,
  removeField,
  resizeField,
  setFieldValue,
  type ContractField,
  type ContractFieldValue,
  type SignatureInputMode,
} from '@pactum-labs/core';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import type { ContractMode } from './ContractMode';
import {
  MAX_SIGNATURE_IMAGE_BYTES,
  toValidatedSignatureImage,
} from './imageGuards';

export interface FieldBoxProps {
  readonly field: ContractField;
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly zoom?: number;
  readonly onSignatureRequest?: (fieldId: string, mode: SignatureInputMode) => void;
  readonly onDocumentChange: (next: ContractDocument) => void;
  readonly pageOverlayRef: RefObject<HTMLDivElement | null>;
}

const MIN_SIZE = 0.01;
const CONTROL_SIZE = 13;

const getSharedBadge = (field: ContractField): string | null => {
  if (!field.sharedKey) return null;
  return field.sharedMode === 'source' ? 'source' : 'mirror';
};

const getFieldBackground = (field: ContractField): string => {
  if (field.type === 'checkbox') return 'rgba(16, 185, 129, 0.09)';
  if (field.type === 'signature') return 'rgba(99, 102, 241, 0.09)';
  return 'rgba(59, 130, 246, 0.07)';
};

const isMediaField = (field: ContractField): boolean =>
  field.type === 'signature';

function createMediaUrl(value: ContractFieldValue | undefined): string | null {
  if (!value || !isSignatureValue(value)) {
    return null;
  }

  const blob = new Blob([Uint8Array.from(value.image)], {
    type: value.mimeType ?? 'image/png',
  });
  return URL.createObjectURL(blob);
}

type NumberInputValueState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'intermediate' }
  | { readonly kind: 'number'; readonly value: number };

function getNumberInputDraft(value: ContractFieldValue | undefined): string {
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '';
}

function parseNumberInputValue(
  rawValue: string,
  valueAsNumber: number
): NumberInputValueState {
  const normalized = rawValue.trim();
  if (normalized === '') {
    return { kind: 'empty' };
  }

  if (
    normalized === '-' ||
    normalized === '+' ||
    normalized === '.' ||
    normalized === '-.' ||
    normalized === '+.' ||
    /[eE][+-]?$/.test(normalized) ||
    normalized.endsWith('.')
  ) {
    return { kind: 'intermediate' };
  }

  if (Number.isFinite(valueAsNumber)) {
    return { kind: 'number', value: valueAsNumber };
  }

  return { kind: 'intermediate' };
}

function MediaActions({
  actions,
}: {
  readonly actions: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly onClick: () => void;
    readonly tone?: 'primary' | 'danger';
  }>;
}): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        right: 6,
        bottom: 6,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 6,
        zIndex: 2,
      }}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            action.onClick();
          }}
          style={{
            border: '1px solid rgba(15, 23, 42, 0.12)',
            borderRadius: 999,
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            color: action.tone === 'danger' ? '#991b1b' : '#0f172a',
            background:
              action.tone === 'primary' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.92)',
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function FieldBox({
  field,
  document,
  mode,
  zoom = 1,
  onSignatureRequest,
  onDocumentChange,
  pageOverlayRef,
}: FieldBoxProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const resolved = getResolvedFieldValue(document, field.id);
  const [isSelected, setIsSelected] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [preview, setPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string | null>(null);
  const [numberDraft, setNumberDraft] = useState(() => getNumberInputDraft(resolved));
  const [mediaError, setMediaError] = useState<string | null>(null);

  const rect = preview ?? {
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
  };
  const effectiveRect =
    field.type === 'checkbox'
      ? { ...rect, width: Math.min(rect.width, rect.height), height: Math.min(rect.width, rect.height) }
      : rect;
  const textSize =
    'textSize' in field && typeof field.textSize === 'number' ? field.textSize : 10;
  const scaledTextSize = Math.max(8, Math.round(textSize * zoom));
  const borderRadius =
    'borderRadius' in field && typeof field.borderRadius === 'number'
      ? Math.max(0, Math.min(24, field.borderRadius))
      : 4;
  const sharedBadge = getSharedBadge(field);
  const labelText = field.label ?? field.name;
  const requiredMark = field.required ? ' *' : '';
  const sharedHoverText =
    field.sharedKey && sharedBadge
      ? `[${field.sharedKey}] ${sharedBadge === 'source' ? 'Source' : 'Mirror'}`
      : null;
  const canEditValue =
    mode !== 'readonly' &&
    mode !== 'builder' &&
    field.sharedMode !== 'mirror' &&
    !field.readonly;
  const signatureMode: SignatureInputMode =
    field.type === 'signature'
      ? (field.signatureMode ?? 'all')
      : 'all';
  const canEditMedia = canEditValue && mode === 'sign' && isMediaField(field);

  useEffect(() => {
    if (mode !== 'builder' || !isSelected) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setIsSelected(false);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [isSelected, mode]);

  useEffect(() => {
    const mediaUrl = createMediaUrl(resolved);
    setResolvedMediaUrl(mediaUrl);

    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [resolved]);

  useEffect(() => {
    if (field.type !== 'number') return;
    setNumberDraft(getNumberInputDraft(resolved));
  }, [field.id, field.type, resolved]);

  useEffect(() => {
    if (!isMediaField(field)) return;

    if (!canEditMedia) {
      setIsEditingMedia(false);
      return;
    }

    if (field.type === 'signature' && signatureMode === 'stamp-only' && !resolvedMediaUrl) {
      setIsEditingMedia(true);
    }
  }, [canEditMedia, field, resolvedMediaUrl, signatureMode]);

  const trySetValue = useCallback(
    (value: ContractFieldValue) => {
      try {
        onDocumentChange(setFieldValue(document, field.id, value));
        setMediaError(null);
      } catch {
        /* mirror or read-only */
      }
    },
    [document, field.id, onDocumentChange]
  );

  const tryClearValue = useCallback(() => {
    try {
      onDocumentChange(clearFieldValue(document, field.id));
      setIsEditingMedia(false);
      setMediaError(null);
    } catch {
      /* mirror or read-only */
    }
  }, [document, field, onDocumentChange]);

  const onDragPointerDown = (event: React.PointerEvent) => {
    if (mode !== 'builder') return;

    event.stopPropagation();
    const element = event.currentTarget as HTMLElement;
    const overlay = pageOverlayRef.current;
    if (!overlay) return;

    element.setPointerCapture(event.pointerId);
    const rect = overlay.getBoundingClientRect();
    const start = { clientX: event.clientX, clientY: event.clientY, originX: field.x, originY: field.y };

    const onMove = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;

      const dx = (nextEvent.clientX - start.clientX) / rect.width;
      const dy = (nextEvent.clientY - start.clientY) / rect.height;
      setPreview({
        x: start.originX + dx,
        y: start.originY + dy,
        width: field.width,
        height: field.height,
      });
    };

    const onUp = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;

      element.releasePointerCapture(nextEvent.pointerId);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);

      const dx = (nextEvent.clientX - start.clientX) / rect.width;
      const dy = (nextEvent.clientY - start.clientY) / rect.height;
      setPreview(null);
      onDocumentChange(
        moveField(document, field.id, {
          x: start.originX + dx,
          y: start.originY + dy,
        })
      );
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
  };

  const onResizePointerDown = (event: React.PointerEvent) => {
    if (mode !== 'builder') return;

    event.stopPropagation();
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    const overlay = pageOverlayRef.current;
    if (!overlay) return;

    element.setPointerCapture(event.pointerId);
    const rect = overlay.getBoundingClientRect();
    const start = {
      clientX: event.clientX,
      clientY: event.clientY,
      originWidth: field.width,
      originHeight: field.height,
    };

    const onMove = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;

      const dw = (nextEvent.clientX - start.clientX) / rect.width;
      const dh = (nextEvent.clientY - start.clientY) / rect.height;

      if (field.type === 'checkbox') {
        const side = Math.max(MIN_SIZE, start.originWidth + dw, start.originHeight + dh);
        setPreview({
          x: field.x,
          y: field.y,
          width: side,
          height: side,
        });
        return;
      }

      setPreview({
        x: field.x,
        y: field.y,
        width: Math.max(MIN_SIZE, start.originWidth + dw),
        height: Math.max(MIN_SIZE, start.originHeight + dh),
      });
    };

    const onUp = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;

      element.releasePointerCapture(nextEvent.pointerId);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);

      const dw = (nextEvent.clientX - start.clientX) / rect.width;
      const dh = (nextEvent.clientY - start.clientY) / rect.height;
      setPreview(null);

      if (field.type === 'checkbox') {
        const side = Math.max(MIN_SIZE, start.originWidth + dw, start.originHeight + dh);
        onDocumentChange(
          resizeField(document, field.id, {
            width: side,
            height: side,
          })
        );
        return;
      }

      onDocumentChange(
        resizeField(document, field.id, {
          width: Math.max(MIN_SIZE, start.originWidth + dw),
          height: Math.max(MIN_SIZE, start.originHeight + dh),
        })
      );
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
  };

  const onStampUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_SIGNATURE_IMAGE_BYTES) {
      setMediaError(
        `Image files must be ${Math.floor(MAX_SIGNATURE_IMAGE_BYTES / (1024 * 1024))} MB or smaller.`
      );
      return;
    }

    try {
      const normalized = toValidatedSignatureImage({
        source: 'stamp',
        image: new Uint8Array(await file.arrayBuffer()),
        ...(file.type ? { mimeType: file.type } : {}),
      });
      trySetValue({
        type: 'signature',
        source: 'stamp',
        image: normalized.image,
        ...(normalized.mimeType ? { mimeType: normalized.mimeType } : {}),
      });
      setIsEditingMedia(false);
    } catch (error) {
      setMediaError(
        error instanceof Error ? error.message : 'Failed to upload stamp image.'
      );
    }
  };

  const input = useMemo(() => {
    if (!canEditValue || isMediaField(field)) return null;

    if (field.type === 'checkbox') {
      return (
        <button
          type="button"
          aria-label={field.name}
          onClick={() => trySetValue(resolved === true ? false : true)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: scaledTextSize + 6,
            color: '#0f766e',
            padding: 0,
          }}
        >
          {resolved === true ? 'X' : ''}
        </button>
      );
    }

    if (field.type === 'date') {
      const value = typeof resolved === 'string' ? resolved : '';
      const inputValue = isIsoDateString(value) ? value : '';
      const displayValue = value
        ? formatDateValue(value, field.dateFormat)
        : (field.placeholder ?? field.dateFormat ?? 'Select date');

      return (
        <label
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            color: value ? '#0f172a' : '#64748b',
          }}
        >
          <span
            style={{
              fontSize: scaledTextSize,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {displayValue}
          </span>
          <input
            type="date"
            value={inputValue}
            onChange={(nextEvent) => trySetValue(nextEvent.target.value)}
            required={field.required}
            aria-label={field.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </label>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={typeof resolved === 'string' ? resolved : ''}
          onChange={(nextEvent) => trySetValue(nextEvent.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          required={field.required}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            fontSize: scaledTextSize,
            padding: 4,
            border: 'none',
            background: 'transparent',
            resize: 'none',
            outline: 'none',
            color: '#0f172a',
            lineHeight: 1.35,
          }}
        />
      );
    }

    return (
      <input
        type={
          field.type === 'number'
            ? 'number'
            : field.type === 'email'
              ? 'email'
              : field.type === 'phone'
                ? 'tel'
                : 'text'
        }
        value={
          field.type === 'number'
            ? numberDraft
            : typeof resolved === 'string' || typeof resolved === 'number'
              ? resolved
              : ''
        }
        onChange={(nextEvent) => {
          if (field.type === 'number') {
            const rawValue = nextEvent.target.value;
            setNumberDraft(rawValue);
            const value = parseNumberInputValue(
              rawValue,
              nextEvent.target.valueAsNumber
            );
            if (value.kind === 'empty') {
              tryClearValue();
              return;
            }
            if (value.kind === 'number') {
              trySetValue(value.value);
            }
            return;
          }

          trySetValue(nextEvent.target.value);
        }}
        onBlur={(nextEvent) => {
          if (field.type !== 'number') return;

          const value = parseNumberInputValue(
            nextEvent.target.value,
            nextEvent.target.valueAsNumber
          );

          if (value.kind === 'empty') {
            setNumberDraft('');
            tryClearValue();
            return;
          }

          if (value.kind === 'number') {
            const normalized = String(value.value);
            setNumberDraft(normalized);
            trySetValue(value.value);
            return;
          }

          setNumberDraft(getNumberInputDraft(resolved));
        }}
        required={field.required}
        placeholder={field.placeholder}
        style={{
          width: '100%',
          height: '100%',
          fontSize: scaledTextSize,
          boxSizing: 'border-box',
          padding: '0 4px',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          color: '#0f172a',
        }}
      />
    );
  }, [canEditValue, field, numberDraft, resolved, scaledTextSize, tryClearValue, trySetValue]);

  const stampEditor =
    field.type === 'signature' &&
    signatureMode !== 'sign-only' &&
    canEditMedia &&
    isEditingMedia ? (
      <label
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          padding: 12,
          boxSizing: 'border-box',
          background: 'rgba(255, 255, 255, 0.92)',
          border: '1px dashed rgba(59, 130, 246, 0.45)',
          color: '#0f172a',
          cursor: 'pointer',
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            void onStampUpload(event);
          }}
          style={{ display: 'none' }}
        />
        <span style={{ textAlign: 'center', fontSize: scaledTextSize }}>
          Upload stamp image
        </span>
        {mediaError ? (
          <span
            role="alert"
            style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#991b1b' }}
          >
            {mediaError}
          </span>
        ) : null}
      </label>
    ) : null;

  const mediaPreview =
    resolvedMediaUrl ? (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'rgba(255, 255, 255, 0.72)',
        }}
      >
        <img
          src={resolvedMediaUrl}
          alt={field.name}
          draggable={false}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            userSelect: 'none',
          }}
        />
        {canEditMedia ? (
          <MediaActions
            actions={[
              {
                key: 'edit',
                label: 'Edit',
                onClick: () => {
                  onSignatureRequest?.(field.id, signatureMode);
                },
              },
              {
                key: 'remove',
                label: 'Remove',
                onClick: tryClearValue,
                tone: 'danger',
              },
            ]}
          />
        ) : null}
      </div>
    ) : null;

  const mediaPlaceholder =
    isMediaField(field) && !mediaPreview && !stampEditor ? (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          padding: 8,
          boxSizing: 'border-box',
          textAlign: 'center',
          color: '#475569',
          fontSize: scaledTextSize,
        }}
      >
        {canEditMedia ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (signatureMode === 'stamp-only') {
                setIsEditingMedia(true);
                return;
              }
              onSignatureRequest?.(field.id, signatureMode);
            }}
            style={editorButtonStyle()}
          >
            {signatureMode === 'stamp-only'
              ? 'Upload Stamp'
              : signatureMode === 'sign-only'
                ? 'Add Signature'
                : 'Add Signature / Stamp'}
          </button>
        ) : (
          <span>
            {signatureMode === 'stamp-only'
              ? 'Stamp required'
              : 'Signature required'}
          </span>
        )}
      </div>
    ) : null;

  const displayText =
    field.type === 'date' && typeof resolved === 'string'
      ? formatDateValue(resolved, field.dateFormat)
      : typeof resolved === 'string' || typeof resolved === 'number'
        ? String(resolved)
      : resolved === true
        ? 'X'
        : '';
  const builderPlaceholderText =
    mode === 'builder' &&
    displayText === '' &&
    !isMediaField(field) &&
    field.type !== 'checkbox'
      ? (field.type === 'date'
          ? (field.placeholder?.trim() || field.dateFormat?.trim())
          : field.placeholder?.trim())
      : undefined;
  const visibleDisplayText = builderPlaceholderText ?? displayText;

  return (
    <div
      data-field-id={field.id}
      ref={rootRef}
      style={{
        position: 'absolute',
        left: `${effectiveRect.x * 100}%`,
        top: `${effectiveRect.y * 100}%`,
        width: `${effectiveRect.width * 100}%`,
        height: `${effectiveRect.height * 100}%`,
        boxSizing: 'border-box',
        overflow: 'visible',
        cursor: mode === 'builder' ? 'move' : 'default',
      }}
      onPointerDown={
        mode === 'builder'
          ? (event) => {
              setIsSelected(true);
              onDragPointerDown(event);
            }
          : undefined
      }
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <span
        id={labelId}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translateY(-100%)',
          fontSize: 8,
          lineHeight: 1,
          color: '#334155',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {`${labelText}${requiredMark}`}
      </span>

      {sharedHoverText && isHovered ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translateY(calc(-100% - 11px))',
            fontSize: 8,
            lineHeight: 1,
            color: '#2563eb',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 3,
            padding: '1px 4px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {sharedHoverText}
        </span>
      ) : null}

      {mode === 'builder' ? (
        <button
          type="button"
          aria-label={`Delete field ${field.name}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            setIsSelected(true);
          }}
          onClick={(event) => {
            event.stopPropagation();
            onDocumentChange(removeField(document, field.id));
          }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            transform: 'translate(50%, -50%)',
            width: CONTROL_SIZE,
            height: CONTROL_SIZE,
            borderRadius: 4,
            border: '1px solid rgba(220, 38, 38, 0.35)',
            background: 'rgba(254, 226, 226, 0.95)',
            color: '#b91c1c',
            fontSize: 8,
            lineHeight: 1,
            cursor: 'pointer',
            zIndex: 4,
            padding: 0,
          }}
        >
          X
        </button>
      ) : null}

      <div
        style={{
          width: '100%',
          height: '100%',
          border:
            mode === 'builder'
              ? isSelected
                ? '1px solid rgba(37, 99, 235, 0.95)'
                : '1px dashed rgba(37, 99, 235, 0.7)'
              : '1px solid rgba(148, 163, 184, 0.45)',
          background: getFieldBackground(field),
          borderRadius,
          overflow: 'hidden',
          boxSizing: 'border-box',
          transition:
            'border-color 160ms ease, transform 160ms ease, background-color 160ms ease',
          transform: isSelected ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        {stampEditor}
        {!stampEditor && mediaPreview}
        {!stampEditor && !mediaPreview && mediaPlaceholder}
        {!stampEditor && !mediaPreview && !mediaPlaceholder && input}
        {!stampEditor && !mediaPreview && !mediaPlaceholder && !input ? (
          <span
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize:
                field.type === 'checkbox' ? scaledTextSize + 6 : scaledTextSize,
              color: builderPlaceholderText ? '#64748b' : '#0f172a',
              pointerEvents: 'none',
              padding: '0 4px',
              boxSizing: 'border-box',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {visibleDisplayText}
          </span>
        ) : null}
      </div>

      {mode === 'builder' ? (
        <div
          onPointerDown={(event) => {
            setIsSelected(true);
            onResizePointerDown(event);
          }}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            transform: 'translate(50%, 50%)',
            width: CONTROL_SIZE,
            height: CONTROL_SIZE,
            background: 'rgba(59, 130, 246, 0.95)',
            border: '1px solid rgba(255,255,255,0.95)',
            borderRadius: 4,
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'nwse-resize',
            zIndex: 3,
          }}
        >
          +
        </div>
      ) : null}
    </div>
  );
}

function editorButtonStyle(tone: 'primary' | 'default' = 'default'): CSSProperties {
  return {
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    color: tone === 'primary' ? '#fff' : '#0f172a',
    background: tone === 'primary' ? 'rgba(37, 99, 235, 0.92)' : 'rgba(255, 255, 255, 0.96)',
  };
}

export { parseNumberInputValue };
