# Pactum 라이브러리 사용법

이 문서는 `@pactum/pactum_core`와 `@pactum/pactum_react`의 기본 사용법, 주요 반환 형태, 필드 타입, 검증 결과, React viewer 연동 방식을 빠르게 확인하기 위한 한국어 가이드입니다.

## 패키지

| 패키지 | 용도 |
| --- | --- |
| `@pactum/pactum_core` | 문서 모델 생성, 필드 추가/수정/삭제, 값 저장, 공유 필드 처리, 검증, PDF export |
| `@pactum/pactum_react` | React 기반 계약서 뷰어, 필드 오버레이, builder/fill/sign/readonly 모드, 서명/도장 UI |

## 설치

```bash
pnpm add @pactum/pactum_core @pactum/pactum_react
```

React 패키지는 `react`와 `react-dom`을 peer dependency로 사용합니다.

## Core 빠른 시작

`createDocument`는 빈 계약 문서 모델을 만들고, 이후 모든 operation은 기존 객체를 직접 변경하지 않고 새 `ContractDocument`를 반환합니다.

```ts
import {
  createDocument,
  createField,
  setFieldValue,
  validateDocument,
  getResolvedValues,
  type ContractDocument,
} from '@pactum/pactum_core';

let document: ContractDocument = createDocument({
  id: 'contract-001',
  title: 'Employment Contract',
  pdfData: pdfBytes,
  pageImages: [pageImageBytes],
  pageCount: 1,
  pages: [{ index: 0, width: 612, height: 792 }],
});

document = createField(document, {
  id: 'employeeName',
  name: 'Employee Name',
  label: 'Employee',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.2,
  width: 0.35,
  height: 0.05,
  placeholder: 'Enter employee name',
  required: true,
  validation: {
    minLength: 2,
    maxLength: 40,
  },
});

document = createField(document, {
  id: 'startDate',
  name: 'Start Date',
  type: 'date',
  dateFormat: 'yyyy.mm.dd',
  page: 0,
  x: 0.1,
  y: 0.28,
  width: 0.25,
  height: 0.05,
});

document = setFieldValue(document, 'employeeName', 'Ada Lovelace');
document = setFieldValue(document, 'startDate', '2026-04-22');

const validation = validateDocument(document);
const values = getResolvedValues(document);
```

### 반환 예시

```ts
validation;
// {
//   valid: true,
//   errors: []
// }

values;
// {
//   employeeName: 'Ada Lovelace',
//   startDate: '2026-04-22'
// }

document;
// {
//   id: 'contract-001',
//   title: 'Employment Contract',
//   pdfData: Uint8Array,
//   pageImages: [Uint8Array],
//   pageCount: 1,
//   pages: [{ index: 0, width: 612, height: 792 }],
//   fields: [
//     {
//       id: 'employeeName',
//       name: 'Employee Name',
//       label: 'Employee',
//       type: 'text',
//       page: 0,
//       x: 0.1,
//       y: 0.2,
//       width: 0.35,
//       height: 0.05,
//       placeholder: 'Enter employee name',
//       required: true,
//       validation: { minLength: 2, maxLength: 40 }
//     },
//     {
//       id: 'startDate',
//       name: 'Start Date',
//       type: 'date',
//       dateFormat: 'yyyy.mm.dd',
//       page: 0,
//       x: 0.1,
//       y: 0.28,
//       width: 0.25,
//       height: 0.05
//     }
//   ],
//   fieldValues: {
//     employeeName: 'Ada Lovelace',
//     startDate: '2026-04-22'
//   },
//   sharedValues: {},
//   createdAt: '2026-04-22T...',
//   updatedAt: '2026-04-22T...'
// }
```

## 문서 구조

