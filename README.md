# Pactum

Pactum is an open-source contract toolkit for building document workflows.
It ships as a monorepo with a framework-agnostic core and a React viewer.

## Table of Contents

- [Documentation](#documentation)
- [Packages](#packages)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Workspace Commands](#workspace-commands)
- [Quick Start](#quick-start)
- [Viewer Behavior](#viewer-behavior)
- [Development](#development)
- [Open Source Policy](#open-source-policy)

## Documentation

| Language | Usage guide |
| --- | --- |
| English | [`docs/en/USAGE.md`](docs/en/USAGE.md) |
| Korean | [`docs/ko/USAGE.md`](docs/ko/USAGE.md) |

For the full documentation index, see [`docs/README.md`](docs/README.md).

## Packages

- `@pactum/pactum_core`  
  Contract model, field operations, shared-value rules, validation, and export utilities.
- `@pactum/pactum_react`  
  Canvas-based contract viewer with interactive overlays, zoom controls, and pan support.

## Features

- Immutable contract and field operations
- Shared-field source/mirror behavior
- Canvas-based page rendering for stable overlay alignment
- Image-page first document input, with PDF compatibility path
- Builder/fill/sign/readonly viewer modes
- Unified signature field with selectable input policy (`all`, `sign-only`, `stamp-only`)
- External image injection API for signature/stamp automation
- TypeScript-first API

## Requirements

- Node.js `>=18`
- PNPM `>=9`

## Installation

```bash
pnpm install
```

## Workspace Commands

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm clean
```

## Quick Start

For detailed library usage, return examples, field types, validation output, and React viewer APIs, see the English guide at [`docs/en/USAGE.md`](docs/en/USAGE.md) or the Korean guide at [`docs/ko/USAGE.md`](docs/ko/USAGE.md).

### 1) Build a document with core

```ts
import { createDocument, createField } from '@pactum/pactum_core';

const document = createDocument({
  id: 'doc-1',
  title: 'Employment Contract',
  pdfData: new Uint8Array(), // optional compatibility source
  pageCount: 1,
  pages: [{ index: 0, width: 612, height: 792 }],
  pageImages: [new Uint8Array()], // preferred source (one page image per item)
});

const next = createField(document, {
  id: 'employeeName',
  name: 'Employee Name',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.2,
  width: 0.35,
  height: 0.05,
  placeholder: 'Enter employee name',
  required: true,
  textSize: 12,
  borderRadius: 4,
});

const withStartDate = createField(next, {
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
```

### 2) Render in React

```tsx
import { ContractViewer } from '@pactum/pactum_react';
import type { ContractDocument } from '@pactum/pactum_core';

function Viewer({
  doc,
  onChange,
}: {
  doc: ContractDocument;
  onChange: (next: ContractDocument) => void;
}) {
  return (
    <ContractViewer
      mode="builder"
      document={doc}
      onDocumentChange={onChange}
      pageWidth={900}
      viewportHeight="80vh"
    />
  );
}
```

### 3) Signature field mode and external image injection

```ts
import { createField } from '@pactum/pactum_core';
import type {
  ContractViewerHandle,
  ContractViewerBinaryImageInput,
} from '@pactum/pactum_react';
import { useRef } from 'react';

const withSignature = createField(next, {
  id: 'employeeSignature',
  name: 'Employee Signature',
  type: 'signature',
  signatureMode: 'all', // 'all' | 'sign-only' | 'stamp-only'
  page: 0,
  x: 0.1,
  y: 0.75,
  width: 0.35,
  height: 0.12,
});

const viewerRef = useRef<ContractViewerHandle>(null);

const sharedStampImage: ContractViewerBinaryImageInput = {
  image: new Uint8Array(), // your service-managed image bytes
  mimeType: 'image/png',
};

viewerRef.current?.setStampImage('employeeSignature', sharedStampImage);
// or
viewerRef.current?.setSignatureImage('employeeSignature', sharedStampImage);
```

Attach the ref to the viewer when rendering:

```tsx
<ContractViewer ref={viewerRef} mode="sign" document={doc} onDocumentChange={onChange} />
```

For builder drag-create flows, pass an optional placeholder when starting field creation. Omit it or pass an empty value to create the field without a placeholder:

```ts
viewerRef.current?.beginDragCreate('text', {
  placeholder: 'Enter employee name',
});

viewerRef.current?.beginDragCreate('date', {
  dateFormat: 'yyyy.mm.dd',
});
```

Date fields use the native date picker and store the selected value as `yyyy-mm-dd`. When `dateFormat` is set, the viewer and PDF export render the selected date in that format. Supported date tokens are `yyyy`, `yy`, `mm`/`MM`, and `dd`.

When `signatureMode` is set, UI input and external API writes are both constrained:
- `sign-only`: drawing only
- `stamp-only`: image upload/injection only
- `all`: both drawing and image upload/injection

## Viewer Behavior

- Zoom by top controls (`-`, reset `%`, `+`)
- Drag to pan when content is scrollable
- Scroll inside the viewer viewport (container does not expand to full document height)
- Fields stay aligned to page coordinates
- Field text scales with zoom

## Development

### Start Storybook

```bash
cd packages/pactum_react
pnpm storybook
```

### Build for local consumers

```bash
pnpm build
```

## Open Source Policy

- License: MIT (`LICENSE`)
- Contributions: see `docs/CONTRIBUTING.md`
- Code of Conduct: see `docs/CODE_OF_CONDUCT.md`
- Security reporting: see `docs/SECURITY.md`
- Release notes: see `docs/CHANGELOG.md`

