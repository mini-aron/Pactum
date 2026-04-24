# Pactum Usage Guide

This guide covers the current public usage of `@pactum-labs/core` and `@pactum-labs/react`.
It reflects the runtime rules enforced by the library today.

## Packages

| Package | Purpose |
| --- | --- |
| `@pactum-labs/core` | Immutable document model, field operations, validation, shared values, and PDF export |
| `@pactum-labs/react` | React viewer for rendering one contract page at a time with field overlays |

## Install

```bash
pnpm add @pactum-labs/core @pactum-labs/react
```

`@pactum-labs/react` expects `react` and `react-dom` as peer dependencies.

## Quick Start

```ts
import {
  createDocument,
  createField,
  setFieldValue,
  validateDocument,
  exportToPdf,
  type ContractDocument,
} from '@pactum-labs/core';

let document: ContractDocument = createDocument({
  id: 'contract-001',
  title: 'Employment Contract',
  pdfData,
  pageImages: [pageImageBytes],
  pageCount: 1,
  pages: [{ index: 0, width: 612, height: 792 }],
});

document = createField(document, {
  id: 'employeeName',
  name: 'Employee Name',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.2,
  width: 0.35,
  height: 0.05,
  required: true,
});

document = createField(document, {
  id: 'employeeSignature',
  name: 'Employee Signature',
  type: 'signature',
  signatureMode: 'all',
  page: 0,
  x: 0.1,
  y: 0.72,
  width: 0.35,
  height: 0.12,
  required: true,
});

document = setFieldValue(document, 'employeeName', 'Ada Lovelace');

const validation = validateDocument(document);
if (!validation.valid) {
  console.log(validation.errors);
}

const pdfBytes = await exportToPdf(document);
```

## Core Model

```ts
interface ContractDocument {
  readonly id: string;
  readonly title: string;
  readonly pdfData: Uint8Array;
  readonly pageImages?: readonly Uint8Array[];
  readonly pageCount: number;
  readonly pages: readonly PageInfo[];
  readonly fields: readonly ContractField[];
  readonly fieldValues: FieldValueMap;
  readonly sharedValues: SharedValueMap;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

`pdfData` is always required. `pageImages` is optional, but when present the React viewer uses it before falling back to PDF rendering.

## Coordinates

Field geometry is normalized to page size.

| Field | Meaning |
| --- | --- |
| `page` | Zero-based page index |
| `x` | Left position from `0` to `1` |
| `y` | Top position from `0` to `1` |
| `width` | Width ratio of the page |
| `height` | Height ratio of the page |

`createField`, `updateField`, `moveField`, and `resizeField` clamp geometry into page bounds.

## Field Types

Common field properties:

| Field | Type |
| --- | --- |
| `id` | `string` |
| `name` | `string` |
| `type` | `ContractFieldType` |
| `page` | `number` |
| `x` | `number` |
| `y` | `number` |
| `width` | `number` |
| `height` | `number` |
| `label` | `string` |
| `textSize` | `number` |
| `borderRadius` | `number` |
| `required` | `boolean` |
| `placeholder` | `string` |
| `readonly` | `boolean` |
| `hidden` | `boolean` |
| `defaultValue` | `unknown` |
| `validation` | `FieldValidation` |
| `sharedKey` | `string` |
| `sharedMode` | `'source' \| 'mirror'` |

Supported field types:

| Type | Runtime value |
| --- | --- |
| `text` | `string` |
| `textarea` | `string` |
| `date` | `string` in `yyyy-mm-dd` form |
| `checkbox` | `boolean` |
| `signature` | `SignatureValue` |
| `email` | `string` |
| `phone` | `string` |
| `number` | `number` |

`field.id` must be unique inside a document.

## Runtime Value Rules

Pactum enforces value compatibility at runtime.

- `text`, `textarea`, `date`, `email`, and `phone` accept only strings.
- `number` accepts only finite numbers.
- `checkbox` accepts only booleans.
- `signature` accepts only signature objects.
- Mirror fields reject direct writes.
- Readonly fields reject writes and clears.

Signature images are restricted to PNG and JPEG. MIME type and image bytes must agree.

```ts
interface SignatureValue {
  readonly type: 'signature';
  readonly source?: 'draw' | 'stamp';
  readonly image: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}
