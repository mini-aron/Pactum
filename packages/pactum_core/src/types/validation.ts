export interface FieldValidation {
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly customMessage?: string;
}

export interface FieldValidationError {
  readonly fieldId: string;
  readonly fieldName: string;
  readonly message: string;
  readonly code: ValidationErrorCode;
}

export type ValidationErrorCode =
  | 'REQUIRED'
  | 'PATTERN_MISMATCH'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'MIN_VALUE'
  | 'MAX_VALUE'
  | 'INVALID_TYPE'
  | 'MIRROR_CANNOT_SET_VALUE'
  | 'SHARED_SOURCE_NOT_FOUND';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly FieldValidationError[];
}
