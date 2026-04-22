import {
  createDocument,
  createField,
  type ContractDocument,
} from '@pactum-labs/core';
import { PDFDocument } from 'pdf-lib';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import type { ContractViewerProps } from '../src/ContractViewer';
import { ContractViewer } from '../src/ContractViewer';

async function emptyDoc(): Promise<ContractDocument> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const pdfData = await pdf.save();
  return createDocument({
    id: 'story-doc',
    title: 'Story',
    pdfData,
    pageCount: 1,
    pages: [{ index: 0, width: 612, height: 792 }],
  });
}

async function imageBackedDoc(): Promise<ContractDocument> {
  const base = await emptyDoc();
  const canvas = document.createElement('canvas');
  canvas.width = 612;
  canvas.height = 792;
  const ctx = canvas.getContext('2d');
  if (!ctx) return base;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Canvas-backed contract page', 36, 64);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  for (let y = 100; y < canvas.height; y += 44) {
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(canvas.width - 28, y);
    ctx.stroke();
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) return base;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    ...base,
    pageImages: [bytes],
  };
}

function ViewerHarness(props: Omit<ContractViewerProps, 'onDocumentChange'>) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  useEffect(() => {
    void emptyDoc().then((d) => {
      let next = createField(d, {
        id: 'name',
        name: 'Name',
        type: 'text',
        page: 0,
        x: 0.1,
        y: 0.2,
        width: 0.35,
        height: 0.05,
        label: 'Name',
      });
      next = createField(next, {
        id: 'name2',
        name: 'Name (mirror)',
        type: 'text',
        page: 0,
        x: 0.1,
        y: 0.35,
        width: 0.35,
        height: 0.05,
        sharedKey: 'partyName',
        sharedMode: 'mirror',
      });
      next = createField(next, {
        id: 'party',
        name: 'Name (source)',
        type: 'text',
        page: 0,
        x: 0.1,
        y: 0.28,
        width: 0.35,
        height: 0.05,
        sharedKey: 'partyName',
        sharedMode: 'source',
      });
      setDoc(next);
    });
  }, []);

  if (!doc) return <div>Loading…</div>;

  return (
    <ContractViewer
      {...props}
      document={doc}
      onDocumentChange={setDoc}
    />
  );
}

function ImageViewerHarness(props: Omit<ContractViewerProps, 'onDocumentChange'>) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  useEffect(() => {
    void imageBackedDoc().then((d) => {
      let next = createField(d, {
        id: 'name',
        name: 'Name',
        type: 'text',
        page: 0,
        x: 0.1,
        y: 0.2,
        width: 0.35,
        height: 0.05,
        label: 'Name',
      });
      next = createField(next, {
        id: 'name2',
        name: 'Name (mirror)',
        type: 'text',
        page: 0,
        x: 0.1,
        y: 0.35,
        width: 0.35,
        height: 0.05,
        sharedKey: 'partyName',
        sharedMode: 'mirror',
      });
      next = createField(next, {
        id: 'party',
        name: 'Name (source)',
        type: 'text',
        page: 0,
        x: 0.1,
        y: 0.28,
        width: 0.35,
        height: 0.05,
        sharedKey: 'partyName',
        sharedMode: 'source',
      });
      setDoc(next);
    });
  }, []);

  if (!doc) return <div>Loading…</div>;

  return (
    <ContractViewer
      {...props}
      document={doc}
      onDocumentChange={setDoc}
    />
  );
}

const meta = {
  title: 'ContractViewer',
  component: ContractViewer,
  render: (args) => <ViewerHarness {...args} />,
} satisfies Meta<typeof ContractViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Fill: Story = {
  args: {
    mode: 'fill',
  },
};

export const Builder: Story = {
  args: {
    mode: 'builder',
  },
};

export const Readonly: Story = {
  args: {
    mode: 'readonly',
  },
};

export const ImagePages: Story = {
  args: {
    mode: 'fill',
  },
  render: (args) => <ImageViewerHarness {...args} />,
};
