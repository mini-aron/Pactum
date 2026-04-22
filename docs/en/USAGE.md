# Pactum Library Usage

This guide documents the main APIs in `@pactum-labs/core` and `@pactum-labs/react`, including example code, return shapes, field types, validation output, and React viewer integration.

## Packages

| Package | Purpose |
| --- | --- |
| `@pactum-labs/core` | Document model, field operations, shared field rules, validation, and PDF export |
| `@pactum-labs/react` | React contract viewer, canvas page rendering, field overlays, builder/fill/sign/readonly modes |

## Install

```bash
pnpm add @pactum-labs/core @pactum-labs/react
```

`@pactum-labs/react` uses `react` and `react-dom` as peer dependencies.

## Core Quick Start

`createDocument` creates an empty contract document model. Core operations do not mutate the original object. They return the next `ContractDocument`.

```ts
import {
  createDocument,
  createField,
  setFieldValue,
  validateDocument,
  getResolvedValues,
  type ContractDocument,
} from '@pactum-labs/core';

let document: ContractDocument = createDocument({
  id: 'contract-001',
  title: 'Employment Contract',
  pdfData: pdfBytes,
  pageImages: [pageImageBytes],
  pageCount: 1,
  pages: [{ index: 0, width: 612, height: 792 }],
});

document = createField(document, {
  id: 'employeeName',
  name: 'Employee Name',
  label: 'Employee',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.2,
  width: 0.35,
  height: 0.05,
  placeholder: 'Enter employee name',
  required: true,
  validation: {
    minLength: 2,
    maxLength: 40,
  },
});

document = createField(document, {
  id: 'startDate',
  name: 'Start Date',
  type: 'date',
  dateFormat: 'yyyy.mm.dd',
  page: 0,
  x: 0.1,
  y: 0.28,
  width: 0.25,
  height: 0.05,
});

document = setFieldValue(document, 'employeeName', 'Ada Lovelace');
document = setFieldValue(document, 'startDate', '2026-04-22');

const validation = validateDocument(document);
const values = getResolvedValues(document);
```

### Return Example

```ts
validation;
// {
//   valid: true,
//   errors: []
// }

values;
// {
//   employeeName: 'Ada Lovelace',
//   startDate: '2026-04-22'
// }

document;
// {
//   id: 'contract-001',
//   title: 'Employment Contract',
//   pdfData: Uint8Array,
//   pageImages: [Uint8Array],
//   pageCount: 1,
//   pages: [{ index: 0, width: 612, height: 792 }],
//   fields: [
//     {
//       id: 'employeeName',
//       name: 'Employee Name',
//       label: 'Employee',
//       type: 'text',
//       page: 0,
//       x: 0.1,
//       y: 0.2,
//       width: 0.35,
//       height: 0.05,
//       placeholder: 'Enter employee name',
//       required: true,
//       validation: { minLength: 2, maxLength: 40 }
//     },
//     {
//       id: 'startDate',
//       name: 'Start Date',
//       type: 'date',
//       dateFormat: 'yyyy.mm.dd',
//       page: 0,
//       x: 0.1,
//       y: 0.28,
//       width: 0.25,
//       height: 0.05
//     }
//   ],
//   fieldValues: {
//     employeeName: 'Ada Lovelace',
//     startDate: '2026-04-22'
//   },
//   sharedValues: {},
//   createdAt: '2026-04-22T...',
//   updatedAt: '2026-04-22T...'
// }
```

## Document Shape

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

interface PageInfo {
  readonly index: number;
  readonly width: number;
  readonly height: number;
}
```

When `pageImages` is present, the React viewer renders image-backed pages first. `pdfData` is still required because it is used by PDF export and by the PDF rendering fallback.

## Coordinates

Field geometry uses normalized coordinates, so the same document model can render against different page display sizes.

| Field | Type | Meaning |
| --- | --- | --- |
| `page` | `number` | Zero-based page index |
| `x` | `number` | Horizontal position from the left edge, from `0` to `1` |
| `y` | `number` | Vertical position from the top edge, from `0` to `1` |
| `width` | `number` | Width as a ratio of page width |
| `height` | `number` | Height as a ratio of page height |

For example, `x: 0.1` and `width: 0.35` means the field starts at 10% from the left edge and occupies 35% of the page width. `createField`, `updateField`, `moveField`, and `resizeField` normalize geometry into the page bounds.

```ts
import { toAbsoluteRect, toNormalizedRect } from '@pactum-labs/core';

