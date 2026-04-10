import type { FieldValidation } from './validation';

export type ContractFieldType =
  | 'text'
  | 'name'
  | 'date'
  | 'checkbox'
  | 'signature'
  | 'stamp'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea'
  | 'radio'
  | 'select';

export type SharedMode = 'source' | 'mirror';

export interface BaseField {
  readonly id: string;
  readonly name: string;
  readonly type: ContractFieldType;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly readonly?: boolean;
  readonly hidden?: boolean;
  readonly defaultValue?: unknown;
  readonly validation?: FieldValidation;
  readonly sharedKey?: string;
  readonly sharedMode?: SharedMode;
}

export interface TextField extends BaseField {
  readonly type: 'text';
  readonly maxLength?: number;
}

export interface NameField extends BaseField {
  readonly type: 'name';
}

export interface DateField extends BaseField {
  readonly type: 'date';
  readonly dateFormat?: string;
}

export interface CheckboxField extends BaseField {
  readonly type: 'checkbox';
}

export interface SignatureField extends BaseField {
  readonly type: 'signature';
}

export interface StampField extends BaseField {
  readonly type: 'stamp';
}

export interface EmailField extends BaseField {
  readonly type: 'email';
}

export interface PhoneField extends BaseField {
  readonly type: 'phone';
}

export interface NumberField extends BaseField {
  readonly type: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface TextareaField extends BaseField {
  readonly type: 'textarea';
  readonly maxLength?: number;
  readonly rows?: number;
}

export interface RadioField extends BaseField {
  readonly type: 'radio';
  readonly options: readonly RadioOption[];
  readonly groupKey?: string;
}

export interface RadioOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectField extends BaseField {
  readonly type: 'select';
  readonly options: readonly SelectOption[];
  readonly multiple?: boolean;
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export type ContractField =
  | TextField
  | NameField
  | DateField
  | CheckboxField
  | SignatureField
  | StampField
  | EmailField
  | PhoneField
  | NumberField
  | TextareaField
  | RadioField
  | SelectField;
