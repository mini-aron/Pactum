import type { ContractField, NumberField } from '../types/field';
import type {
  ContractFieldValue,
  FieldValueMap,
  SharedValueMap,
} from '../types/value';
import type {
  FieldValidationError,
  ValidationResult,
} from '../types/validation';
import type { ContractDocument } from '../types/document';
import { isSignatureValue, isStampValue } from '../types/value';
import { resolveFieldValue } from '../shared';

const makeError = (
  field: ContractField,
  message: string,
  code: FieldValidationError['code']
): FieldValidationError => ({
  fieldId: field.id,
  fieldName: field.name,
  message: field.validation?.customMessage ?? message,
  code,
});

const validateStringValue = (
  field: ContractField,
  value: string
): FieldValidationError[] => {
  const errors: FieldValidationError[] = [];
  const { validation } = field;
  if (!validation) return errors;

  if (validation.minLength !== undefined && value.length < validation.minLength) {
    errors.push(
      makeError(
        field,
        `Must be at least ${validation.minLength} characters.`,
        'MIN_LENGTH'
      )
    );
  }

  if (validation.maxLength !== undefined && value.length > validation.maxLength) {
    errors.push(
      makeError(
        field,
        `Must be at most ${validation.maxLength} characters.`,
        'MAX_LENGTH'
      )
    );
  }

  if (validation.pattern !== undefined) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      errors.push(makeError(field, 'The value does not match the required format.', 'PATTERN_MISMATCH'));
    }
  }

  return errors;
};

const validateNumberValue = (
  field: ContractField,
  value: number
): FieldValidationError[] => {
  const errors: FieldValidationError[] = [];
  const numField = field as NumberField;

  if (numField.min !== undefined && value < numField.min) {
    errors.push(
      makeError(field, `Minimum value is ${numField.min}.`, 'MIN_VALUE')
    );
  }

  if (numField.max !== undefined && value > numField.max) {
    errors.push(
      makeError(field, `Maximum value is ${numField.max}.`, 'MAX_VALUE')
    );
  }

  return errors;
};

export const validateField = (
  field: ContractField,
  value: ContractFieldValue | undefined
): ValidationResult => {
  if (field.sharedMode === 'mirror') {
    return { valid: true, errors: [] };
  }

  const errors: FieldValidationError[] = [];

  const isEmpty =
    value === undefined ||
    value === '' ||
    value === null ||
    (typeof value === 'boolean' && !value && field.type !== 'checkbox');

  if (field.required && isEmpty) {
    errors.push(makeError(field, 'This field is required.', 'REQUIRED'));
    return { valid: false, errors };
  }

  if (value === undefined || value === '') {
    return { valid: true, errors: [] };
  }

  if (typeof value === 'string') {
    errors.push(...validateStringValue(field, value));
  } else if (typeof value === 'number') {
    errors.push(...validateNumberValue(field, value));
  } else if (isSignatureValue(value) || isStampValue(value)) {
    if (!(value.image instanceof Uint8Array) || value.image.length === 0) {
      errors.push(makeError(field, 'Image data is invalid.', 'INVALID_TYPE'));
    }
  }

  return { valid: errors.length === 0, errors };
};

export const validateSharedFieldGroup = (
  fields: readonly ContractField[],
  fieldValues: FieldValueMap,
  sharedValues: SharedValueMap,
  sharedKey: string
): ValidationResult => {
  const groupFields = fields.filter((f) => f.sharedKey === sharedKey);
  const sourceField = groupFields.find((f) => f.sharedMode === 'source');

  if (!sourceField) {
    return {
      valid: false,
      errors: [
        {
          fieldId: sharedKey,
          fieldName: sharedKey,
          message: `No source field found for shared key "${sharedKey}".`,
          code: 'SHARED_SOURCE_NOT_FOUND',
        },
      ],
    };
  }

  const value = resolveFieldValue(sourceField, fieldValues, sharedValues);
  return validateField(sourceField, value);
};

export const validateDocument = (
  document: ContractDocument
): ValidationResult => {
  const { fields, fieldValues, sharedValues } = document;

  const processedSharedKeys = new Set<string>();
  const allErrors: FieldValidationError[] = [];

  for (const field of fields) {
    if (field.sharedMode === 'mirror') continue;

    if (field.sharedKey) {
      if (processedSharedKeys.has(field.sharedKey)) continue;
      processedSharedKeys.add(field.sharedKey);

      const result = validateSharedFieldGroup(
        fields,
        fieldValues,
        sharedValues,
        field.sharedKey
      );
      allErrors.push(...result.errors);
    } else {
      const value = fieldValues[field.id];
      const result = validateField(field, value);
      allErrors.push(...result.errors);
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors };
};
