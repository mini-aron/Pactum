import type { ContractViewerImageInput } from './ContractViewer';

export const MAX_SIGNATURE_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_SIGNATURE_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

function detectSignatureImageMimeType(image: Uint8Array): string | undefined {
  if (
    image.length >= 8 &&
    image[0] === 0x89 &&
    image[1] === 0x50 &&
    image[2] === 0x4e &&
    image[3] === 0x47 &&
    image[4] === 0x0d &&
    image[5] === 0x0a &&
    image[6] === 0x1a &&
    image[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    image.length >= 3 &&
    image[0] === 0xff &&
    image[1] === 0xd8 &&
    image[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  return undefined;
}

function normalizeMimeType(mimeType: string | undefined): string | undefined {
  const trimmed = mimeType?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

export function validateSignatureImageMimeType(
  mimeType: string | undefined
): string | undefined {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) return undefined;

  if (!ALLOWED_SIGNATURE_IMAGE_MIME_TYPES.has(normalized)) {
    throw new Error('Only PNG and JPEG images are allowed.');
  }

  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

export function toValidatedSignatureImage(
  input: ContractViewerImageInput
): ContractViewerImageInput & { readonly image: Uint8Array } {
  const image =
    input.image instanceof Uint8Array
      ? Uint8Array.from(input.image)
      : new Uint8Array(input.image.slice(0));

  if (image.length === 0) {
    throw new Error('Image data is empty.');
  }

  if (image.length > MAX_SIGNATURE_IMAGE_BYTES) {
    throw new Error(
      `Image data exceeds the ${Math.floor(MAX_SIGNATURE_IMAGE_BYTES / (1024 * 1024))} MB limit.`
    );
  }

  const mimeType = validateSignatureImageMimeType(input.mimeType);
  const detectedMimeType = detectSignatureImageMimeType(image);

  if (mimeType && detectedMimeType && mimeType !== detectedMimeType) {
    throw new Error('Image MIME type does not match the image data.');
  }

  const normalizedMimeType = mimeType ?? detectedMimeType;

  if (!normalizedMimeType) {
    throw new Error('Only PNG and JPEG images are allowed.');
  }

  if (
    input.width !== undefined &&
    (!Number.isFinite(input.width) || input.width <= 0)
  ) {
    throw new Error('Image width must be a positive finite number.');
  }

  if (
    input.height !== undefined &&
    (!Number.isFinite(input.height) || input.height <= 0)
  ) {
    throw new Error('Image height must be a positive finite number.');
  }

  return {
    ...input,
    image,
    mimeType: normalizedMimeType,
  };
}
