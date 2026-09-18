# Implementation Plan: Исправление масштабирования фото во Viewport и оптимизация производительности

**Branch**: `001-fix-viewport-scaling` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

## Summary

Устранить искажение и растягивание фото во Viewport при размещении горизонтальных и вертикальных изображений, гарантировать 100% сохранение геометрических пропорций во всех режимах и ориентациях, а также кардинально оптимизировать производительность Live Preview: исключить дублирование многомегабайтных Base64-данных в DOM через SVG `<defs>` + `<use>`, предотвратить пропуск рендеров при конкурентном вводе и обеспечить адаптивное вписывание макета во Viewport.

## Technical Context

**Language/Version**: TypeScript 5.3+, HTML5 Canvas, SVG  
**Primary Dependencies**: None (чистый DOM/Canvas/SVG без тяжелых фреймворков)  
**Target Platform**: Evergreen Web Browsers (Chrome, Safari, Firefox, Edge, iOS Safari, Android Chrome)  
**Performance Goals**:
- Перерисовка SVG Live Preview < 16 мс (60 FPS)
- Размер SVG DOM < 50 КБ при любом тираже (вместо 200 МБ)
- Устранение 100% деформаций фото (коэффициент искажения aspect ratio = 1.0)  
**Constraints**: Совместимость с существующим экспортом в PDF и PNG, сохранение локализации ru/en.

## Constitution Check

- Test-First: unit-тесты для расчета пропорций и нарезки кадрирования.
- Отсутствие побочных эффектов: правки локализованы в `previewRenderer.ts`, `cropEngine.ts`, `controls.ts`, `styles.css`.
- Ограничение области видимости: не трогать несвязанный функционал.

## Proposed Changes

### 1. Preview Renderer (`src/preview/previewRenderer.ts`)
- Заменить многократное дублирование `<image href="${imageUrl}">` на объявление одного шаблона в `<defs>` с `id="stickerArt"`.
- Заменить `preserveAspectRatio="none"` на `xMidYMid slice` (при `fill`) или `xMidYMid meet` (при `fit`), что физически исключает растягивание фото.
- Размещать стикеры в цикле через `<use href="#stickerArt" x="..." y="..." width="..." height="..." />`.

### 2. Crop Engine (`src/image/cropEngine.ts`)
- Обеспечить строгое совпадение пропорций генерируемого растра с целевым `aspectRatio`.
- При наличии `cropData`, если соотношение сторон стикера изменилось, пропорционально адаптировать область кадрирования по центру, не допуская сжатия.
- Поддержать эффективное создание Blob URL для мгновенного превью.

### 3. UI Controller (`src/ui/controls.ts`)
- Реализовать очередь последнего состояния (Sequential Lock / Last-Wins Queue): ни один вызов `recalculateArtwork` не должен бесследно теряться при быстром вводе или переключении радиокнопок.
- Использовать `URL.createObjectURL(blob)` вместо гигантского `canvas.toDataURL()` для Live Preview.
- Очищать старые Blob URL через `URL.revokeObjectURL` для предотвращения утечек памяти.

### 4. Styles & Viewport CSS (`src/styles.css`)
- Убрать жесткую фиксацию `aspect-ratio: 210/297` и `width: min(85vw, 560px)` у `.sheet-shadow-wrapper`.
- Настроить адаптивное авто-вписывание листа по высоте и ширине: `max-width: 100%; max-height: 100%; aspect-ratio: inherit;`.

## Verification Plan

### Automated Tests
- `npm test`: запуск Vitest тестов для `aspectRatio.test.ts`, `layoutEngine.test.ts`, `pngGenerator.test.ts`.
- Добавить новые тесты для проверки сохранения пропорций при кадрировании и рендере SVG.

### Manual Verification
- Загрузка горизонтального фото (16:9) на вертикальный стикер (54x85) и вертикального фото (9:16) на горизонтальный стикер (85x54).
- Проверка переключения Fill / Fit.
- Проверка включения/отключения автоповорота 90°.
- Стресс-тест непрерывного ввода параметров с инспектором DOM и Performance.
