import type { ContractField } from '../types/field';
import type {
  ContractFieldValue,
  FieldValueMap,
  SharedValueMap,
} from '../types/value';
import type { ContractDocument, CreateDocumentInput } from '../types/document';
import { normalizeRect } from '../coordinates';
import { resolveFieldValue, setSharedFieldValue } from '../shared';

const assertAtMostOneSourcePerSharedKey = (
  fields: readonly ContractField[]
): void => {
  const sourceIdByKey = new Map<string, string>();
  for (const f of fields) {
    if (!f.sharedKey || f.sharedMode !== 'source') continue;
    const prev = sourceIdByKey.get(f.sharedKey);
    if (prev !== undefined) {
      throw new Error(
        `Shared key "${f.sharedKey}" allows only one source field. (Conflict: "${prev}" vs "${f.id}")`
      );
    }
    sourceIdByKey.set(f.sharedKey, f.id);
  }
};

export const createDocument = (input: CreateDocumentInput): ContractDocument => ({
  ...input,
  fields: [],
  fieldValues: {},
  sharedValues: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createField = (
  document: ContractDocument,
  field: ContractField
): ContractDocument => {
  const normalized = normalizeRect(field, document.pageCount);
  const newField: ContractField = { ...field, ...normalized };

  const fields = [...document.fields, newField];
  assertAtMostOneSourcePerSharedKey(fields);

  return {
    ...document,
    fields,
    updatedAt: new Date().toISOString(),
  };
};

export const updateField = (
  document: ContractDocument,
  fieldId: string,
  patch: Partial<Omit<ContractField, 'id' | 'type'>>
): ContractDocument => {
  const fields = document.fields.map((f) => {
    if (f.id !== fieldId) return f;

    const merged = { ...f, ...patch };
    const normalized = normalizeRect(merged, document.pageCount);
    return { ...merged, ...normalized } as ContractField;
  });

  assertAtMostOneSourcePerSharedKey(fields);

  return {
    ...document,
    fields,
    updatedAt: new Date().toISOString(),
  };
};

export const removeField = (
  document: ContractDocument,
  fieldId: string
): ContractDocument => {
  const field = document.fields.find((f) => f.id === fieldId);

  const fields = document.fields.filter((f) => f.id !== fieldId);

  const fieldValues = Object.fromEntries(
    Object.entries(document.fieldValues).filter(([id]) => id !== fieldId)
  );

  let { sharedValues } = document;

  if (field?.sharedKey && field.sharedMode === 'source') {
    const hasOtherSource = fields.some(
      (f) => f.sharedKey === field.sharedKey && f.sharedMode === 'source'
    );
    if (!hasOtherSource) {
      sharedValues = Object.fromEntries(
        Object.entries(sharedValues).filter(([key]) => key !== field.sharedKey)
      );
    }
  }

  return {
    ...document,
    fields,
    fieldValues,
    sharedValues,
    updatedAt: new Date().toISOString(),
  };
};

export const moveField = (
  document: ContractDocument,
  fieldId: string,
  position: { page?: number; x: number; y: number }
): ContractDocument => {
  const { page, x, y } = position;
  return updateField(
    document,
    fieldId,
    page !== undefined ? { page, x, y } : { x, y }
  );
};

export const resizeField = (
  document: ContractDocument,
  fieldId: string,
  size: { width: number; height: number }
): ContractDocument =>
  updateField(document, fieldId, {
    width: size.width,
    height: size.height,
  });

export const setFieldValue = (
  document: ContractDocument,
  fieldId: string,
  value: ContractFieldValue
): ContractDocument => {
  const field = document.fields.find((f) => f.id === fieldId);

  if (!field) {
    throw new Error(`Field ID "${fieldId}" was not found.`);
  }

  if (field.sharedMode === 'mirror') {
    throw new Error(
      `Cannot set value on mirror field "${fieldId}". Set the value on the source field instead.`
    );
  }

  if (field.readonly) {
    throw new Error(`Cannot set value on read-only field "${fieldId}".`);
  }

  if (field.sharedKey && field.sharedMode === 'source') {
    const sharedValues = setSharedFieldValue(
      document.fields,
      document.sharedValues,
      field.sharedKey,
      value
    );
    return {
      ...document,
      sharedValues,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...document,
    fieldValues: { ...document.fieldValues, [fieldId]: value },
    updatedAt: new Date().toISOString(),
  };
};

export const getResolvedFieldValue = (
  document: ContractDocument,
  fieldId: string
): ContractFieldValue | undefined => {
  const field = document.fields.find((f) => f.id === fieldId);
  if (!field) return undefined;

  return resolveFieldValue(field, document.fieldValues, document.sharedValues);
};

export const getResolvedValues = (
  document: ContractDocument
): FieldValueMap => {
  const resolved: Record<string, ContractFieldValue> = {};

  for (const field of document.fields) {
    const value = resolveFieldValue(
      field,
      document.fieldValues,
      document.sharedValues
    );
    if (value !== undefined) {
      resolved[field.id] = value;
    }
  }

  return resolved;
};

export type { ContractDocument, FieldValueMap, SharedValueMap };