```ts
interface ContractDocument {
  readonly id: string;
  readonly title: string;
  readonly pdfData: Uint8Array;
  readonly pageImages?: readonly Uint8Array[];
  readonly pageCount: number;
  readonly pages: readonly PageInfo[];
  readonly fields: readonly ContractField[];
  readonly fieldValues: FieldValueMap;
  readonly sharedValues: SharedValueMap;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface PageInfo {
  readonly index: number;
  readonly width: number;
  readonly height: number;
}
```

`pageImages`가 있으면 React viewer는 이미지 페이지를 우선 렌더링합니다. `pdfData`는 PDF export와 PDF 렌더링 경로에서 사용되므로 문서 생성 시 항상 전달해야 합니다.

## 좌표 체계

필드 위치는 페이지 크기와 무관한 normalized coordinate입니다.

| 필드 | 타입 | 의미 |
| --- | --- | --- |
| `page` | `number` | 0부터 시작하는 페이지 인덱스 |
| `x` | `number` | 페이지 왼쪽 기준 위치, `0`에서 `1` 사이 |
| `y` | `number` | 페이지 위쪽 기준 위치, `0`에서 `1` 사이 |
| `width` | `number` | 페이지 너비 대비 비율 |
| `height` | `number` | 페이지 높이 대비 비율 |

예를 들어 `x: 0.1`, `width: 0.35`는 페이지 왼쪽 10% 지점에서 시작해 페이지 너비의 35%를 차지한다는 뜻입니다. `createField`, `updateField`, `moveField`, `resizeField`는 좌표를 페이지 범위 안으로 보정합니다.

```ts
import { toAbsoluteRect, toNormalizedRect } from '@pactum/pactum_core';

const abs = toAbsoluteRect(
  { page: 0, x: 0.1, y: 0.2, width: 0.35, height: 0.05 },
  612,
  792
);

// { x: 61.2, y: 158.4, width: 214.2, height: 39.6 }

const normalized = toNormalizedRect(
  { page: 0, x: 61.2, y: 158.4, width: 214.2, height: 39.6 },
  612,
  792
);

// { page: 0, x: 0.1, y: 0.2, width: 0.35, height: 0.05 }
```

## 필드 타입

공통 필드는 모든 `ContractField`가 갖는 기본 속성입니다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | Yes | 필드 고유 ID |
| `name` | `string` | Yes | 내부/접근성 이름 |
| `type` | `ContractFieldType` | Yes | 필드 타입 |
| `page` | `number` | Yes | 0-based 페이지 번호 |
| `x` | `number` | Yes | normalized x |
| `y` | `number` | Yes | normalized y |
| `width` | `number` | Yes | normalized width |
| `height` | `number` | Yes | normalized height |
| `label` | `string` | No | viewer에서 표시할 라벨. 없으면 `name` 사용 |
| `textSize` | `number` | No | 표시/입력 텍스트 크기 |
| `borderRadius` | `number` | No | viewer field box radius |
| `required` | `boolean` | No | 필수 입력 여부 |
| `placeholder` | `string` | No | 입력 placeholder |
| `readonly` | `boolean` | No | 값 변경 금지 |
| `hidden` | `boolean` | No | PDF export 시 렌더링 제외 |
| `defaultValue` | `unknown` | No | 직접 값이 없을 때 사용할 기본값 |
| `validation` | `FieldValidation` | No | 검증 규칙 |
| `sharedKey` | `string` | No | 공유 필드 그룹 키 |
| `sharedMode` | `'source' \| 'mirror'` | No | 공유 필드 원본/미러 구분 |

타입별 추가 필드는 다음과 같습니다.

