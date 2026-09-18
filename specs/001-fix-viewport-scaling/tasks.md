# Tasks: Исправление масштабирования фото во Viewport и оптимизация производительности

**Branch**: `001-fix-viewport-scaling` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Foundational (Архитектурные исправления и нормализация пропорций)

- [x] **T001** [P] [US1] Обновить `src/image/cropEngine.ts`: нормализовать проверку `cropData` относительно целевого `aspectRatio`. При смене пропорций стикера автоматически масштабировать/центрировать область кадрирования без сплющивания исходника (FR-003, FR-004).
- [x] **T002** [P] [US1] Добавить unit-тесты в `tests/aspectRatio.test.ts` и `tests/cropEngine.test.ts` для проверки сохранения пропорций горизонтальных/вертикальных фото во всех режимах (`fill`, `fit`, поворот 90°).

## Phase 2: User Story 1 - Корректное отображение пропорций фото в Viewport (Priority: P1)

- [x] **T003** [US1] В `src/preview/previewRenderer.ts`: исключить `preserveAspectRatio="none"`. Заменить на `xMidYMid slice` (для `fill`) и `xMidYMid meet` (для `fit`), чтобы SVG никогда не растягивал изображение физически (FR-002).
- [x] **T004** [US1] В `src/preview/previewRenderer.ts`: перенести объявление изображения в `<defs><image id="stickerArt" ... /></defs>` и отрисовывать каждый стикер через `<use href="#stickerArt" ... />` (FR-001).
- [x] **T005** [US1] В `src/ui/controls.ts`: синхронизировать передачу `sheetRotation` и `sizingMode` в `renderPreviewSvg`, чтобы поворот ячеек на 90° отображался согласованно.

## Phase 3: User Story 2 - Оптимизация производительности и устранение зависаний (Priority: P1)

- [x] **T006** [US2] В `src/ui/controls.ts`: реализовать очередь последнего состояния (Sequential Lock / Last-Wins Queue) для `recalculateArtwork()`. Устранить сброс вызовов из-за флага `isProcessingImage` при быстром вводе (FR-005).
- [x] **T007** [US2] В `src/ui/controls.ts` и `src/image/cropEngine.ts`: перейти на создание легковесных Blob URL (`URL.createObjectURL`) для Live Preview вместо генерации многомегабайтных Base64 Data URL, реализовать `revokeObjectURL` для очистки памяти (FR-006).
- [x] **T008** [US2] В `src/preview/previewRenderer.ts`: убрать наложение тяжелого SVG-фильтра `feDropShadow` на каждый экземпляр изображения при тираже более 30 штук, оптимизировав нагрузку на GPU/композитор браузера.

## Phase 4: User Story 3 - Адаптивное масштабирование контейнера листа (Priority: P2)

- [x] **T009** [US3] В `src/styles.css`: исправить правила `.sheet-shadow-wrapper` и `.sheet-viewport-wrapper`, добавив `max-width: 100%`, `max-height: 100%` и адаптивный расчет под произвольные форматы (Letter, A4, рулоны 58 мм) (FR-007).
- [x] **T010** [US3] В `src/ui/controls.ts`: обновить связывание `previewContainer.style.aspectRatio` и ширины/высоты листа при смене форматов и ориентации.

## Phase 5: Verification & Acceptance

- [x] **T011** Запустить весь тестовый набор `npm test` и убедиться в 100% прохождении тестов.
- [x] **T012** Выполнить проверку `npm run build` (TypeScript typecheck + Vite build).
- [x] **T013** Провести сходимость с критериями приемки (Convergence Check).
