# Список задач реализации: 007-pdf-cut-contour-underlay

## Задачи

- [x] **T001**: Изменить z-порядок отрисовки в `src/pdf/pdfGenerator.ts` — вызывать `page.drawSvgPath` с векторным контуром наклейки ДО `page.drawImage` растрового изображения в цикле `for (const pos of layout.positions)`.
  - Связь с требованиями: FR-01, FR-02
  - Файл: `src/pdf/pdfGenerator.ts`
  - Критерий: Векторный контур записывается в content stream под растром.

- [x] **T002**: Обновить модульные тесты в `src/pdf/pdfGenerator.test.ts` для проверки относительного порядка вызовов `drawSvgPath` и `drawImage`.
  - Связь с требованиями: FR-01, FR-03, AC-01
  - Файл: `src/pdf/pdfGenerator.test.ts`
  - Критерий: Тест фиксирует порядок [drawSvgPath -> drawImage].

- [x] **T003**: Провести полную валидацию кодовой базы через `npm run test` и `npm run build`.
  - Связь с требованиями: AC-04, NFR-01..NFR-03
  - Файлы: все тесты и сборка
  - Критерий: 19 test files pass, сборка без ошибок.
