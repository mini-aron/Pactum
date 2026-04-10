import type { NormalizedRect } from '../types';

const MIN_SIZE = 0.005;
const COORD_MIN = 0;
const COORD_MAX = 1;

export const clampToPage = (value: number, pageCount: number): number =>
  Math.max(0, Math.min(pageCount - 1, Math.floor(value)));

export const clampCoord = (value: number): number =>
  Math.max(COORD_MIN, Math.min(COORD_MAX, value));

export const ensureMinSize = (size: number): number =>
  Math.max(MIN_SIZE, size);

export const normalizeRect = (
  rect: NormalizedRect,
  pageCount: number
): NormalizedRect => {
  const page = clampToPage(rect.page, pageCount);

  const x = clampCoord(rect.x);
  const y = clampCoord(rect.y);
  const width = ensureMinSize(rect.width);
  const height = ensureMinSize(rect.height);

  const clampedWidth = Math.min(width, COORD_MAX - x);
  const clampedHeight = Math.min(height, COORD_MAX - y);

  return {
    page,
    x,
    y,
    width: ensureMinSize(clampedWidth),
    height: ensureMinSize(clampedHeight),
  };
};

export const toAbsoluteRect = (
  rect: NormalizedRect,
  pageWidth: number,
  pageHeight: number
): { x: number; y: number; width: number; height: number } => ({
  x: rect.x * pageWidth,
  y: rect.y * pageHeight,
  width: rect.width * pageWidth,
  height: rect.height * pageHeight,
});

export const toNormalizedRect = (
  abs: { page: number; x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number
): NormalizedRect => ({
  page: abs.page,
  x: abs.x / pageWidth,
  y: abs.y / pageHeight,
  width: abs.width / pageWidth,
  height: abs.height / pageHeight,
});
