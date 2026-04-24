# Pactum 사용 가이드

이 문서는 `@pactum-labs/core`와 `@pactum-labs/react`의 현재 공개 사용법을 설명합니다.
최근 반영된 런타임 검증 규칙과 뷰어 동작을 기준으로 작성했습니다.

## 패키지

| 패키지 | 용도 |
| --- | --- |
| `@pactum-labs/core` | 불변 문서 모델, 필드 조작, 검증, 공유 값 처리, PDF export |
| `@pactum-labs/react` | 한 번에 한 페이지를 렌더링하는 React 뷰어와 필드 오버레이 |

## 설치

```bash
pnpm add @pactum-labs/core @pactum-labs/react
```

`@pactum-labs/react`는 `react`, `react-dom`을 peer dependency로 사용합니다.

## 빠른 시작

```ts
import {
  createDocument,
  createField,
  setFieldValue,
  validateDocument,
  exportToPdf,
  type ContractDocument,
} from '@pactum-labs/core';

let document: ContractDocument = createDocument({
  id: 'contract-001',
  title: 'Employment Contract',
  pdfData,
  pageImages: [pageImageBytes],
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
  y: 0.72,
  width: 0.35,
  height: 0.12,
  required: true,
});

document = setFieldValue(document, 'employeeName', 'Ada Lovelace');

const validation = validateDocument(document);
if (!validation.valid) {
  console.log(validation.errors);
}

const pdfBytes = await exportToPdf(document);
```

## 문서 모델

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
```

`pdfData`는 항상 필요합니다.
`pageImages`는 선택 사항이지만, 있으면 React 뷰어가 먼저 사용하고 없으면 PDF 렌더링으로 폴백합니다.

## 좌표 체계

필드 위치와 크기는 페이지 기준 정규화 좌표를 사용합니다.

| 필드 | 의미 |
| --- | --- |
| `page` | 0부터 시작하는 페이지 인덱스 |
| `x` | 왼쪽 기준 위치, `0`부터 `1` |
| `y` | 위쪽 기준 위치, `0`부터 `1` |
| `width` | 페이지 너비 대비 비율 |
| `height` | 페이지 높이 대비 비율 |

`createField`, `updateField`, `moveField`, `resizeField`는 좌표를 페이지 범위 안으로 보정합니다.

## 필드 타입

공통 필드:

| 필드 | 타입 |
| --- | --- |
| `id` | `string` |
| `name` | `string` |
| `type` | `ContractFieldType` |
| `page` | `number` |
| `x` | `number` |
| `y` | `number` |
| `width` | `number` |
| `height` | `number` |
| `label` | `string` |
| `textSize` | `number` |
| `borderRadius` | `number` |
| `required` | `boolean` |
| `placeholder` | `string` |
| `readonly` | `boolean` |
| `hidden` | `boolean` |
| `defaultValue` | `unknown` |
| `validation` | `FieldValidation` |
| `sharedKey` | `string` |
| `sharedMode` | `'source' \| 'mirror'` |

지원 타입과 실제 값 타입:

| 타입 | 런타임 값 |
| --- | --- |
| `text` | `string` |
| `textarea` | `string` |
| `date` | `yyyy-mm-dd` 형식의 `string` |
| `checkbox` | `boolean` |
| `signature` | `SignatureValue` |
| `email` | `string` |
| `phone` | `string` |
| `number` | `number` |

하나의 문서 안에서 `field.id`는 반드시 유일해야 합니다.

## 런타임 값 규칙

Pactum은 타입스크립트 타입뿐 아니라 런타임에서도 값 호환성을 강제합니다.

- `text`, `textarea`, `date`, `email`, `phone`은 문자열만 허용합니다.
- `number`는 유한한 숫자만 허용합니다.
- `checkbox`는 boolean만 허용합니다.
- `signature`는 서명 객체만 허용합니다.
- mirror 필드는 직접 값을 쓸 수 없습니다.
- readonly 필드는 값 설정과 삭제가 모두 거부됩니다.

서명 이미지는 PNG와 JPEG만 허용합니다.
MIME 타입과 실제 이미지 바이트 시그니처가 일치해야 합니다.

```ts
interface SignatureValue {
  readonly type: 'signature';
  readonly source?: 'draw' | 'stamp';
  readonly image: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}
