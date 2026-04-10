# Pactum

Pactum is an open-source contract toolkit for building document workflows.
It ships as a monorepo with a framework-agnostic core and a React viewer.

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
  required: true,
  textSize: 12,
  borderRadius: 4,
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

