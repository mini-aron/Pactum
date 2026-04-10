import type { FieldValidation } from './validation';

export type ContractFieldType =
  | 'text'
  | 'date'
  | 'checkbox'
  | 'signature'
  | 'stamp'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea';

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
  readonly textSize?: number;
  readonly borderRadius?: number;
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

export type ContractField =
  | TextField
  | DateField
  | CheckboxField
  | SignatureField
  | StampField
  | EmailField
  | PhoneField
  | NumberField
  | TextareaField;
