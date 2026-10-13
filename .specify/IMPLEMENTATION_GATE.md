# Implementation Gate: 008-centered-bleed-cut

## 1. Суть задачи и требования
Реализация режима **«Рез по середине защитного обода»** (`bleedCenterCut`) для компенсации механического люфта плоттерной резки без зарезания картинки и без появления белого края бумаги.
- Номинальный контур реза для плоттера: строго равен размеру, указанному пользователем ($D$).
- Внешний вылет: выступает наружу на $B$ мм (габарит $D + 2B$).
- Внутреннее сжатие: изображение пропорционально сжимается внутрь на $B$ мм (габарит $D - 2B$).
- Линия реза: проходит строго по середине цветного защитного пояса обода (`bleedColor`).
- Требования: **FR-01 ... FR-08**
- Критерии приемки: **AC-01 ... AC-05**

---

## 2. Разрешенные файлы (Scope Lock)
В соответствии со Scope Lock, изменять разрешено исключительно следующие файлы:
1. `src/state.ts`
2. `src/layout/bleedGeometry.ts`
3. `src/layout/bleedGeometry.test.ts`
4. `src/preview/previewRenderer.ts`
5. `src/preview/previewRenderer.test.ts`
6. `src/pdf/pdfGenerator.ts`
7. `src/pdf/pdfGenerator.test.ts`
8. `src/export/pngGenerator.ts`
9. `src/export/pngGenerator.test.ts`
10. `src/export/svgCutGenerator.test.ts`
11. `src/ui/controls.ts`
12. `index.html`
13. `src/i18n.ts`
14. `src/i18n.test.ts`
15. Документы спецификации в `specs/008-centered-bleed-cut/*`
16. Метаданные `.specify/*`

Любые изменения в других файлах заблокированы.

---

## 3. Перечень задач к исполнению
- **T001**: Состояние приложения: добавить `bleedCenterCut` в `state.ts`.
- **T002**: Геометрия: функция `getInnerArtBounds` в `bleedGeometry.ts` и unit-тесты.
- **T003**: Превью: масштабирование арта внутрь с подложкой вылета в `previewRenderer.ts`.
- **T004**: PDF: генерация векторного PDF с центрированным ободом в `pdfGenerator.ts`.
- **T005**: PNG: растровый экспорт высокого разрешения в `pngGenerator.ts`.
- **T006**: SVG Cut: тест фиксации контура реза $1:1$ в `svgCutGenerator.test.ts`.
- **T007**: Локализация: ключи в `i18n.ts` (ru/en) и тесты.
- **T008**: Разметка: чекбокс `#bleedCenterCut` в `index.html`.
- **T009**: Контроллер: биндинг событий в `controls.ts`.
- **T010**: Контрольная верификация: `npm run test` и `npm run build`.

---

## 4. План верификации (Quality Gates)
1. `npm run test` (все 19+ тест-сьютов vitest, включая новые тесты геометрии и рендеринга).
2. `npm run build` (компиляция TypeScript и сборка Vite без предупреждений и ошибок).
