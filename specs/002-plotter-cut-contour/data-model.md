# Data Model: Формы стикеров и контуры плоттерной резки

## Типы данных

```typescript
export type StickerShape = 'rect' | 'circle' | 'rounded';

export interface RegistrationMarksConfig {
  enabled: boolean;
  sizeMm: number;    // по умолчанию 10 мм
  offsetMm: number;  // по умолчанию 8 мм от краев листа
  lineWidthPt: number; // 0.5 pt
}

export interface AppSettings {
  // Существующие поля...
  stickerWidthMm: number;
  stickerHeightMm: number;
  // Новые поля:
  stickerShape: StickerShape;
  cornerRadiusMm: number; // 0.5 - 50 мм, по умолчанию 3 мм
  registrationMarks: boolean; // включены ли метки совмещения
}

export interface CutContourOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  layout: LayoutResult;
  shape: StickerShape;
  cornerRadiusMm: number;
  registrationMarks: boolean;
  strokeColor?: string;     // по умолчанию '#ff0000'
  strokeWidthMm?: number;   // по умолчанию 0.1 мм
}
```

## Правила валидации и связывания

1. **`shape === 'circle'`**:
   - `stickerWidthMm === stickerHeightMm` (синхронное обновление при вводе диаметра).
   - В UI отображается одно поле «Диаметр (мм)».
2. **`shape === 'rounded'`**:
   - `cornerRadiusMm` валидируется в диапазоне $[0.5, \min(W, H) / 2]$.
3. **`shape === 'rect'`**:
   - Стандартный прямоугольник, поле радиуса скрыто.
