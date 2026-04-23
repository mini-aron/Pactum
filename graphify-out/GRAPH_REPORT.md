# Graph Report - Pactum  (2026-04-23)

## Corpus Check
- 32 files · ~16,295 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 100 nodes · 109 edges · 9 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `renderField()` - 7 edges
2. `validateField()` - 7 edges
3. `resolveFieldValue()` - 6 edges
4. `normalizeRect()` - 5 edges
5. `isSignatureValue()` - 4 edges
6. `toAbsoluteRect()` - 4 edges
7. `updateField()` - 4 edges
8. `exportToPdf()` - 4 edges
9. `makeError()` - 4 edges
10. `validateSharedFieldGroup()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `renderField()` --calls--> `formatDateValue()`  [INFERRED]
  packages/pactum_core/src/export/index.ts → packages/pactum_core/src/format/date.ts
- `renderField()` --calls--> `isSignatureValue()`  [INFERRED]
  packages/pactum_core/src/export/index.ts → packages/pactum_core/src/types/value.ts
- `validateField()` --calls--> `isSignatureValue()`  [INFERRED]
  packages/pactum_core/src/validation/index.ts → packages/pactum_core/src/types/value.ts
- `createField()` --calls--> `normalizeRect()`  [INFERRED]
  packages/pactum_core/src/operations/index.ts → packages/pactum_core/src/coordinates/index.ts
- `getResolvedFieldValue()` --calls--> `resolveFieldValue()`  [INFERRED]
  packages/pactum_core/src/operations/index.ts → packages/pactum_core/src/shared/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (11): assertAtMostOneSourcePerSharedKey(), createField(), getResolvedFieldValue(), getResolvedValues(), moveField(), resizeField(), resolveAllSharedValues(), resolveFieldValue() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (2): createMediaUrl(), isSignatureValue()

### Community 2 - "Community 2"
Cohesion: 0.5
Nodes (7): drawCheckboxField(), drawImageField(), drawTextField(), exportToPdf(), getPageDimension(), renderField(), toAbsoluteRect()

### Community 3 - "Community 3"
Cohesion: 0.67
Nodes (6): makeError(), validateDocument(), validateField(), validateNumberValue(), validateSharedFieldGroup(), validateStringValue()

### Community 4 - "Community 4"
Cohesion: 0.4
Nodes (3): emptyDoc(), imageBackedDoc(), createDocument()

### Community 5 - "Community 5"
Cohesion: 0.53
Nodes (4): clampCoord(), clampToPage(), ensureMinSize(), normalizeRect()

### Community 6 - "Community 6"
Cohesion: 0.47
Nodes (4): dateFormatToRegexPattern(), escapeRegexChar(), formatDateValue(), matchesDateFormat()

### Community 7 - "Community 7"
Cohesion: 0.6
Nodes (4): decodeImage(), detectImageMimeType(), loadRenderedPages(), renderPdfPages()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (2): createTestDocumentInput(), minimalPdfData()

## Knowledge Gaps
- **Thin community `Community 1`** (12 nodes): `createMediaUrl()`, `getFieldBackground()`, `getSharedBadge()`, `isMediaField()`, `onDragPointerDown()`, `onPointerDown()`, `onResizePointerDown()`, `onStampUpload()`, `value.ts`, `FieldBox.tsx`, `isPrimitiveValue()`, `isSignatureValue()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (4 nodes): `createTestDocumentInput()`, `minimalPdfData()`, `textField()`, `helpers.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `resolveFieldValue()` connect `Community 0` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `renderField()` connect `Community 2` to `Community 1`, `Community 6`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `isSignatureValue()` connect `Community 1` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderField()` (e.g. with `isSignatureValue()` and `formatDateValue()`) actually correct?**
  _`renderField()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `resolveFieldValue()` (e.g. with `getResolvedFieldValue()` and `getResolvedValues()`) actually correct?**
  _`resolveFieldValue()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `isSignatureValue()` (e.g. with `createMediaUrl()` and `renderField()`) actually correct?**
  _`isSignatureValue()` has 3 INFERRED edges - model-reasoned connections that need verification._