| 타입 | 값 타입 | 추가 필드 | 참고 |
| --- | --- | --- | --- |
| `text` | `string` | `maxLength?: number` | 단일 행 텍스트 |
| `textarea` | `string` | `maxLength?: number`, `rows?: number` | 여러 행 텍스트 |
| `date` | `string` | `dateFormat?: string` | 값은 `yyyy-mm-dd`로 저장, 렌더링/export 시 포맷 적용 |
| `checkbox` | `boolean` | 없음 | `true`일 때 체크 표시 |
| `signature` | `SignatureValue` | `signatureMode?: 'all' \| 'sign-only' \| 'stamp-only'` | 직접 서명 또는 도장 이미지 |
| `email` | `string` | 없음 | viewer input type은 `email` |
| `phone` | `string` | 없음 | viewer input type은 `tel` |
| `number` | `number` | `min?: number`, `max?: number`, `step?: number` | 숫자 입력 및 범위 검증 |

### 필드 예시

```ts
const textField = {
  id: 'companyName',
  name: 'Company Name',
  type: 'text',
  page: 0,
  x: 0.12,
  y: 0.18,
  width: 0.4,
  height: 0.045,
  required: true,
  maxLength: 80,
} as const;

const numberField = {
  id: 'salary',
  name: 'Salary',
  type: 'number',
  page: 0,
  x: 0.12,
  y: 0.26,
  width: 0.24,
  height: 0.045,
  min: 0,
  max: 1000000,
  step: 1000,
} as const;

const signatureField = {
  id: 'employeeSignature',
  name: 'Employee Signature',
  type: 'signature',
  signatureMode: 'all',
  page: 0,
  x: 0.12,
  y: 0.72,
  width: 0.35,
  height: 0.12,
} as const;
```

## 값 타입

```ts
interface SignatureValue {
  readonly type: 'signature';
  readonly source?: 'draw' | 'stamp';
  readonly image: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

type ContractFieldValue =
  | string
  | number
  | boolean
  | SignatureValue;

type FieldValueMap = Record<string, ContractFieldValue>;
type SharedValueMap = Record<string, ContractFieldValue>;
```

서명/도장 값 예시는 다음과 같습니다.

```ts
document = setFieldValue(document, 'employeeSignature', {
  type: 'signature',
  source: 'stamp',
  image: stampPngBytes,
  mimeType: 'image/png',
});

// document.fieldValues.employeeSignature
// {
//   type: 'signature',
//   source: 'stamp',
//   image: Uint8Array,
//   mimeType: 'image/png'
// }
```

## 작업 함수

| 함수 | 반환 | 설명 |
| --- | --- | --- |
| `createDocument(input)` | `ContractDocument` | 빈 문서 생성 |
| `createField(document, field)` | `ContractDocument` | 필드 추가 |
| `updateField(document, fieldId, patch)` | `ContractDocument` | 필드 속성 수정. `id`, `type`은 변경 불가 |
| `removeField(document, fieldId)` | `ContractDocument` | 필드와 직접 값을 삭제 |
| `moveField(document, fieldId, position)` | `ContractDocument` | 필드 위치 변경 |
| `resizeField(document, fieldId, size)` | `ContractDocument` | 필드 크기 변경 |
| `setFieldValue(document, fieldId, value)` | `ContractDocument` | 필드 값 저장 |
| `clearFieldValue(document, fieldId)` | `ContractDocument` | 필드 값 삭제 |
| `getResolvedFieldValue(document, fieldId)` | `ContractFieldValue \| undefined` | 공유 값과 default value를 포함한 단일 필드 값 조회 |
| `getResolvedValues(document)` | `FieldValueMap` | 모든 필드의 resolved value map 조회 |

`setFieldValue`와 `clearFieldValue`는 mirror 필드와 readonly 필드에 대해 에러를 던집니다. 공유 source 필드에 값을 저장하면 `fieldValues`가 아니라 `sharedValues`가 갱신됩니다.

```ts
document = createField(document, {
  id: 'partyNameSource',
  name: 'Party Name Source',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.15,
  width: 0.35,
  height: 0.05,
  sharedKey: 'partyName',
  sharedMode: 'source',
});

document = createField(document, {
  id: 'partyNameMirror',
  name: 'Party Name Mirror',
  type: 'text',
  page: 0,
  x: 0.1,
  y: 0.25,
  width: 0.35,
  height: 0.05,
  sharedKey: 'partyName',
  sharedMode: 'mirror',
});

document = setFieldValue(document, 'partyNameSource', 'Pactum Inc.');

document.sharedValues;
// { partyName: 'Pactum Inc.' }

getResolvedFieldValue(document, 'partyNameMirror');
// 'Pactum Inc.'
```

