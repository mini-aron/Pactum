/**
 * @pactum/pactum_core — Framework-agnostic electronic contract document engine.
 *
 * **Document & fields**
 * - Types: {@link ContractField}, {@link ContractFieldValue}, {@link ContractDocument}
 *
 * **Coordinates:** {@link normalizeRect}, {@link toAbsoluteRect}, {@link toNormalizedRect}, {@link clampToPage}, …
 *
 * **Shared fields:** {@link resolveFieldValue}, {@link setSharedFieldValue}, {@link getSourceField}, {@link getMirrorFields}, {@link resolveAllSharedValues}
 *
 * **Validation:** {@link validateField}, {@link validateDocument}, {@link validateSharedFieldGroup}
 *
 * **Immutable operations:** {@link createDocument}, {@link createField}, {@link updateField}, {@link removeField}, {@link moveField}, {@link resizeField}, {@link setFieldValue}, {@link clearFieldValue}, {@link getResolvedFieldValue}, {@link getResolvedValues}
 *
 * `getResolvedValues` builds a map of field id → resolved value in one pass (for UI or export).
 *
 * **Export:** {@link exportToPdf}
 */

export type {
  ContractFieldType,
  SharedMode,
  SignatureInputMode,
  BaseField,
  TextField,
  DateField,
  CheckboxField,
  SignatureField,
  EmailField,
  PhoneField,
  NumberField,
  TextareaField,
  ContractField,
} from './types/field';

export type {
  SignatureValue,
  ContractFieldValue,
  FieldValueMap,
  SharedValueMap,
} from './types/value';

export { isSignatureValue, isPrimitiveValue } from './types/value';

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
  clearFieldValue,
  getResolvedFieldValue,
  getResolvedValues,
} from './operations';

export { exportToPdf } from './export';
export type { ExportOptions } from './export';
