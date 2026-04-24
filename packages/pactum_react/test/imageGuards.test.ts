import { describe, expect, it } from 'vitest';
import {
  MAX_SIGNATURE_IMAGE_BYTES,
  toValidatedSignatureImage,
} from '../src/imageGuards';

describe('toValidatedSignatureImage', () => {
  it('accepts supported image inputs', () => {
    const result = toValidatedSignatureImage({
      image: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      source: 'stamp',
    });

    expect(result.image).toBeInstanceOf(Uint8Array);
    expect(result.mimeType).toBe('image/png');
  });

  it('rejects oversized images', () => {
    expect(() =>
      toValidatedSignatureImage({
        image: new Uint8Array(MAX_SIGNATURE_IMAGE_BYTES + 1),
        mimeType: 'image/png',
      })
    ).toThrow(/limit/i);
  });

  it('rejects unsupported mime types', () => {
    expect(() =>
      toValidatedSignatureImage({
        image: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        mimeType: 'image/gif',
      })
    ).toThrow(/png and jpeg/i);
  });

  it('rejects mime types that do not match the image bytes', () => {
    expect(() =>
      toValidatedSignatureImage({
        image: Uint8Array.from([0xff, 0xd8, 0xff, 0xdb]),
        mimeType: 'image/png',
      })
    ).toThrow(/does not match/i);
  });

  it('rejects unsupported image bytes even without mime type', () => {
    expect(() =>
      toValidatedSignatureImage({
        image: Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      })
    ).toThrow(/png and jpeg/i);
  });
});