```

## 주요 함수

| 함수 | 설명 |
| --- | --- |
| `createDocument(input)` | 빈 문서 생성 |
| `createField(document, field)` | 필드 추가 |
| `updateField(document, fieldId, patch)` | `id`, `type`를 제외한 필드 속성 수정 |
| `removeField(document, fieldId)` | 필드와 직접 값을 제거 |
| `moveField(document, fieldId, position)` | 필드 이동 |
| `resizeField(document, fieldId, size)` | 필드 크기 변경 |
| `setFieldValue(document, fieldId, value)` | 필드 값 설정 |
| `clearFieldValue(document, fieldId)` | 필드 값 제거 |
| `getResolvedFieldValue(document, fieldId)` | 하나의 resolved value 조회 |
| `getResolvedValues(document)` | 전체 resolved value 조회 |

shared source 필드에 값을 쓰면 `fieldValues`가 아니라 `sharedValues`가 갱신됩니다.
mirror 필드는 resolved value로 공유 값을 읽습니다.

## 검증

```ts
import { validateDocument } from '@pactum-labs/core';

const result = validateDocument(document);
```

검증 항목:

- 필수값 여부
- 문자열 최소/최대 길이
- 숫자 최소/최대값
- 정규식 패턴 일치 여부
- 잘못된 런타임 값 타입
- 잘못된 서명 이미지 형식
- shared source 누락

`validation.pattern`이 잘못된 정규식이어도 예외를 던지지 않고 검증 오류로 반환합니다.

## 날짜 포맷

날짜 필드는 `yyyy-mm-dd` 형식으로 저장됩니다.
`dateFormat`은 뷰어 표시와 PDF export에만 적용됩니다.

```ts
import { formatDateValue } from '@pactum-labs/core';

formatDateValue('2026-04-22', 'yyyy.mm.dd');
// '2026.04.22'
```

지원 토큰은 `yyyy`, `yy`, `MM`/`mm`, `M`/`m`, `dd`, `d`입니다.

## PDF Export

```ts
import { exportToPdf } from '@pactum-labs/core';

const pdfBytes = await exportToPdf(document);
```

export는 `document.pdfData`를 원본 PDF로 읽고, 각 필드의 resolved value를 해당 페이지에 그립니다.

- `hidden: true` 필드는 export되지 않습니다.
- 잘못된 필드 값이 있으면 export 전에 즉시 실패합니다.
- 서명 이미지는 PNG와 JPEG만 export할 수 있습니다.

## React 뷰어

```tsx
import { useState } from 'react';
import { ContractViewer } from '@pactum-labs/react';

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

### 주요 props

| Prop | 설명 |
| --- | --- |
| `mode` | `builder`, `fill`, `sign`, `readonly` 중 하나 |
| `document` | 렌더링할 문서 모델 |
| `onDocumentChange` | 필드나 값이 바뀌면 호출 |
| `pageWidth` | 기본 페이지 표시 너비. 기본값 `720` |
| `viewportHeight` | 뷰어 높이. 기본값 `'80vh'` |
| `pdfWorkerSrc` | PDF 렌더링이 필요할 때 쓸 pdf.js worker 경로 |
| `className` | 루트 class name |
| `style` | 루트 inline style |

### 뷰어 동작

- 뷰어는 viewport 안에서 현재 페이지 하나만 렌더링합니다.
- 내장 페이지 이동 버튼은 렌더링하지 않습니다.
- viewport는 스크롤, 줌, 팬을 지원합니다.
- builder 모드는 드래그 생성, 이동, 리사이즈, 삭제를 지원합니다.
- sign 모드는 `signatureMode`에 따라 직접 서명 또는 스탬프 업로드를 지원합니다.

PDF 기반 렌더링이 필요하면 pdf.js worker를 명시적으로 설정해야 합니다.

```ts
import { configurePdfWorker } from '@pactum-labs/react';

configurePdfWorker('/pdf.worker.min.mjs');
```

### ref API

```tsx
import { useRef } from 'react';
import { ContractViewer, type ContractViewerHandle } from '@pactum-labs/react';

const viewerRef = useRef<ContractViewerHandle>(null);

viewerRef.current?.beginDragCreate('text', {
  placeholder: 'Enter employee name',
});

viewerRef.current?.cancelDragCreate();
viewerRef.current?.goToPage(2);
viewerRef.current?.nextPage();
viewerRef.current?.previousPage();
```

이미지 주입 예시:

```ts
viewerRef.current?.setSignatureImage('employeeSignature', {
  image: signaturePngBytes,
  mimeType: 'image/png',
});

viewerRef.current?.setStampImage('employeeSignature', {
  image: stampJpegBytes,
  mimeType: 'image/jpeg',
});
```

뷰어는 단일 페이지 렌더링을 유지하므로, 페이지 이동 UI는 상위 컴포넌트에서 ref API를 사용해 직접 구성하는 방식입니다.

## 하위 React API

`@pactum-labs/react`는 `ContractCanvasPages`, `ContractPdfPages`, `FieldBox`, `configurePdfWorker`, `getDocumentPageCount`, `loadRenderedPage`도 제공합니다.
