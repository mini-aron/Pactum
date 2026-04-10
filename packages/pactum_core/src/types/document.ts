import type { ContractField } from './field';
import type { FieldValueMap, SharedValueMap } from './value';

export interface NormalizedRect {
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PageInfo {
  readonly index: number;
  readonly width: number;
  readonly height: number;
}

export interface ContractDocument {
  readonly id: string;
  readonly title: string;
  readonly pdfData: Uint8Array;
  readonly pageCount: number;
  readonly pages: readonly PageInfo[];
  readonly fields: readonly ContractField[];
  readonly fieldValues: FieldValueMap;
  readonly sharedValues: SharedValueMap;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateDocumentInput {
  readonly id: string;
  readonly title: string;
  readonly pdfData: Uint8Array;
  readonly pageCount: number;
  readonly pages: readonly PageInfo[];
}