## 검증

```ts
import { validateField, validateDocument } from '@pactum/pactum_core';

const result = validateDocument(document);

if (!result.valid) {
  console.log(result.errors);
}
```

반환 타입은 다음과 같습니다.

```ts
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly FieldValidationError[];
}

interface FieldValidationError {
  readonly fieldId: string;
  readonly fieldName: string;
  readonly message: string;
  readonly code: ValidationErrorCode;
}

type ValidationErrorCode =
  | 'REQUIRED'
  | 'PATTERN_MISMATCH'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'MIN_VALUE'
  | 'MAX_VALUE'
  | 'INVALID_TYPE'
  | 'MIRROR_CANNOT_SET_VALUE'
  | 'SHARED_SOURCE_NOT_FOUND';
```

실패 예시는 다음과 같습니다.

```ts
const result = validateDocument(document);

// {
//   valid: false,
//   errors: [
//     {
//       fieldId: 'employeeName',
//       fieldName: 'Employee Name',
//       message: 'This field is required.',
//       code: 'REQUIRED'
//     }
//   ]
// }
```

`FieldValidation`은 문자열과 숫자 검증을 지원합니다.

```ts
type FieldValidation = {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  customMessage?: string;
};
```

## 날짜 포맷

날짜 필드는 native date input 값을 사용하므로 저장 값은 `yyyy-mm-dd`입니다. `dateFormat`은 viewer 표시와 PDF export 렌더링에 적용됩니다.

```ts
import { formatDateValue, isIsoDateString } from '@pactum/pactum_core';

formatDateValue('2026-04-22', 'yyyy.mm.dd');
// '2026.04.22'

formatDateValue('2026-04-22', 'yy.M.d');
// '26.4.22'

isIsoDateString('2026-04-22');
// true
```

지원 토큰은 `yyyy`, `yy`, `MM`/`mm`, `M`/`m`, `dd`, `d`입니다.

## PDF 내보내기

```ts
import { exportToPdf } from '@pactum/pactum_core';

const completedPdfBytes = await exportToPdf(document);

// completedPdfBytes: Uint8Array
```

PDF export는 `document.pdfData`를 원본 PDF로 읽고, 각 필드의 resolved value를 페이지 위에 그립니다. `hidden: true`인 필드는 export에서 제외됩니다.

## React 뷰어

```tsx
import { useState } from 'react';
import { ContractViewer } from '@pactum/pactum_react';
import type { ContractDocument } from '@pactum/pactum_core';

function ContractScreen({ initialDocument }: { initialDocument: ContractDocument }) {
  const [document, setDocument] = useState(initialDocument);

  return (
    <ContractViewer
      mode="fill"
      document={document}
      onDocumentChange={setDocument}
      pageWidth={900}
      viewportHeight="80vh"
    />
  );
}
```

### 뷰어 props

| Prop | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `mode` | `'builder' \| 'fill' \| 'sign' \| 'readonly'` | Yes | viewer 동작 모드 |
| `document` | `ContractDocument` | Yes | 렌더링할 문서 모델 |
| `onDocumentChange` | `(next: ContractDocument) => void` | Yes | 값/필드 변경 시 호출 |
| `pageWidth` | `number` | No | 기본 페이지 표시 너비. 기본값 `720` |
| `viewportHeight` | `number \| string` | No | viewer 높이. 기본값 `'80vh'` |
| `pdfWorkerSrc` | `string` | No | pdf.js worker 경로 |
| `className` | `string` | No | root class name |
| `style` | `CSSProperties` | No | root inline style |

### 모드

