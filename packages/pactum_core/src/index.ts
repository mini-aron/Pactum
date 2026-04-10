export type {
  ContractFieldType,
  SharedMode,
  BaseField,
  TextField,
  NameField,
  DateField,
  CheckboxField,
  SignatureField,
  StampField,
  EmailField,
  PhoneField,
  NumberField,
  TextareaField,
  RadioField,
  RadioOption,
  SelectField,
  SelectOption,
  ContractField,
} from './types/field';

export type {
  SignatureValue,
  StampValue,
  ContractFieldValue,
  FieldValueMap,
  SharedValueMap,
} from './types/value';

export { isSignatureValue, isStampValue, isPrimitiveValue } from './types/value';

export type {
  FieldValidation,
  FieldValidationError,
  ValidationErrorCode,
  ValidationResult,
} from './types/validation';

export type {
  NormalizedRect,
  PageInfo,
  ContractDocument,
  CreateDocumentInput,
} from './types/document';

export {
  normalizeRect,
  clampToPage,
  clampCoord,
  ensureMinSize,
  toAbsoluteRect,
  toNormalizedRect,
} from './coordinates';

export {
  validateField,
  validateDocument,
  validateSharedFieldGroup,
} from './validation';

export {
  getSourceField,
  getMirrorFields,
  resolveFieldValue,
  setSharedFieldValue,
  resolveAllSharedValues,
} from './shared';

export {
  createDocument,
  createField,
  updateField,
  removeField,
  moveField,
  resizeField,
  setFieldValue,
  getResolvedFieldValue,
  getResolvedValues,
} from './operations';

export { exportToPdf } from './export';
export type { ExportOptions } from './export';