```

## Operations

| Function | Description |
| --- | --- |
| `createDocument(input)` | Create an empty document |
| `createField(document, field)` | Add a field |
| `updateField(document, fieldId, patch)` | Update field properties except `id` and `type` |
| `removeField(document, fieldId)` | Remove a field and its direct value |
| `moveField(document, fieldId, position)` | Move a field |
| `resizeField(document, fieldId, size)` | Resize a field |
| `setFieldValue(document, fieldId, value)` | Set a field value |
| `clearFieldValue(document, fieldId)` | Clear a field value |
| `getResolvedFieldValue(document, fieldId)` | Read one resolved field value |
| `getResolvedValues(document)` | Read all resolved field values |

Shared source fields write into `sharedValues`. Mirror fields read the shared value through resolution.

## Validation

```ts
import { validateDocument } from '@pactum-labs/core';

const result = validateDocument(document);
```

Validation covers:

- required values
- string min and max length
- number min and max
- regex pattern matching
- invalid runtime value types
- invalid signature image format
- missing shared source fields

If `validation.pattern` is an invalid regex, validation returns an error instead of throwing.

## Date Formatting

Date fields store values as `yyyy-mm-dd`.
`dateFormat` affects viewer display and PDF export.

```ts
import { formatDateValue } from '@pactum-labs/core';

formatDateValue('2026-04-22', 'yyyy.mm.dd');
// '2026.04.22'
```

Supported tokens are `yyyy`, `yy`, `MM`/`mm`, `M`/`m`, `dd`, and `d`.

## PDF Export

```ts
import { exportToPdf } from '@pactum-labs/core';

const pdfBytes = await exportToPdf(document);
```

Export loads `document.pdfData` and draws each resolved field value onto the matching page.

- `hidden: true` fields are skipped.
- Invalid field values fail export early.
- Signature export supports PNG and JPEG only.

## React Viewer

```tsx
import { useState } from 'react';
import { ContractViewer } from '@pactum-labs/react';

function ContractScreen({ initialDocument }: { initialDocument: ContractDocument }) {
  const [document, setDocument] = useState(initialDocument);

  return (
    <ContractViewer
      mode="fill"
      document={document}
      onDocumentChange={setDocument}
      pageWidth={900}
      viewportHeight="80vh"
      showPageNavigation
    />
  );
}
```

### Viewer Props

| Prop | Description |
| --- | --- |
| `mode` | `builder`, `fill`, `sign`, or `readonly` |
| `document` | Document model to render |
| `onDocumentChange` | Called when fields or values change |
| `pageWidth` | Base rendered page width. Default `720` |
| `viewportHeight` | Viewer height. Default `'80vh'` |
| `showPageNavigation` | Show previous/next page controls in the top toolbar. Default `false` |
| `pdfWorkerSrc` | Explicit pdf.js worker path when PDF rendering is needed |
| `className` | Root class name |
| `style` | Root inline style |

### Viewer Behavior

- The viewer renders one page surface inside the viewport.
- Built-in page navigation buttons are hidden by default.
- The viewport supports scroll, zoom, and pan.
- Builder mode supports drag-create, move, resize, and delete.
- Sign mode supports drawing signatures or uploading stamp images based on `signatureMode`.

If your document depends on PDF-backed rendering, configure the pdf.js worker explicitly:

```ts
import { configurePdfWorker } from '@pactum-labs/react';

configurePdfWorker('/pdf.worker.min.mjs');
```

### Viewer Ref API

```tsx
import { useRef } from 'react';
import { ContractViewer, type ContractViewerHandle } from '@pactum-labs/react';

const viewerRef = useRef<ContractViewerHandle>(null);

viewerRef.current?.beginDragCreate('text', {
  placeholder: 'Enter employee name',
});

viewerRef.current?.cancelDragCreate();
viewerRef.current?.goToPage(2);
viewerRef.current?.nextPage();
viewerRef.current?.previousPage();
```

Image injection:

```ts
viewerRef.current?.setSignatureImage('employeeSignature', {
  image: signaturePngBytes,
  mimeType: 'image/png',
});

viewerRef.current?.setStampImage('employeeSignature', {
  image: stampJpegBytes,
  mimeType: 'image/jpeg',
});
```

The viewer keeps single-page rendering, so page navigation is expected to come from your own outer UI through the ref API.

## Lower-Level React Exports

`@pactum-labs/react` also exports `ContractCanvasPages`, `ContractPdfPages`, `FieldBox`, `configurePdfWorker`, `getDocumentPageCount`, and `loadRenderedPage` for custom integrations.
