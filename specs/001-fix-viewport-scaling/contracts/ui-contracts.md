# UI Contracts: Preview Renderer & Crop Engine

## 1. Контракт `renderPreviewSvg`
```typescript
export interface PreviewOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  margins: Margins;
  layout: LayoutResult;
  imageUrl?: string | null;
  sizingMode?: 'fill' | 'fit';
  cutMarksConfig: CutMarksConfig;
  bleedMm?: number;
}

export function renderPreviewSvg(options: PreviewOptions): string;
```
- Гарантия: Изображение стикера помещается в `<defs><image id="stickerArt" ... /></defs>` с `preserveAspectRatio="xMidYMid slice"` (для `fill`) или `preserveAspectRatio="xMidYMid meet"` (для `fit`).
- Каждая позиция стикера рендерится как `<use href="#stickerArt" x="${pos.xMm}" y="${pos.yMm}" width="${pos.widthMm}" height="${pos.heightMm}" />`.
