import type { ContractField } from '../types/field';
import type {
  ContractFieldValue,
  FieldValueMap,
  SharedValueMap,
} from '../types/value';

export const getSourceField = (
  fields: readonly ContractField[],
  sharedKey: string
): ContractField | undefined =>
  fields.find((f) => f.sharedKey === sharedKey && f.sharedMode === 'source');

export const getMirrorFields = (
  fields: readonly ContractField[],
  sharedKey: string
): readonly ContractField[] =>
  fields.filter((f) => f.sharedKey === sharedKey && f.sharedMode === 'mirror');

export const resolveFieldValue = (
  field: ContractField,
  fieldValues: FieldValueMap,
  sharedValues: SharedValueMap
): ContractFieldValue | undefined => {
  if (field.sharedKey) {
    const sharedValue = sharedValues[field.sharedKey];
    if (sharedValue !== undefined) return sharedValue;
  }

  const directValue = fieldValues[field.id];
  if (directValue !== undefined) return directValue;

  return field.defaultValue as ContractFieldValue | undefined;
};

export const setSharedFieldValue = (
  fields: readonly ContractField[],
  sharedValues: SharedValueMap,
  sharedKey: string,
  value: ContractFieldValue
): SharedValueMap => {
  const sourceExists = fields.some(
    (f) => f.sharedKey === sharedKey && f.sharedMode === 'source'
  );

  if (!sourceExists) {
    throw new Error(
      `공유 키 "${sharedKey}"에 source 필드가 없어 값을 설정할 수 없습니다.`
    );
  }

  return { ...sharedValues, [sharedKey]: value };
};

export const resolveAllSharedValues = (
  fields: readonly ContractField[],
  fieldValues: FieldValueMap,
  sharedValues: SharedValueMap
): FieldValueMap => {
  const resolved: Record<string, ContractFieldValue> = { ...fieldValues };

  for (const field of fields) {
    const value = resolveFieldValue(field, fieldValues, sharedValues);
    if (value !== undefined) {
      resolved[field.id] = value;
    }
  }

  return resolved;
};
