# Гейт согласования реализации: Цветной внешний вылет под обрез (005-color-bleed-margin)

## 📌 Краткая суть задачи
Реализовать цветной внешний вылет под обрез (Bleed) фиксированной ширины 0..3 мм с однотонной заливкой выбранного цвета (#FFFFFF по умолчанию, выбор через color picker, HEX или пипетку с изображения) с полным сохранением исходного размера наклейки и макета, математической защитой от перекрытия соседних вылетов ($\text{effectiveGap} = \max(\text{gap}, 2b)$), единой геометрией в превью/PDF/PNG и сохранением чистого контура реза в SVG для плоттера.

---

## 🔒 Scope Lock (Разрешенные к изменению файлы)
1. `src/layout/bleedGeometry.ts` *(новый модуль геометрии)*
2. `src/layout/bleedGeometry.test.ts` *(новый юнит-тест)*
3. `src/layout/layoutEngine.ts`
4. `src/layout/layoutEngine.test.ts`
5. `src/state.ts`
6. `src/preview/previewRenderer.ts`
7. `src/preview/previewRenderer.test.ts`
8. `src/pdf/pdfGenerator.ts`
9. `src/pdf/pdfGenerator.test.ts`
10. `src/export/pngGenerator.ts`
11. `src/export/pngGenerator.test.ts`
12. `src/export/svgCutGenerator.ts`
13. `src/export/svgCutGenerator.test.ts`
14. `src/ui/eyedropper.ts` *(новый модуль пипетки)*
15. `src/ui/controls.ts`
16. `src/styles.css`
17. `src/i18n.ts`
18. `src/i18n.test.ts`
19. `index.html`
20. `tests/printCorrectness.test.ts`
21. `tests/thermalRollLength.test.ts`
22. `specs/005-color-bleed-margin/*`
23. `.specify/*`

---

## 📋 План задач реализации ($T001 \dots T012$)

| ID | Задача | Файлы | Требования |
|:---|:---|:---|:---|
| **T001** | Создание единого модуля геометрии вылета и тестов | `src/layout/bleedGeometry.ts`, `bleedGeometry.test.ts` | FR-001, FR-005, FR-010, NFR-002, AC-001, AC-008 |
| **T002** | Обновление `layoutEngine.ts` с учетом `bleedMm`, `effectiveGap`, полей и сетки | `src/layout/layoutEngine.ts`, `layoutEngine.test.ts` | FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, AC-002..005 |
| **T003** | Расширение состояния `src/state.ts` (bleedColor, валидация, localStorage) | `src/state.ts` | FR-003, FR-020, AC-010 |
| **T004** | Обновление Live Preview SVG реальным цветом с отделением линии реза | `src/preview/previewRenderer.ts` | FR-005, FR-008, FR-018, AC-001, AC-007, AC-008 |
| **T005** | Переработка генерации PDF 1:1 без растяжения картинки с векторным вылетом | `src/pdf/pdfGenerator.ts`, `pdfGenerator.test.ts` | FR-001, FR-004, FR-005, FR-018, NFR-004, AC-001, AC-011 |
| **T006** | Переработка генерации PNG 300 DPI без растяжения с цветным вылетом | `src/export/pngGenerator.ts`, `pngGenerator.test.ts` | FR-001, FR-004, FR-005, FR-018, AC-001, AC-011 |
| **T007** | Верификация плоттерного SVG (только исходные контуры реза без вылета) | `src/export/svgCutGenerator.ts`, `svgCutGenerator.test.ts` | FR-018, FR-019, AC-011 |
| **T008** | Модуль интерактивной пипетки (мышь + тач, лупа 8x, без системной зависимости) | `src/ui/eyedropper.ts` | FR-003, FR-006, FR-007, NFR-005, AC-009 |
| **T009** | Разметка и стили контролов цвета, HEX, пипетки и подсказок | `index.html`, `src/styles.css` | FR-003, FR-007, NFR-006 |
| **T010** | Интеграция контроллера `controls.ts` (события, effectiveGap, вместимость, блокировка) | `src/ui/controls.ts` | FR-003, FR-009, FR-014..017, FR-020, AC-003..006, AC-012 |
| **T011** | Локализация интерфейса и сообщений (RU / EN) | `src/i18n.ts`, `src/i18n.test.ts` | FR-021 |
| **T012** | Комплексная верификация всех AC-001..AC-013, регрессионные тесты и билд | Тесты и кодовая база | Все AC |

---

## 🧪 План верификации
1. `npm test` — прохождение всех существующих (120 тестов) и новых unit/integration тестов.
2. `npm run build` — чистая сборка TypeScript (`tsc`) и Vite.
3. Контроль каждого критерия приёмки AC-001..AC-013 со статусом PASS/FAIL/NOT VERIFIED и доказательствами.
