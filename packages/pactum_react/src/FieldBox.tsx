import type { ContractDocument } from '@pactum/pactum_core';
import {
  getResolvedFieldValue,
  moveField,
  resizeField,
  setFieldValue,
  type ContractField,
  type ContractFieldValue,
} from '@pactum/pactum_core';
import {
  useCallback,
  useMemo,
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

export function FieldBox({
  field,
  document,
  mode,
  onDocumentChange,
  pageOverlayRef,
}: FieldBoxProps): JSX.Element {
  const resolved = getResolvedFieldValue(document, field.id);
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
      setPreview({
        x: field.x,
        y: field.y,
        width: start.ow + dw,
        height: start.oh + dh,
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
      onDocumentChange(
        resizeField(document, field.id, {
          width: start.ow + dw,
          height: start.oh + dh,
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
        <input
          type="checkbox"
          checked={resolved === true}
          onChange={(ev) => trySetValue(ev.target.checked)}
          aria-label={field.name}
        />
      );
    }
    if (field.type === 'textarea') {
      return (
        <textarea
          value={typeof resolved === 'string' ? resolved : ''}
          onChange={(ev) => trySetValue(ev.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          style={{ width: '100%', height: '100%', boxSizing: 'border-box', fontSize: 10 }}
        />
      );
    }
    if (field.type === 'select') {
      return (
        <select
          value={typeof resolved === 'string' ? resolved : ''}
          onChange={(ev) => trySetValue(ev.target.value)}
          style={{ width: '100%', fontSize: 10 }}
        >
          <option value="">Select…</option>
          {field.options.map((o: { value: string; label: string }) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === 'radio') {
      return (
        <div style={{ fontSize: 9 }}>
          {field.options.map((o: { value: string; label: string }) => (
            <label key={o.value} style={{ display: 'block' }}>
              <input
                type="radio"
                name={field.id}
                checked={resolved === o.value}
                onChange={() => trySetValue(o.value)}
              />{' '}
              {o.label}
            </label>
          ))}
        </div>
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
        placeholder={field.placeholder}
        style={{ width: '100%', fontSize: 10 }}
      />
    );
  }, [canEditValue, field, resolved, trySetValue]);

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

  return (
    <div
      data-field-id={field.id}
      style={{
        position: 'absolute',
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
        boxSizing: 'border-box',
        border:
          mode === 'builder'
            ? '1px dashed rgba(0,80,200,0.7)'
            : '1px solid rgba(0,0,0,0.15)',
        background: 'rgba(255,255,255,0.4)',
        overflow: 'hidden',
        cursor: mode === 'builder' ? 'move' : 'default',
      }}
      onPointerDown={mode === 'builder' ? onDragPointerDown : undefined}
    >
      {b ? (
        <span
          title={field.sharedKey}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            fontSize: 8,
            padding: '1px 3px',
            background: b === 'source' ? '#1a73e8' : '#5f6368',
            color: '#fff',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {b}
        </span>
      ) : null}
      {stampBlock}
      {signatureBlock}
      {!stampBlock && !signatureBlock && input}
      {!stampBlock && !signatureBlock && !input && (
        <span style={{ fontSize: 10, pointerEvents: 'none' }}>{displayText}</span>
      )}
      {mode === 'builder' ? (
        <div
          onPointerDown={onResizePointerDown}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 8,
            height: 8,
            background: '#1a73e8',
            cursor: 'nwse-resize',
            zIndex: 3,
          }}
        />
      ) : null}
    </div>
  );
}
