# Задачи реализации: 004-plotter-sheet-cut-frame

- [x] **T001**: Расширение интерфейса `SvgCutOptions` и генерация `<rect id="SheetBorder" ...>` в `src/export/svgCutGenerator.ts`.
- [x] **T002**: Обновление рамки в `generateRegistrationTemplateSvg` на сплошную линию для плоттерной ручки.
- [x] **T003**: Добавление `cutSvgIncludeSheetBorder` в `src/state.ts` (по умолчанию `true`).
- [x] **T004**: Добавление чекбокса `#cutSvgIncludeSheetBorder` в `index.html` и обработчиков в `src/ui/controls.ts`.
- [x] **T005**: Добавление локализаций в `src/i18n.ts`.
- [x] **T006**: Обновление и добавление unit-тестов в `src/export/svgCutGenerator.test.ts`.
- [x] **T007**: Верификация: `npm test` (120/120 passing) и `npm run build` (exit 0).
- [x] **T008**: Формирование полиграфического руководства с параметрами для круглых стикеров 35.4 мм.
