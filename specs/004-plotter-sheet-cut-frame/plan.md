# Архитектурный план: 004-plotter-sheet-cut-frame

## 1. Архитектура решения и ToT (Дерево мыслей)

### Гипотезы решения:
1. **Гипотеза 1 (Выбрана)**: Добавить `<rect id="SheetBorder" x="0" y="0" width="..." height="..." />` непосредственно внутрь группы `<g id="CutContour">` при активном флаге `includeSheetBorder` (по умолчанию `true`).
   - *Плюсы*: Easy Cut Studio видит единый слой резки, Bounding Box файла строго равен габаритам листа, $(0,0)$ привязывается к углу А4, плоттер режет стикеры и рамку листа в едином цикле.
   - *Минусы*: Нет.
2. **Гипотеза 2**: Вынести рамку листа в отдельную группу `<g id="SheetBorder">`.
   - *Минусы*: Некоторые версии плоттерных программ импортируют разные `<g>` как разные слои реза и требуют ручного назначения инструмента для каждого слоя.
3. **Гипотеза 3**: Заменить старый невидимый `<rect id="PageBoundary">` на видимый.
   - *Плюсы*: Простота.
   - *Минусы*: `PageBoundary` находился вне группы `CutContour`. Лучше разместить реальный контур реза `SheetBorder` внутри `CutContour`, а `PageBoundary` оставить как семантический опорный элемент.
4. **Гипотеза 4**: Ставить угловые кресты реза на краях листа вместо рамки.
   - *Минусы*: Плоттер не прорезает контур листа, оператор не видит физическую границу листа в окне предпросмотра ECS.
5. **Гипотеза 5**: Экспортировать два раздельных SVG файла (один со стикерами, второй с рамкой).
   - *Минусы*: Лишние клики, риск рассинхронизации координат.

---

## 2. Модули и затрагиваемые файлы

1. **`src/export/svgCutGenerator.ts`**:
   - Расширение интерфейса `SvgCutOptions` свойством `includeSheetBorder?: boolean` (default: `true`).
   - Внутри `generateStickerCutSvg`: если `includeSheetBorder` истинен, первым элементом внутри `<g id="CutContour">` генерировать:
     ```xml
     <rect id="SheetBorder" x="0" y="0" width="${pageWidthMm}" height="${pageHeightMm}" />
     ```
   - В `generateRegistrationTemplateSvg`: изменить линию листа с пунктирной на сплошную тонкую линию `stroke="#000000" stroke-width="0.25"` для непрерывного вычерчивания плоттерной ручкой.

2. **`src/state.ts`**:
   - Расширение `AppSettings` и `AppState` полем `cutSvgIncludeSheetBorder: boolean`.
   - В `DEFAULT_SETTINGS`: `cutSvgIncludeSheetBorder: true`.
   - Обновление сохранения/загрузки `LocalStorage`.

3. **`src/i18n.ts`**:
   - Добавление ключей:
     - `lblCutSvgIncludeSheetBorder`: RU: «Рамка листа (Sheet cut frame) в файле резки», EN: «Sheet cut frame in cut file».
     - `hintCutSvgIncludeSheetBorder`: RU: «Добавляет прорезаемый контур листа (0,0) для точной привязки в Easy Cut Studio», EN: «Adds a cut contour around the sheet for exact (0,0) alignment in Easy Cut Studio».

4. **`index.html`**:
   - В секции 5 («Полиграфия и резка») добавление чекбокса `#cutSvgIncludeSheetBorder` с дефолтным `checked`.

5. **`src/ui/controls.ts`**:
   - Привязка обработчика `#cutSvgIncludeSheetBorder` к `state.cutSvgIncludeSheetBorder`.
   - Передача `includeSheetBorder: Boolean(state.cutSvgIncludeSheetBorder)` в `generateStickerCutSvg`.

6. **Тесты**:
   - Обновление тестов в `src/export/svgCutGenerator.test.ts` для проверки `SheetBorder`.
