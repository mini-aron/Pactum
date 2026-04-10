import { describe, expect, it } from 'vitest';
import {
  clampCoord,
  clampToPage,
  ensureMinSize,
  normalizeRect,
  toAbsoluteRect,
  toNormalizedRect,
} from '../src/coordinates';

describe('coordinates', () => {
  it('clampToPage clamps to valid page index', () => {
    expect(clampToPage(-1, 3)).toBe(0);
    expect(clampToPage(5, 3)).toBe(2);
    expect(clampToPage(1, 3)).toBe(1);
  });

  it('clampCoord keeps values in 0..1', () => {
    expect(clampCoord(-0.5)).toBe(0);
    expect(clampCoord(1.5)).toBe(1);
  });

  it('ensureMinSize enforces minimum', () => {
    expect(ensureMinSize(0.001)).toBe(0.005);
  });

  it('normalizeRect clamps page and coords for single page doc', () => {
    const r = normalizeRect({ page: 0, x: -0.1, y: 2, width: 0.001, height: 0.001 }, 1);
    expect(r.page).toBe(0);
    expect(r.x).toBe(0);
    expect(r.y).toBe(1);
    expect(r.width).toBeGreaterThanOrEqual(0.005);
    expect(r.height).toBeGreaterThanOrEqual(0.005);
  });

  it('normalizeRect fits width within page when x is large', () => {
    const r = normalizeRect({ page: 0, x: 0.95, y: 0, width: 0.2, height: 0.1 }, 1);
    expect(r.x + r.width).toBeLessThanOrEqual(1);
  });

  it('toAbsoluteRect and toNormalizedRect round-trip', () => {
    const n = { page: 0, x: 0.1, y: 0.2, width: 0.3, height: 0.05 };
    const abs = toAbsoluteRect(n, 600, 800);
    const back = toNormalizedRect(
      { page: 0, x: abs.x, y: abs.y, width: abs.width, height: abs.height },
      600,
      800
    );
    expect(back.x).toBeCloseTo(n.x, 10);
    expect(back.y).toBeCloseTo(n.y, 10);
    expect(back.width).toBeCloseTo(n.width, 10);
    expect(back.height).toBeCloseTo(n.height, 10);
  });
});
