# Ворота утверждения реализации (Implementation Gate)

**Функциональность**: `006-pdf-clean-cut-contour`  
**Дата**: 2026-10-09  
**Статус**: Ожидает утверждения пользователя (AWAITING_HUMAN_APPROVAL)

---

## 1. Суть задачи и требования (Scope Lock)

- **Задача**: Устранить экспорт лишнего внешнего контура вылета и прямоугольных рамок в PDF при работе в Easy Cut Studio (Print & Cut). Запекать фоновый вылет в растр и выводить в PDF строго один чистый внутренний векторный контур реза 1:1.
- **Требования**:
  - **FR-001**: Запекание вылета и краевого фона (`edgeFillPath`) в растровый PNG на Canvas.
  - **FR-002, FR-003**: Полное исключение векторных путей разности вылета (`bleedDifferenceSvgPath`) и обтравочных масок `clipToBleed` из PDF.
  - **FR-004, FR-005**: Отрисовка чистого волосного контура реза (красный `#FF0000`, 0.1 мм hairline) строго по внутреннему обрису стикера 1:1.
  - **FR-006, FR-007, FR-008**: Опция `pdfIncludeCutContour` в состоянии, чекбокс в `index.html`, двуязычная локализация RU/EN.

---

## 2. Разрешенные к изменению файлы (Scope Manifest)

1. `src/state.ts`
2. `src/i18n.ts`
3. `src/pdf/pdfGenerator.ts`
4. `src/pdf/pdfGenerator.test.ts`
5. `src/ui/controls.ts`
6. `index.html`
7. `specs/006-pdf-clean-cut-contour/*`
8. `.specify/*`

---

## 3. Перечень задач реализации

- **T001**: Добавить `pdfIncludeCutContour: boolean` в `AppState` (`src/state.ts`).
- **T002**: Добавить ключи локализации в `src/i18n.ts`.
- **T003**: Модернизировать запекание вылета на Canvas в `src/pdf/pdfGenerator.ts`.
- **T004**: Удалить векторные вызовы `drawSvgPath(bleedPath)` и `clipToBleed` в `src/pdf/pdfGenerator.ts`.
- **T005**: Реализовать отрисовку чистого векторного контура реза 1:1 в `src/pdf/pdfGenerator.ts`.
- **T006**: Добавить чекбокс в `index.html`.
- **T007**: Подключить обработчик и синхронизацию состояния в `src/ui/controls.ts`.
- **T008**: Обеспечить поддержку всех форм (круг, скругление, прямоугольник) и Edge Cleanup.
- **T009**: Создать модульные тесты в `src/pdf/pdfGenerator.test.ts`.
- **T010**: Выполнить прогон тестов `npm run test`.
- **T011**: Выполнить сборку проекта `npm run build`.

---

## 4. План верификации

- `npm run test`: Прохождение всех 148+ тестов.
- `npm run build`: Сборка TypeScript и Vite с кодом возврата 0.
