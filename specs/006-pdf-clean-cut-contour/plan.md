# План реализации: Чистый контур реза в PDF для плоттера (Print & Cut)

**Ветка**: `006-pdf-clean-cut-contour` | **Дата**: 2026-10-09 | **Спецификация**: [spec.md](./spec.md)

---

## 1. Резюме

**Проблема**: При открытии экспортированного PDF в программе Easy Cut Studio (режим Print & Cut) программа плоттера воспринимает векторные пути разности вылета (`bleedPath`) как линии реза. В результате нож плоттера прорезает внешний контур вылета и габаритную рамку растра.  
**Техническое решение**: 
1. Исключить векторные пути вылета (`drawSvgPath(bleedPath)`) и векторные обтравочные контуры (`clipToBleed`) из потока операторов PDF.
2. Запекать фоновый вылет (Bleed) и краевую заливку (`edgeFillPath`) прямо в растровый PNG стикера на Canvas с расширением габаритов на `+ 2 * bleedMm`.
3. Добавить в PDF ровно один чистый векторный контур реза (`CutContour`) строго по внутреннему обрису стикера 1:1 (красный `#FF0000`, 0.1 мм hairline) при включенной настройке.
4. Добавить в UI переключатель «Включать контур реза в PDF (для плоттера)» (`pdfIncludeCutContour`, по умолчанию включен).

---

## 2. Технический контекст

- **Язык / Версия**: TypeScript 5.x / ES2022
- **Стек**: Vite, HTML5 Canvas API, pdf-lib
- **Тестирование**: Vitest
- **Целевая среда**: 100% клиентский браузер (локальный рендеринг без сервера)
- **Совместимость**: Easy Cut Studio, Silhouette Studio, CorelDraw, Adobe Illustrator, Acrobat Reader

---

## 3. Архитектура и поток данных

```mermaid
flowchart TD
    UserImg[Исходное изображение стикера] --> CanvasBake[Canvas: Запекание вылета]
    BleedParams[bleedMm, bleedColor, edgeFillPath] --> CanvasBake
    ShapeParams[shape, cornerRadiusMm, stickerW, stickerH] --> CanvasBake
    
    CanvasBake --> MaskedPng[Единый растровый PNG с вылетом]
    MaskedPng --> PDFEmbed[Встраивание Image XObject в PDF (1 раз)]
    
    Layout[Сетка позиций layoutEngine] --> PDFLoop[Отрисовка позиций в PDF]
    PDFEmbed --> PDFLoop
    
    PDFLoop --> ImageDraw[Размещение растра: x - bleed, y - bleed, w + 2*bleed, h + 2*bleed]
    
    CutContourToggle{pdfIncludeCutContour?} -->|Да| DrawCutLine[Векторный контур 1:1: #FF0000, 0.1 мм, fill: none]
    CutContourToggle -->|Нет| NoCutLine[Без векторных контуров на стикерах]
    
    DrawCutLine --> ResultPdf[Готовый PDF: 0 лишних векторов, 1 контур реза на стикер]
    NoCutLine --> ResultPdf
```

---

## 4. Затрагиваемые компоненты и файлы

1. **`src/state.ts`**:
   - Добавить свойство `pdfIncludeCutContour: boolean` в интерфейс `AppState`.
   - Значение по умолчанию: `true`.
2. **`src/i18n.ts`**:
   - Добавить ключи локализации `lblPdfIncludeCutContour` и `hintPdfIncludeCutContour` (RU и EN).
3. **`src/pdf/pdfGenerator.ts`**:
   - Расширить опции `PdfExportOptions`: добавить `includeCutContour?: boolean`.
   - Модернизировать `createMaskedStickerPng` (или реализовать вспомогательную `createStickerArtworkWithBleedPng`):
     - При `bleedMm > 0` размер холста увеличивается пропорционально `bleedMm`.
     - На холсте заливается внешняя форма вылета цветом `bleedColor`.
     - При наличии `edgeFillPath` накладывается краевой фон.
     - По центру со смещением `bleedMm` накладывается изображение наклейки, маскированное по форме стикера 1:1.
   - В функции `generateStickerSheetPdf`:
     - Размещать растр по координатам `pos.xMm - bleedMm`, `pos.yMm - bleedMm` размером `pos.widthMm + 2*bleedMm`, `pos.heightMm + 2*bleedMm`.
     - Полностью удалить вызовы `page.drawSvgPath(bleedPath)` и `clipToBleed`.
     - При `includeCutContour === true` рисовать замкнутую векторную фигуру реза (круг, скругленный прямоугольник, прямоугольник) цветом `rgb(1, 0, 0)`, толщиной 0.1 мм (hairline), без заливки.
4. **`index.html`**:
   - В блок параметров резки/вылета добавить чекбокс `#pdfIncludeCutContour` с подсказкой.
5. **`src/ui/controls.ts`**:
   - Привязать событие `change` чекбокса `#pdfIncludeCutContour` к обновлению состояния `store.update({ pdfIncludeCutContour: e.target.checked })`.
   - В обработчике `handleDownloadPdf` передавать `includeCutContour: state.pdfIncludeCutContour !== undefined ? Boolean(state.pdfIncludeCutContour) : true`.
   - В методе `syncControlsWithState` синхронизировать состояние чекбокса.
6. **`src/pdf/pdfGenerator.test.ts`**:
   - Добавить тесты на проверку отсутствия векторных путей разности вылета в PDF и наличия чистого контура реза.

---

## 5. Стратегия тестирования и верификации

1. **Модульные тесты**:
   - Запуск `npm run test` (все существующие 148 тестов должны остаться зелёными).
   - Новые тесты для `pdfGenerator`:
     - Проверка, что при `bleedMm > 0` в сгенерированном PDF нет операторов `getBleedDifferenceSvgPath`.
     - Проверка, что при `includeCutContour: true` генерируются контуры реза нужного цвета и толщины.
     - Проверка, что при `includeCutContour: false` векторные контуры стикеров не генерируются.
2. **Интеграционная сборка**:
   - `npm run build` с 0 ошибок TypeScript и Vite.
3. **Ручная проверка**:
   - Генерация листа наклеек в браузере, экспорт PDF, инспекция векторных кривых на отсутствие внешнего кольца вылета.
