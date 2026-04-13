/**
 * @pactum/pactum_react — React UI for contract page rendering and field overlays.
 * Document rules and value resolution use `@pactum/pactum_core`.
 *
 * Canvas pages are the primary render path. PDF input is still supported through
 * internal page conversion.
 */

export type { ContractMode } from './ContractMode';

export { configurePdfWorker } from './configurePdfWorker';

export type {
  ContractViewerProps,
  ContractViewerHandle,
  ContractViewerImageInput,
  ContractViewerBinaryImageInput,
} from './ContractViewer';
export { ContractViewer } from './ContractViewer';

export type { ContractCanvasPagesProps } from './ContractCanvasPages';
export { ContractCanvasPages } from './ContractCanvasPages';

export type { ContractPdfPagesProps, PdfFileSource } from './ContractPdfPages';
export { ContractPdfPages } from './ContractPdfPages';

export type { RenderedPage } from './pageSource';
export { loadRenderedPages } from './pageSource';

export type { FieldBoxProps } from './FieldBox';
export { FieldBox } from './FieldBox';
