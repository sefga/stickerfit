# Архитектурный план: 008-centered-bleed-cut

## 1. Затрагиваемые компоненты и файлы

1. **Состояние приложения**:
   - `src/state.ts` — добавление `bleedCenterCut` в `AppSettings` и `DEFAULT_SETTINGS`, сохранение/загрузка из LocalStorage.
2. **Геометрия и расчет вылетов**:
   - `src/layout/bleedGeometry.ts` — функция `getInnerArtBounds(dims, bleedCenterCut)`, определяющая смещения и размеры сжатого изображения стикера.
   - `src/layout/bleedGeometry.test.ts` — модульные тесты для расчета инсета и граничных условий ($B \ge D/2$).
3. **Интерактивное превью листа**:
   - `src/preview/previewRenderer.ts` — отрисовка сжатой картинки с центрированием внутри номинального контура реза, отображение фонового пояса цвета `bleedColor`.
   - `src/preview/previewRenderer.test.ts` — проверка разметки SVG превью.
4. **Генераторы экспорта**:
   - `src/pdf/pdfGenerator.ts` — расчет габаритов при запекании растра на Canvas с учетом сжатия изображения на `insetMm` и подложки на `outerRadius`.
   - `src/pdf/pdfGenerator.test.ts` — тесты PDF с включенным `bleedCenterCut`.
   - `src/export/pngGenerator.ts` — растровый экспорт на Canvas с центрированным ободом.
   - `src/export/pngGenerator.test.ts` — тесты экспорта PNG.
   - `src/export/svgCutGenerator.ts` / `svgCutGenerator.test.ts` — проверка неизменности плоттерного реза $1:1$.
5. **Пользовательский интерфейс и локализация**:
   - `index.html` — разметка чекбокса `#bleedCenterCut` в группе настроек вылета.
   - `src/i18n.ts` — ключи `lblBleedCenterCut`, `hintBleedCenterCut` (ru/en).
   - `src/ui/controls.ts` — биндинг событий изменения чекбокса и видимости блока.

---

## 2. Архитектурное решение и математическая модель

### 2.1. Расчет инсета (сжатия картинки)
Для стикера с номинальными размерами $W \times H$ и внешним вылетом $B$:
```typescript
export interface InnerArtBounds {
  insetMm: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerRadius: number;
}

export function getInnerArtBounds(
  widthMm: number,
  heightMm: number,
  bleedMm: number,
  shape: BleedShape,
  bleedCenterCut: boolean,
  cornerRadiusMm: number = 0
): InnerArtBounds {
  if (!bleedCenterCut || bleedMm <= 0) {
    const minDim = Math.min(widthMm, heightMm);
    return {
      insetMm: 0,
      innerX: 0,
      innerY: 0,
      innerWidth: widthMm,
      innerHeight: heightMm,
      innerRadius: shape === 'circle' ? minDim / 2 : Math.min(cornerRadiusMm, minDim / 2),
    };
  }

  const minDim = Math.min(widthMm, heightMm);
  // Максимально допустимый инсет — не более 40% от минимального размера,
  // чтобы картинка оставалась размером не менее 20%
  const maxInset = roundMm(minDim * 0.4, 3);
  const insetMm = roundMm(Math.min(bleedMm, maxInset), 3);

  const innerWidth = roundMm(widthMm - 2 * insetMm, 3);
  const innerHeight = roundMm(heightMm - 2 * insetMm, 3);
  const innerMinDim = Math.min(innerWidth, innerHeight);

  let innerRadius = 0;
  if (shape === 'circle') {
    innerRadius = roundMm(innerMinDim / 2, 3);
  } else if (shape === 'rounded') {
    const rawR = Math.max(0, cornerRadiusMm - insetMm);
    innerRadius = roundMm(Math.min(rawR, innerMinDim / 2), 3);
  }

  return {
    insetMm,
    innerX: insetMm,
    innerY: insetMm,
    innerWidth,
    innerHeight,
    innerRadius,
  };
}
```

### 2.2. Слои рендеринга стикера (Z-Order)
1. **Слой 0 (Подложка вылета)**:
   - Заливается сплошным диском/скругленным прямоугольником цвета `bleedColor` с внешними габаритами $W + 2B \times H + 2B$ (радиус $R + B$).
2. **Слой 1 (Сжатое изображение)**:
   - Изображение наклейки размещается со смещением `(insetMm, insetMm)` и размерами `innerWidth x innerHeight`.
   - Клипируется по форме `innerRadius`.
3. **Слой 2 (Линия реза / CutContour)**:
   - Векторная линия реза проходит строго по номинальному радиусу $R$ (габариты $W \times H$).
   - В превью: пунктир `#ef4444`.
   - В PDF: под растром (underlay) для считывания плоттером без паразитной печати на бумаге.
   - В SVG Cut: точный вектор $1:1$.

---

## 3. Таблица трассировки требований

| Требование | Архитектурное решение | Затрагиваемые файлы | Метод верификации |
|---|---|---|---|
| FR-01 (Модель) | Добавить `bleedCenterCut` в состояние и хранилище | `src/state.ts` | Unit-тест store |
| FR-02 (Геометрия) | Функция `getInnerArtBounds` с защитой $\le 40\%$ | `src/layout/bleedGeometry.ts` | Unit-тест `bleedGeometry.test.ts` |
| FR-03 (Фиксация реза) | Контур реза плоттера строго $W \times H$ | `src/export/svgCutGenerator.ts` | Unit-тест `svgCutGenerator.test.ts` |
| FR-04 (Превью) | Сжатие `image` и подложка `bleedColor` | `src/preview/previewRenderer.ts` | Vitest `previewRenderer.test.ts` |
| FR-05 (PDF) | Сжатие на Canvas при экспорте PDF | `src/pdf/pdfGenerator.ts` | Vitest `pdfGenerator.test.ts` |
| FR-06 (PNG) | Сжатие на Canvas при экспорте PNG | `src/export/pngGenerator.ts` | Vitest `pngGenerator.test.ts` |
| FR-07 (UI) | Чекбокс `#bleedCenterCut` в панели Bleed | `index.html`, `src/ui/controls.ts` | Инспекция DOM / тесты |
| FR-08 (Локализация) | Ключи переводов ru/en | `src/i18n.ts` | Vitest `i18n.test.ts` |

---

## 4. План тестирования и верификации

1. **Модульные тесты Vitest**:
   - `bleedGeometry.test.ts`: расчет габаритов внутреннего арта, проверка работы при $B=0$, $B=1$, $B=2$, проверка лимита 40%.
   - `pdfGenerator.test.ts`: тест генерации PDF с `bleedCenterCut: true`.
   - `pngGenerator.test.ts`: тест отрисовки PNG с `bleedCenterCut: true`.
   - `svgCutGenerator.test.ts`: тест неизменности реза 1:1.
   - `i18n.test.ts`: проверка наличия всех языковых ключей.
2. **Интеграционная сборка**:
   - `npm run test` (все 19+ файлов тестов).
   - `npm run build` (TypeScript tsc компиляция и Vite production bundle).
