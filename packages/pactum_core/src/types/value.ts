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
