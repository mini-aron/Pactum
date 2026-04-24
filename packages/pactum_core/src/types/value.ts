export interface SignatureValue {
  readonly type: 'signature';
  readonly source?: 'draw' | 'stamp';
  readonly image: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export type ContractFieldValue =
  | string
  | number
  | boolean
  | SignatureValue;

export type FieldValueMap = Record<string, ContractFieldValue>;

export type SharedValueMap = Record<string, ContractFieldValue>;

export const isSignatureValue = (v: ContractFieldValue): v is SignatureValue =>
  typeof v === 'object' && 'type' in v && v.type === 'signature';

export const isPrimitiveValue = (
  v: ContractFieldValue
): v is string | number | boolean => typeof v !== 'object';

export const ALLOWED_SIGNATURE_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

export const normalizeSignatureImageMimeType = (
  mimeType: string | undefined
): string | undefined => {
  const normalized = mimeType?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (!ALLOWED_SIGNATURE_IMAGE_MIME_TYPES.has(normalized)) return undefined;
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
};

export const detectSignatureImageMimeType = (
  image: Uint8Array
): string | undefined => {
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
};

export const getNormalizedSignatureImageMimeType = (
  value: SignatureValue
): string | undefined => {
  const detected = detectSignatureImageMimeType(value.image);
  const normalized = normalizeSignatureImageMimeType(value.mimeType);

  if (normalized && detected && normalized !== detected) {
    return undefined;
  }

  return normalized ?? detected;
};