const abs = toAbsoluteRect(
  { page: 0, x: 0.1, y: 0.2, width: 0.35, height: 0.05 },
  612,
  792
);

// { x: 61.2, y: 158.4, width: 214.2, height: 39.6 }

const normalized = toNormalizedRect(
  { page: 0, x: 61.2, y: 158.4, width: 214.2, height: 39.6 },
  612,
  792
);

// { page: 0, x: 0.1, y: 0.2, width: 0.35, height: 0.05 }
```

## Field Types

Common fields are shared by every `ContractField`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique field ID |
| `name` | `string` | Yes | Internal and accessible field name |
| `type` | `ContractFieldType` | Yes | Field type |
| `page` | `number` | Yes | Zero-based page index |
| `x` | `number` | Yes | Normalized x coordinate |
| `y` | `number` | Yes | Normalized y coordinate |
| `width` | `number` | Yes | Normalized width |
| `height` | `number` | Yes | Normalized height |
| `label` | `string` | No | Viewer label. Falls back to `name` |
| `textSize` | `number` | No | Text size for display and input |
| `borderRadius` | `number` | No | Viewer field box radius |
| `required` | `boolean` | No | Whether the field must be filled |
| `placeholder` | `string` | No | Input placeholder |
| `readonly` | `boolean` | No | Prevents value changes |
| `hidden` | `boolean` | No | Excludes the field from PDF export rendering |
| `defaultValue` | `unknown` | No | Fallback value when no direct value exists |
| `validation` | `FieldValidation` | No | Validation rules |
| `sharedKey` | `string` | No | Shared field group key |
| `sharedMode` | `'source' \| 'mirror'` | No | Shared field source/mirror mode |

Type-specific fields:

| Type | Value Type | Extra Fields | Notes |
| --- | --- | --- | --- |
| `text` | `string` | `maxLength?: number` | Single-line text |
| `textarea` | `string` | `maxLength?: number`, `rows?: number` | Multi-line text |
| `date` | `string` | `dateFormat?: string` | Stored as `yyyy-mm-dd`; formatted when rendered/exported |
| `checkbox` | `boolean` | None | Draws a check mark when `true` |
| `signature` | `SignatureValue` | `signatureMode?: 'all' \| 'sign-only' \| 'stamp-only'` | Drawn signature or stamp image |
| `email` | `string` | None | Viewer input type is `email` |
| `phone` | `string` | None | Viewer input type is `tel` |
| `number` | `number` | `min?: number`, `max?: number`, `step?: number` | Numeric input and numeric validation |

### Field Examples

```ts
const textField = {
  id: 'companyName',
  name: 'Company Name',
  type: 'text',
  page: 0,
  x: 0.12,
  y: 0.18,
  width: 0.4,
  height: 0.045,
  required: true,
  maxLength: 80,
} as const;

const numberField = {
  id: 'salary',
  name: 'Salary',
  type: 'number',
  page: 0,
  x: 0.12,
  y: 0.26,
  width: 0.24,
  height: 0.045,
  min: 0,
  max: 1000000,
  step: 1000,
} as const;

