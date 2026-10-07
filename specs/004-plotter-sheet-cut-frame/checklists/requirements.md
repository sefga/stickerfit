# Чек-лист требований: 004-plotter-sheet-cut-frame

- [x] CHK001: Интерфейс `SvgCutOptions` содержит поле `includeSheetBorder?: boolean` (значение по умолчанию: `true`).
- [x] CHK002: Внутри `<g id="CutContour">` генерируется элемент `<rect id="SheetBorder" x="0" y="0" width="..." height="..." />` при `includeSheetBorder: true`.
- [x] CHK003: При `includeSheetBorder: false` элемент `SheetBorder` не включается в контур резки.
- [x] CHK004: В `generateRegistrationTemplateSvg` рамка листа отрисовывается сплошной линией `stroke="#000000" stroke-width="0.25"` для плоттерной ручки.
- [x] CHK005: `AppSettings` содержит свойство `cutSvgIncludeSheetBorder: boolean` со значением по умолчанию `true`.
- [x] CHK006: Элемент интерфейса `#cutSvgIncludeSheetBorder` отображается в секции 5 страницы и синхронизирован со `state`.
- [x] CHK007: Локализации RU и EN корректно добавлены в `src/i18n.ts`.
- [x] CHK008: Набор unit-тестов проверяет включение и выключение рамки листа в SVG контуре.
- [x] CHK009: Полный прогон `npm test` успешен (120/120 тестов зеленые, 0 ошибок).
- [x] CHK010: Сборка `npm run build` успешна (TypeScript и Vite без ошибок).