| 모드 | 동작 |
| --- | --- |
| `builder` | 필드 드래그 생성, 이동, 크기 변경, 삭제 |
| `fill` | 텍스트/날짜/체크박스/숫자 등 일반 입력 |
| `sign` | 일반 입력과 서명/도장 입력 |
| `readonly` | 입력과 필드 조작 비활성화 |

### 뷰어 ref API

```tsx
import { useRef } from 'react';
import { ContractViewer, type ContractViewerHandle } from '@pactum/pactum_react';

const viewerRef = useRef<ContractViewerHandle>(null);

viewerRef.current?.beginDragCreate('text', {
  placeholder: 'Enter employee name',
});

viewerRef.current?.beginDragCreate('date', {
  dateFormat: 'yyyy.mm.dd',
});

viewerRef.current?.cancelDragCreate();
```

```tsx
<ContractViewer
  ref={viewerRef}
  mode="builder"
  document={document}
  onDocumentChange={setDocument}
/>
```

서명/도장 이미지를 외부에서 주입할 수도 있습니다.

```ts
viewerRef.current?.setSignatureImage('employeeSignature', {
  image: signaturePngBytes,
  mimeType: 'image/png',
});

viewerRef.current?.setStampImage('employeeSignature', {
  image: stampPngBytes,
  mimeType: 'image/png',
});

viewerRef.current?.setFieldImage('employeeSignature', {
  source: 'stamp',
  image: stampPngBytes,
  mimeType: 'image/png',
});
```

이미지 입력 타입은 다음과 같습니다.

```ts
interface ContractViewerBinaryImageInput {
  readonly image: Uint8Array | ArrayBuffer;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

interface ContractViewerImageInput extends ContractViewerBinaryImageInput {
  readonly source?: 'draw' | 'stamp';
}
```

`signatureMode`가 `sign-only`이면 stamp 주입이 거부되고, `stamp-only`이면 draw 주입이 거부됩니다.

## 전체 예시

```tsx
import { useRef, useState } from 'react';
import {
  createDocument,
  createField,
  setFieldValue,
  validateDocument,
  exportToPdf,
  type ContractDocument,
} from '@pactum/pactum_core';
import {
  ContractViewer,
  type ContractViewerHandle,
} from '@pactum/pactum_react';

function createInitialDocument(pdfData: Uint8Array): ContractDocument {
  let document = createDocument({
    id: 'contract-001',
    title: 'Employment Contract',
    pdfData,
    pageCount: 1,
    pages: [{ index: 0, width: 612, height: 792 }],
  });

  document = createField(document, {
    id: 'employeeName',
    name: 'Employee Name',
    type: 'text',
    page: 0,
    x: 0.1,
    y: 0.2,
    width: 0.35,
    height: 0.05,
    required: true,
  });

  document = createField(document, {
    id: 'employeeSignature',
    name: 'Employee Signature',
    type: 'signature',
    signatureMode: 'all',
    page: 0,
    x: 0.1,
    y: 0.74,
    width: 0.35,
    height: 0.1,
    required: true,
  });

  return setFieldValue(document, 'employeeName', 'Ada Lovelace');
}

export function ContractApp({ pdfData }: { pdfData: Uint8Array }) {
  const [document, setDocument] = useState(() => createInitialDocument(pdfData));
  const viewerRef = useRef<ContractViewerHandle>(null);

  const onExport = async () => {
    const validation = validateDocument(document);
    if (!validation.valid) {
      console.log(validation.errors);
      return;
    }

    const pdfBytes = await exportToPdf(document);
    console.log(pdfBytes);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => viewerRef.current?.beginDragCreate('text')}
      >
        Add text field
      </button>
      <button type="button" onClick={onExport}>
        Export PDF
      </button>
      <ContractViewer
        ref={viewerRef}
        mode="sign"
        document={document}
        onDocumentChange={setDocument}
      />
    </>
  );
}
```