const signatureField = {
  id: 'employeeSignature',
  name: 'Employee Signature',
  type: 'signature',
  signatureMode: 'all',
  page: 0,
  x: 0.12,
  y: 0.72,
  width: 0.35,
  height: 0.12,
} as const;
```

## Value Types

```ts
interface SignatureValue {
  readonly type: 'signature';
  readonly source?: 'draw' | 'stamp';
  readonly image: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

type ContractFieldValue =
  | string
  | number
  | boolean
  | SignatureValue;

type FieldValueMap = Record<string, ContractFieldValue>;
type SharedValueMap = Record<string, ContractFieldValue>;
```

Signature or stamp value example:

```ts
document = setFieldValue(document, 'employeeSignature', {
  type: 'signature',
  source: 'stamp',
  image: stampPngBytes,
  mimeType: 'image/png',
});

// document.fieldValues.employeeSignature
// {
//   type: 'signature',
//   source: 'stamp',
//   image: Uint8Array,
//   mimeType: 'image/png'
// }
```

## Operations

| Function | Return | Description |
| --- | --- | --- |
| `createDocument(input)` | `ContractDocument` | Creates an empty document |
| `createField(document, field)` | `ContractDocument` | Adds a field |
| `updateField(document, fieldId, patch)` | `ContractDocument` | Updates field properties. `id` and `type` cannot be patched |
| `removeField(document, fieldId)` | `ContractDocument` | Removes a field and its direct value |
| `moveField(document, fieldId, position)` | `ContractDocument` | Moves a field |
| `resizeField(document, fieldId, size)` | `ContractDocument` | Resizes a field |
| `setFieldValue(document, fieldId, value)` | `ContractDocument` | Sets a field value |
| `clearFieldValue(document, fieldId)` | `ContractDocument` | Clears a field value |
| `getResolvedFieldValue(document, fieldId)` | `ContractFieldValue \| undefined` | Reads one field value, including shared values and defaults |
| `getResolvedValues(document)` | `FieldValueMap` | Reads all resolved field values |

`setFieldValue` and `clearFieldValue` throw for mirror fields and readonly fields. When a shared source field is set, `sharedValues` is updated instead of `fieldValues`.

```ts
document = createField(document, {
  id: 'partyNameSource',
  name: 'Party Name Source',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.15,
  width: 0.35,
  height: 0.05,
  sharedKey: 'partyName',
  sharedMode: 'source',
});

document = createField(document, {
  id: 'partyNameMirror',
  name: 'Party Name Mirror',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.25,
  width: 0.35,
  height: 0.05,
  sharedKey: 'partyName',
  sharedMode: 'mirror',
});

document = setFieldValue(document, 'partyNameSource', 'Pactum Inc.');

document.sharedValues;
// { partyName: 'Pactum Inc.' }

getResolvedFieldValue(document, 'partyNameMirror');
// 'Pactum Inc.'
```

## Validation

```ts
import { validateField, validateDocument } from '@pactum-labs/core';

const result = validateDocument(document);

if (!result.valid) {
  console.log(result.errors);
}
```

Return type:

```ts
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly FieldValidationError[];
}

interface FieldValidationError {
  readonly fieldId: string;
  readonly fieldName: string;
  readonly message: string;
  readonly code: ValidationErrorCode;
}

type ValidationErrorCode =
  | 'REQUIRED'
  | 'PATTERN_MISMATCH'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'MIN_VALUE'
  | 'MAX_VALUE'
  | 'INVALID_TYPE'
  | 'MIRROR_CANNOT_SET_VALUE'
  | 'SHARED_SOURCE_NOT_FOUND';
```

Failure example:

```ts
const result = validateDocument(document);

// {
//   valid: false,
//   errors: [
//     {
//       fieldId: 'employeeName',
//       fieldName: 'Employee Name',
//       message: 'This field is required.',
//       code: 'REQUIRED'
//     }
//   ]
// }
```

`FieldValidation` supports string and number rules.

```ts
type FieldValidation = {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  customMessage?: string;
};
```

## Date Formatting

Date fields use the native date input value, so the stored value is `yyyy-mm-dd`. `dateFormat` is applied in the viewer and during PDF export.

```ts
import { formatDateValue, isIsoDateString } from '@pactum-labs/core';

formatDateValue('2026-04-22', 'yyyy.mm.dd');
// '2026.04.22'

formatDateValue('2026-04-22', 'yy.M.d');
// '26.4.22'

isIsoDateString('2026-04-22');
// true
```

Supported tokens are `yyyy`, `yy`, `MM`/`mm`, `M`/`m`, `dd`, and `d`.

## PDF Export

```ts
import { exportToPdf } from '@pactum-labs/core';

const completedPdfBytes = await exportToPdf(document);

// completedPdfBytes: Uint8Array
```

PDF export loads `document.pdfData` as the source PDF and draws each field's resolved value on the matching page. Fields with `hidden: true` are not rendered into the exported PDF.

## React Viewer

```tsx
import { useState } from 'react';
import { ContractViewer } from '@pactum-labs/react';
import type { ContractDocument } from '@pactum-labs/core';

