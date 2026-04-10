export interface SignatureValue {
  readonly type: 'signature';
  readonly image: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface StampValue {
  readonly type: 'stamp';
  readonly image: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export type ContractFieldValue =
  | string
  | number
  | boolean
  | SignatureValue
  | StampValue;

export type FieldValueMap = Record<string, ContractFieldValue>;

export type SharedValueMap = Record<string, ContractFieldValue>;

export const isSignatureValue = (v: ContractFieldValue): v is SignatureValue =>
  typeof v === 'object' && 'type' in v && v.type === 'signature';

export const isStampValue = (v: ContractFieldValue): v is StampValue =>
  typeof v === 'object' && 'type' in v && v.type === 'stamp';

export const isPrimitiveValue = (
  v: ContractFieldValue
): v is string | number | boolean => typeof v !== 'object';
