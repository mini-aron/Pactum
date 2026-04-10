import type { ContractDocument } from '@pactum/pactum_core';
import {
  getResolvedFieldValue,
  moveField,
  removeField,
  resizeField,
  setFieldValue,
  type ContractField,
  type ContractFieldValue,
} from '@pactum/pactum_core';
import {
  useEffect,
  useCallback,
  useMemo,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react';
import SignatureCanvas from 'react-signature-canvas';
import type { ContractMode } from './ContractMode';

export interface FieldBoxProps {
  readonly field: ContractField;
  readonly document: ContractDocument;
  readonly mode: ContractMode;
  readonly onDocumentChange: (next: ContractDocument) => void;
  /** Page overlay (normalized coordinates); used to convert drag/resize pixels. */
  readonly pageOverlayRef: RefObject<HTMLDivElement | null>;
}

const badge = (field: ContractField): string | null => {
  if (!field.sharedKey) return null;
  return field.sharedMode === 'source' ? 'source' : 'mirror';
};

const MIN_SIZE = 0.01;
const CONTROL_SIZE = 13;

const getFieldBackground = (field: ContractField): string => {
  if (field.type === 'checkbox') return 'rgba(16, 185, 129, 0.09)';
  if (field.type === 'signature' || field.type === 'stamp') return 'rgba(99, 102, 241, 0.09)';
  return 'rgba(59, 130, 246, 0.07)';
};

export function FieldBox({
  field,
  document,
  mode,
  onDocumentChange,
  pageOverlayRef,
}: FieldBoxProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const resolved = getResolvedFieldValue(document, field.id);
  const [isSelected, setIsSelected] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [preview, setPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

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
  const borderRadius =
    'borderRadius' in field && typeof field.borderRadius === 'number'
      ? Math.max(0, Math.min(24, field.borderRadius))
      : 4;

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

  const trySetValue = useCallback(
    (value: ContractFieldValue) => {
      try {
        onDocumentChange(setFieldValue(document, field.id, value));
      } catch {
        /* mirror or read-only */
      }
    },
    [document, field.id, onDocumentChange]
  );

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (mode !== 'builder') return;
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const overlay = pageOverlayRef.current;
    if (!overlay) return;
    const r = overlay.getBoundingClientRect();
    const start = { cx: e.clientX, cy: e.clientY, ox: field.x, oy: field.y };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const dx = (ev.clientX - start.cx) / r.width;
      const dy = (ev.clientY - start.cy) / r.height;
      setPreview({
        x: start.ox + dx,
        y: start.oy + dy,
        width: field.width,
        height: field.height,
      });
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      const dx = (ev.clientX - start.cx) / r.width;
      const dy = (ev.clientY - start.cy) / r.height;
      setPreview(null);
      onDocumentChange(
        moveField(document, field.id, { x: start.ox + dx, y: start.oy + dy })
      );
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    if (mode !== 'builder') return;
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const overlay = pageOverlayRef.current;
    if (!overlay) return;
    const r = overlay.getBoundingClientRect();
    const start = {
      cx: e.clientX,
      cy: e.clientY,
      ow: field.width,
      oh: field.height,
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const dw = (ev.clientX - start.cx) / r.width;
      const dh = (ev.clientY - start.cy) / r.height;
      if (field.type === 'checkbox') {
        const side = Math.max(MIN_SIZE, start.ow + dw, start.oh + dh);
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
        width: Math.max(MIN_SIZE, start.ow + dw),
        height: Math.max(MIN_SIZE, start.oh + dh),
      });
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      const dw = (ev.clientX - start.cx) / r.width;
      const dh = (ev.clientY - start.cy) / r.height;
      setPreview(null);
      if (field.type === 'checkbox') {
        const side = Math.max(MIN_SIZE, start.ow + dw, start.oh + dh);
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
          width: Math.max(MIN_SIZE, start.ow + dw),
          height: Math.max(MIN_SIZE, start.oh + dh),
        })
      );
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const canEditValue =
    mode !== 'readonly' &&
    mode !== 'builder' &&
    field.sharedMode !== 'mirror' &&
    !field.readonly;

  const input = useMemo(() => {
    if (!canEditValue) return null;
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
            fontSize: textSize + 6,
            color: '#0f766e',
            padding: 0,
          }}
        >
          {resolved === true ? '✓' : ''}
        </button>
      );
    }
    if (field.type === 'textarea') {
      return (
        <textarea
          value={typeof resolved === 'string' ? resolved : ''}
          onChange={(ev) => trySetValue(ev.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          required={field.required}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            fontSize: textSize,
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
                : field.type === 'date'
                  ? 'date'
                  : 'text'
        }
        value={
          typeof resolved === 'string' || typeof resolved === 'number'
            ? resolved
            : ''
        }
        onChange={(ev) => {
          if (field.type === 'number') {
            const n = Number(ev.target.value);
            trySetValue(Number.isFinite(n) ? n : 0);
          } else trySetValue(ev.target.value);
        }}
        required={field.required}
        placeholder={field.placeholder}
        style={{
          width: '100%',
          height: '100%',
          fontSize: textSize,
          boxSizing: 'border-box',
          padding: '0 4px',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          color: '#0f172a',
        }}
      />
    );
  }, [canEditValue, field, resolved, textSize, trySetValue]);

  const signatureRef = useRef<SignatureCanvas>(null);

  const stampBlock =
    field.type === 'stamp' && mode === 'sign' && canEditValue ? (
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const buf = new Uint8Array(await file.arrayBuffer());
          trySetValue({
            type: 'stamp',
            image: buf,
            ...(file.type ? { mimeType: file.type } : {}),
          });
        }}
        style={{ fontSize: 9, maxWidth: '100%' }}
      />
    ) : null;

  const signatureBlock =
    field.type === 'signature' && mode === 'sign' && canEditValue ? (
      <div style={{ width: '100%', height: '100%', background: '#fff' }}>
        <SignatureCanvas
          ref={signatureRef}
          canvasProps={{
            style: { width: '100%', height: '70%', border: '1px solid #ccc' },
          }}
          onEnd={async () => {
            const canvas = signatureRef.current;
            if (canvas && !canvas.isEmpty()) {
              const dataUrl = canvas.toDataURL('image/png');
              const buf = await fetch(dataUrl).then((r) => r.arrayBuffer());
              trySetValue({
                type: 'signature',
                image: new Uint8Array(buf),
                mimeType: 'image/png',
              });
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            signatureRef.current?.clear();
          }}
          style={{ fontSize: 9 }}
        >
          Clear
        </button>
      </div>
    ) : null;

  const displayText =
    typeof resolved === 'string' || typeof resolved === 'number'
      ? String(resolved)
      : resolved === true
        ? '✓'
        : '';

  const b = badge(field);
  const labelText = field.label ?? field.name;
  const requiredMark = field.required ? ' *' : '';
  const sharedHoverText =
    field.sharedKey && b
      ? `[${field.sharedKey}] ${b === 'source' ? 'Source' : 'Mirror'}`
      : null;

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
          ? (e) => {
              setIsSelected(true);
              onDragPointerDown(e);
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
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsSelected(true);
          }}
          onClick={(e) => {
            e.stopPropagation();
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
            transition: 'transform 120ms ease, background-color 120ms ease',
          }}
        >
          ×
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
        {stampBlock}
        {signatureBlock}
        {!stampBlock && !signatureBlock && input}
        {!stampBlock && !signatureBlock && !input && (
          <span
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: field.type === 'checkbox' ? textSize + 6 : textSize,
              color: '#0f172a',
              pointerEvents: 'none',
            }}
          >
            {displayText}
          </span>
        )}
      </div>
      {mode === 'builder' ? (
        <div
          onPointerDown={(e) => {
            setIsSelected(true);
            onResizePointerDown(e);
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
          ↘
        </div>
      ) : null}
    </div>
  );
}