function ContractScreen({ initialDocument }: { initialDocument: ContractDocument }) {
  const [document, setDocument] = useState(initialDocument);

  return (
    <ContractViewer
      mode="fill"
      document={document}
      onDocumentChange={setDocument}
      pageWidth={900}
      viewportHeight="80vh"
    />
  );
}
```

### Viewer Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `'builder' \| 'fill' \| 'sign' \| 'readonly'` | Yes | Viewer interaction mode |
| `document` | `ContractDocument` | Yes | Document model to render |
| `onDocumentChange` | `(next: ContractDocument) => void` | Yes | Called when fields or values change |
| `pageWidth` | `number` | No | Base displayed page width. Default is `720` |
| `viewportHeight` | `number \| string` | No | Viewer height. Default is `'80vh'` |
| `pdfWorkerSrc` | `string` | No | pdf.js worker URL |
| `className` | `string` | No | Root class name |
| `style` | `CSSProperties` | No | Root inline style |

### Modes

| Mode | Behavior |
| --- | --- |
| `builder` | Drag-create, move, resize, and delete fields |
| `fill` | Fill normal fields such as text, date, checkbox, and number |
| `sign` | Fill normal fields and add signatures or stamps |
| `readonly` | Disable value input and field editing |

### Viewer Ref API

```tsx
import { useRef } from 'react';
import { ContractViewer, type ContractViewerHandle } from '@pactum-labs/react';

const viewerRef = useRef<ContractViewerHandle>(null);

viewerRef.current?.beginDragCreate('text', {
  placeholder: 'Enter employee name',
});

viewerRef.current?.beginDragCreate('date', {
  dateFormat: 'yyyy.mm.dd',
});

viewerRef.current?.cancelDragCreate();
```

```tsx
<ContractViewer
  ref={viewerRef}
  mode="builder"
  document={document}
  onDocumentChange={setDocument}
/>
```

External code can inject signature and stamp images.

```ts
viewerRef.current?.setSignatureImage('employeeSignature', {
  image: signaturePngBytes,
  mimeType: 'image/png',
});

viewerRef.current?.setStampImage('employeeSignature', {
  image: stampPngBytes,
  mimeType: 'image/png',
});

viewerRef.current?.setFieldImage('employeeSignature', {
  source: 'stamp',
  image: stampPngBytes,
  mimeType: 'image/png',
});
```

Image input types:

```ts
interface ContractViewerBinaryImageInput {
  readonly image: Uint8Array | ArrayBuffer;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

interface ContractViewerImageInput extends ContractViewerBinaryImageInput {
  readonly source?: 'draw' | 'stamp';
}
```

When `signatureMode` is `sign-only`, stamp injection is rejected. When it is `stamp-only`, draw injection is rejected.

## Complete Example

```tsx
import { useRef, useState } from 'react';
import {
  createDocument,
  createField,
  setFieldValue,
  validateDocument,
  exportToPdf,
  type ContractDocument,
} from '@pactum-labs/core';
import {
  ContractViewer,
  type ContractViewerHandle,
} from '@pactum-labs/react';

function createInitialDocument(pdfData: Uint8Array): ContractDocument {
  let document = createDocument({
    id: 'contract-001',
    title: 'Employment Contract',
    pdfData,
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
    y: 0.74,
    width: 0.35,
    height: 0.1,
    required: true,
  });

  return setFieldValue(document, 'employeeName', 'Ada Lovelace');
}

export function ContractApp({ pdfData }: { pdfData: Uint8Array }) {
  const [document, setDocument] = useState(() => createInitialDocument(pdfData));
  const viewerRef = useRef<ContractViewerHandle>(null);

  const onExport = async () => {
    const validation = validateDocument(document);
    if (!validation.valid) {
      console.log(validation.errors);
      return;
    }

    const pdfBytes = await exportToPdf(document);
    console.log(pdfBytes);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => viewerRef.current?.beginDragCreate('text')}
      >
        Add text field
      </button>
      <button type="button" onClick={onExport}>
        Export PDF
      </button>
      <ContractViewer
        ref={viewerRef}
        mode="sign"
        document={document}
        onDocumentChange={setDocument}
      />
    </>
  );
}
```
