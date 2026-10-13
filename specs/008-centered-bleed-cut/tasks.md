# Задачи реализации: 008-centered-bleed-cut

## Фаза 1: Модель состояния и геометрия (Core Geometry)

- [x] **T001**: Добавить свойство `bleedCenterCut: boolean` в `AppSettings` и `DEFAULT_SETTINGS` в `src/state.ts`. Обеспечить сохранение и загрузку в `saveSettings` / `loadSettings`.
  - *Связанные требования*: FR-01
  - *Затронутые файлы*: `src/state.ts`
  - *Верификация*: Unit-тест хранилища `src/state.ts`.

- [x] **T002**: Реализовать функцию `getInnerArtBounds` в `src/layout/bleedGeometry.ts` для расчета смещения и размеров сжатого изображения стикера с защитным ограничением 40%.
  - *Связанные требования*: FR-02
  - *Затронутые файлы*: `src/layout/bleedGeometry.ts`
  - *Верификация*: Модульные тесты в `src/layout/bleedGeometry.test.ts` (номинал 50 мм, вылет 1 мм, вылет 2 мм, лимит для малых размеров).

## Фаза 2: Рендеринг интерактивного превью (Preview Engine)

- [x] **T003**: Обновить `src/preview/previewRenderer.ts`: при `bleedCenterCut = true` масштабировать `image` внутрь до `innerWidth x innerHeight` со смещением `(insetMm, insetMm)` и формой клипа `innerRadius`, сохраняя подложку `bleedColor` на внешнем вылете и линию реза строго по номиналу.
  - *Связанные требования*: FR-03, FR-04
  - *Затронутые файлы*: `src/preview/previewRenderer.ts`
  - *Верификация*: Модульный тест в `src/preview/previewRenderer.test.ts`.

## Фаза 3: Генераторы экспорта (PDF & PNG & SVG Cut)

- [x] **T004**: Обновить генерацию PDF в `src/pdf/pdfGenerator.ts`: при запекании растра на Canvas сжимать изображение на `insetMm` с клипом `innerRadius` и заливать подложку вылета до `outerRadius`. Проверить, что векторный контур реза `getStickerContourSvgPath` остаётся строго 1:1 по номинальному размеру стикера.
  - *Связанные требования*: FR-03, FR-05
  - *Затронутые файлы*: `src/pdf/pdfGenerator.ts`
  - *Верификация*: Модульный тест в `src/pdf/pdfGenerator.test.ts`.

- [x] **T005**: Обновить растровый экспорт в `src/export/pngGenerator.ts`: отрисовывать подложку вылета и сжатую область картинки с центрированием при включенном `bleedCenterCut`.
  - *Связанные требования*: FR-06
  - *Затронутые файлы*: `src/export/pngGenerator.ts`
  - *Верификация*: Модульный тест в `src/export/pngGenerator.test.ts`.

- [x] **T006**: Добавить проверочный тест в `src/export/svgCutGenerator.test.ts`, подтверждающий, что экспортный контур реза плоттера `CutContour` не зависит от состояния `bleedCenterCut` и имеет радиус $D/2$.
  - *Связанные требования*: FR-03
  - *Затронутые файлы*: `src/export/svgCutGenerator.test.ts`
  - *Верификация*: Запуск `npm run test -- src/export/svgCutGenerator.test.ts`.

## Фаза 4: Пользовательский интерфейс и локализация (UI & i18n)

- [x] **T007**: Добавить ключи переводов `lblBleedCenterCut` и `hintBleedCenterCut` в `src/i18n.ts` (русский и английский языки).
  - *Связанные требования*: FR-08
  - *Затронутые файлы*: `src/i18n.ts`, `src/i18n.test.ts`
  - *Верификация*: Модульный тест переводов `npm run test -- src/i18n.test.ts`.

- [x] **T008**: Добавить HTML-разметку чекбокса `#bleedCenterCut` с поясняющей подсказкой в `index.html` внутри блока настроек вылета.
  - *Связанные требования*: FR-07
  - *Затронутые файлы*: `index.html`
  - *Верификация*: Проверка разметки и атрибутов `data-i18n`.

- [x] **T009**: Связать чекбокс `#bleedCenterCut` с состоянием приложения в `src/ui/controls.ts` (слушатель события `change`, сохранение в `store`, переключение видимости в зависимости от `bleedMm > 0`).
  - *Связанные требования*: FR-07
  - *Затронутые файлы*: `src/ui/controls.ts`
  - *Верификация*: Проверка работы интерфейса и сборки `npm run build`.

## Фаза 5: Контрольная верификация и сходимость (Convergence & Verification)

- [x] **T010**: Запустить полный набор тестов проекта `npm run test` и проверку сборки `npm run build`. Убедиться в отсутствии регрессий и 100% прохождении тестов.
  - *Связанные требования*: AC-01 ... AC-05, NFR-01 ... NFR-03
  - *Затронутые файлы*: Весь проект
  - *Верификация*: `npm run test`, `npm run build`.
