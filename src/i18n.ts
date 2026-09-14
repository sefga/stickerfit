/**
 * Модуль интернационализации (i18n) для Генератора раскладки наклеек A4.
 * Поддерживает два языка: Русский (ru) и Английский (en).
 * Автоматически определяет язык по локали браузера и сохраняет выбор в localStorage.
 */

export type Language = 'ru' | 'en';

export const STORAGE_LANG_KEY = 'sticker_sheet_lang';

export const translations = {
  ru: {
    // Шапка и бренд
    brandName: 'StickerFit',
    appTitle: 'Раскладка наклеек A4',
    appSubtitle: 'Онлайн верстка и печать стикеров в миллиметрах',
    itemsBadge: '{count} шт.',
    btnGuide: 'Справка & FAQ',
    guideModalTitle: 'Справка & Руководство StickerFit',
    guideModalSub: 'Справочный центр и калькулятор',
    btnGuideDone: 'Понятно, вернуться к раскладке',
    btnGuideBack: '← Назад',
    btnGuideCloseAria: 'Закрыть окно справки',

    // Мобильные вкладки
    tabControls: 'Параметры',
    tabPreview: 'Превью листа',
    tabGuide: 'Справка',

    // Секция 1: Изображение
    secImageTitle: '1. Изображение стикера',
    dropZoneMain: 'Нажмите, чтобы выбрать фото',
    dropZoneSub: 'из галереи, камеры или перетащите файл',
    dropZoneTitle: 'Нажмите для выбора фото или перетащите файл',
    btnSelectImage: 'Выбрать изображение',
    btnOpenCrop: 'Обрезать',
    imgStatSource: 'Исходник:',
    imgStatCropped: 'Кадр:',
    imgStatAuto: 'Авто',

    // Единицы измерения
    lblUnitSystem: 'Система измерения',
    unitMm: 'мм',
    unitCm: 'см',
    unitIn: 'дюймы',

    // Секция 2: Размер стикера
    secSizeTitle: '2. Размер стикера',
    lblWidth: 'Ширина (мм)',
    lblHeight: 'Высота (мм)',
    lblWidthUnit: 'Ширина ({unit})',
    lblHeightUnit: 'Высота ({unit})',
    lblLockRatio: 'Связать пропорции (W : H)',
    hintLockRatioOn: 'Ширина и высота связаны пропорционально.',
    hintLockRatioOff: 'Ширина и высота независимы.',
    lblSizingMode: 'Режим заполнения стикера',
    lblSizingFill: 'Заполнить (обрезка)',
    lblSizingFit: 'Вписать целиком',
    titleSizingFill: 'Изображение заполняет стикер без белых рамок; лишние края кадрируются',
    titleSizingFit: 'Всё изображение видно целиком без обрезки; по краям могут появиться поля',
    explainSizingFill: '<strong>Заполнить (обрезка):</strong> Без белых полей, фото занимает всю площадь стикера.',
    explainSizingFit: '<strong>Вписать целиком:</strong> Полное изображение с сохранением пропорций, без обрезки деталей.',

    // Секция 3: Параметры листа
    secPageTitle: '3. Лист бумаги',
    lblPaperFormat: 'Формат бумаги',
    lblCustomPaperWidth: 'Ширина листа ({unit})',
    lblCustomPaperHeight: 'Высота листа ({unit})',
    lblRollLength: 'Длина ленты (мм)',
    lblRollLengthUnit: 'Длина ленты ({unit})',
    btnAutoRollLength: 'По наклейкам',
    titleAutoRollLength: 'Автоматически рассчитать длину ленты под высоту наклеек',
    tipRollContinuous: 'Непрерывная термобумага: настройте расстояние по длине в мм или нажмите кнопку "По наклейкам".',
    paperGroupIso: 'Международные (ISO 216)',
    paperGroupAnsi: 'Северная Америка (ANSI / US)',
    paperGroupThermal: 'Термопринтеры и этикетки (PeriPage, Niimbot, WB)',
    paperGroupPhoto: 'Фотобумага',
    paperGroupPhotoLabel: 'Этикетки и фото',
    paperGroupCustom: 'Пользовательский',
    paperChipA4: 'A4',
    paperChipThermal: 'Термо',
    paperChipLetter: 'Letter',
    paperChipCustom: 'Свой размер',
    paperChipOther: 'Другие размеры ▾',
    paperChipOtherTitle: 'Выбор размера бумаги или этикетки (58×40, рулоны, фото, A3, Letter)',
    lblOtherPaperFormats: 'Другой формат бумаги:',
    
    // Каталог форматов и размеров бумаги (дизайнерский селектор)
    catAll: 'Все размеры',
    catIso: 'Офис (ISO)',
    catAnsi: 'США (ANSI)',
    catThermal: 'Этикетки и рулоны',
    catPhoto: 'Фотобумага',
    catCustom: 'Свой размер',
    searchPaperPlaceholder: 'Поиск размера или формата (A4, 58×40, рулон, фото...)',
    searchNoResults: 'Ничего не найдено. Попробуйте другой поисковый запрос.',
    badgeRoll: 'Рулон',
    badgeSheet: 'Лист',
    badgePopular: 'Хит',
    badgeZeroMargins: 'Поля 0 мм',
    badgeStandardMargins: 'Поля 3–5 мм',
    paperCatalogTitle: 'Выбор размера и формата бумаги',
    paperCatalogSubtitle: '15 предустановленных стандартов для листовой, термо- и фотопечати',
    btnSelectPaperFormat: 'Выбрать',
    btnCloseCatalog: 'Готово',
    btnOpenCatalog: 'Все принтеры ▾',
    chipWb: 'WB 58×40',
    chipPeriPage: 'PeriPage',
    paperHintActive: 'Выбран стандарт: {name}. {details}',
    paperHintThermalZero: 'Автоматически установлены поля 0 мм для непрерывной печати в край рулона.',
    paperHintStandardMargins: 'Рекомендуемые поля 3–5 мм под ролики протяжки листа.',
    paperFmt_a4: 'A4 (210 × 297 мм)',
    paperFmt_a3: 'A3 (297 × 420 мм)',
    paperFmt_a5: 'A5 (148 × 210 мм)',
    paperFmt_a6: 'A6 (105 × 148 мм)',
    paperFmt_letter: 'US Letter (8.5 × 11" / 215.9 × 279.4 мм)',
    paperFmt_legal: 'US Legal (8.5 × 14" / 215.9 × 355.6 мм)',
    paperFmt_tabloid: 'US Tabloid (11 × 17" / 279.4 × 431.8 мм)',
    paperFmt_half_letter: 'Half Letter (5.5 × 8.5" / 139.7 × 215.9 мм)',
    paperFmt_peripage_57: 'PeriPage / Paperang (57 мм рулон)',
    paperFmt_roll_80: 'Терморулон 80 мм (чековый принтер / лента)',
    paperFmt_label_58x40: 'Термоэтикетка 58 × 40 мм (WB, Ozon, ценник)',
    paperFmt_label_50x30: 'Этикетка 50 × 30 мм (Niimbot, Phomemo)',
    paperFmt_label_4x6: '4 × 6" / 100 × 150 мм (Логистическая Ozon, WB, СДЭК)',
    paperFmt_photo_10x15: '10 × 15 см (Фото 100 × 150 мм)',
    paperFmt_custom: 'Пользовательский размер (Custom)',
    lblOrientation: 'Ориентация страницы',
    lblOrientPortrait: 'Книжная',
    lblOrientLandscape: 'Альбомная',
    lblMargins: 'Поля листа (Margins)',
    lblLinkMargins: 'Связать все поля',
    lblMarginTop: 'Верх (мм)',
    lblMarginBottom: 'Низ (мм)',
    lblMarginLeft: 'Лево (мм)',
    lblMarginRight: 'Право (мм)',
    lblMarginTopUnit: 'Верх ({unit})',
    lblMarginBottomUnit: 'Низ ({unit})',
    lblMarginLeftUnit: 'Лево ({unit})',
    lblMarginRightUnit: 'Право ({unit})',
    lblGaps: 'Расстояние между стикерами (Gap)',
    lblLinkGaps: 'Связать зазоры',
    lblGapX: 'По горизонтали (мм)',
    lblGapY: 'По вертикали (мм)',
    lblGapXUnit: 'По горизонтали ({unit})',
    lblGapYUnit: 'По вертикали ({unit})',
    warnPrintableArea: 'Поля меньше 3 мм ({min} мм): проверьте поддержку печати в край на вашем принтере.',
    tipPaperMargins: '<strong>Поля листа:</strong> Рекомендуемый отступ 3–5 мм под ролики протяжки принтера.',
    tipGaps: '<strong>Зазор:</strong> 0 мм — резка ножом встык; 2–4 мм — резка ножницами или плоттером.',

    // Секция 4: Раскладка
    secLayoutTitle: '4. Раскладка и сетка',
    lblAllowRotation: 'Автоповорот 90° для экономии листа',
    tipAutoRotate: 'Поворачивает стикеры, если с разворотом на лист помещается больше копий.',
    lblSpacingMode: 'Распределение отступов',
    optSpacingCenter: 'По центру',
    optSpacingStart: 'Точные поля',
    optSpacingJustify: 'Равномерно',
    tipSpacing: '«Точные поля» фиксируют заданные отступы от края листа; «Равномерно» выравнивает все зазоры.',
    lblCopies: 'Количество копий',
    placeholderCopies: 'AUTO или число',
    btnMaxCopies: 'Максимум',
    statStickersOnSheet: 'стикеров на листе',
    statGrid: 'Сетка:',
    statColsRows: '{cols} колонок × {rows} строк',
    statCapacity: 'Вместимость:',
    statRequested: '(задано: {req})',
    statStickerRotation: 'Ориентация стикера:',
    statRotated90: 'Повернут на 90°',
    statNoRotation: 'Без поворота (0°)',

    // Сообщения рекомендаций раскладки
    recBestRotated: 'Лучшее размещение: с поворотом 90° — {rot} шт. вместо {orig} шт.',
    recOptimalNoRotation: 'Оптимально без поворота: {orig} шт. (с поворотом — {rot} шт.)',
    recEqualCapacity: 'Одинаковая вместимость ({cap} шт.) в обоих вариантах.',
    recEnableRotation: 'С поворотом на 90° поместится больше: {rot} шт. вместо {orig} шт. Включите автоповорот.',
    recPlacedNoRotation: 'Размещение без поворота: {orig} шт.',
    errMarginsExceed: 'Поля превышают размер листа бумаги.',
    errStickerSizeZero: 'Размеры стикера должны быть больше 0.',
    errNoFit: 'Стикер не помещается в доступную область листа с текущими полями.',
    errSizeExceedsSheet: 'Размер {val} мм превышает длину листа ({max} мм).',
    errSizeExceedsSheetDynamic: 'Размер {val} {unit} превышает габариты листа ({max} {unit}).',
    errSizeExceedsUsable: 'Размер {val} мм не помещается в печатную область ({usable} мм) из-за полей.',
    errSizeTooSmall: 'Минимальный размер стикера — 5 мм.',
    errSizeTooSmallDynamic: 'Минимальный размер стикера — {min} {unit}.',

    // Секция 5: Полиграфия
    secPrintPrepTitle: '5. Полиграфия и резка',
    lblCutMarks: 'Метки реза (Cut marks)',
    lblBleed: 'Bleed (вылет)',
    optBleed0: '0 мм (без вылета)',
    optBleed1: '1 мм',
    optBleed2: '2 мм',
    optBleed3: '3 мм',

    // Секция 6: Экспорт и печать
    secExportTitle: '6. Экспорт и печать',
    lblPngDpi: 'Качество PNG',
    optPngDpi150: '150 DPI (Быстро)',
    optPngDpi300: '300 DPI ★',
    optPngDpi600: '600 DPI (Ultra)',
    tipPngDpi: '150 DPI — быстрый файл для веб; 300 DPI — стандарт типографии; 600 DPI — сверхчётко для мелких стикеров.',
    btnDownloadPdf: 'Скачать PDF для печати',
    btnDownloadPdfShort: 'Скачать PDF',
    btnDownloadPng: 'Скачать PNG ({dpi} DPI)',
    btnDownloadPngShort: 'Скачать PNG',
    btnPrintPdf: 'Печать',
    printNotice: '<strong>Масштаб печати:</strong> Установите масштаб <strong>100%</strong> (Реальный размер), чтобы не исказить размеры стикеров.',
    btnCalibrationPdf: 'Калибровочный тест принтера (1:1)',
    btnResetSettings: 'Сбросить настройки',

    // Зум и просмотр
    zoomIn: 'Приблизить',
    zoomOut: 'Отдалить',
    zoomReset: 'По размеру',

    // Превью зона
    previewLoading: 'Загрузка листа A4...',
    previewScale: 'Масштаб печати: 100%',
    chipSheet: 'Лист',
    chipSticker: 'Стикер',
    chipGrid: 'Сетка',
    chipMargins: 'Поля',
    chipGap: 'Зазор',
    previewMm: 'мм',
    previewStickerPlaceholder: '#{idx} ({w}×{h} мм)',

    // Мобильный стики-бар
    mobileGrid: 'Сетка: {cols}×{rows}',
    mobileDownload: 'Скачать PDF',

    // Модальное окно кадрирования
    cropModalTitle: 'Кадрирование стикера',
    cropModalRatio: 'Пропорции: {w} × {h} мм ({ratio})',
    cropBtnRotateLeftTitle: 'Повернуть влево на 90°',
    cropBtnRotateRightTitle: 'Повернуть вправо на 90°',
    cropBtnResetTitle: 'Сбросить кадрирование',
    cropBtnReset: 'Сброс',
    cropBtnCancel: 'Отмена',
    cropBtnApply: 'Применить',

    // Оценки качества DPI
    dpiExcellentTitle: 'Отличное качество',
    dpiExcellentDesc: 'Изображение имеет высокую четкость для полиграфии (≥300 DPI).',
    dpiAcceptableTitle: 'Допустимое качество',
    dpiAcceptableDesc: 'Изображение подходит для печати, но мелкий текст может быть слегка размыт (200-299 DPI).',
    dpiLowTitle: 'Низкое качество',
    dpiLowDesc: 'Возможна заметная потеря резкости деталей (150-199 DPI).',
    dpiWarningTitle: 'Внимание: очень низкое разрешение',
    dpiWarningDesc: 'Изображение будет пикселизированным при печати (<150 DPI). Рекомендуется использовать исходник большего размера.',

    // Алерт ошибок
    alertNoStickers: 'Нет стикеров для размещения на листе.',
    alertImageError: 'Ошибка загрузки изображения: {error}',

    // SEO & GEO Content Hub (Справочный центр и FAQ)
    hubHeroTitle: 'A4 Sticker Sheet Maker',
    hubHeroSubtitle: 'Загрузите стикер, укажите точные физические размеры в миллиметрах, и StickerFit автоматически заполнит лист А4 максимальным количеством копий. Экспортируйте макет для печати со 100% масштабом.',
    hubPrivacyBadge: '100% Конфиденциальность: Ваши изображения обрабатываются только в браузере и не покидают устройство',

    hubHowTitle: 'Как работает StickerFit',
    hubStep1Title: '1. Загрузите стикер',
    hubStep1Desc: 'Выберите изображение (PNG, JPG, WebP) из галереи, камеры или вставьте из буфера обмена.',
    hubStep2Title: '2. Укажите размеры (мм)',
    hubStep2Desc: 'Задайте ширину и высоту в миллиметрах. При необходимости используйте кадрирование и поворот.',
    hubStep3Title: '3. Авто-раскладка на А4',
    hubStep3Desc: 'Умный алгоритм рассчитает экономичную сетку и проверит автоповорот на 90° для максимума копий.',
    hubStep4Title: '4. Печать 1:1 в PDF',
    hubStep4Desc: 'Скачайте готовый векторный PDF с метками реза и вылетами Bleed. Печатайте в масштабе 100%.',

    hubCalcTitle: 'Сколько стикеров помещается на листе А4?',
    hubCalcDesc: 'Стандартный лист бумаги A4 имеет физический размер 210 × 297 мм. Алгоритм рассчитывает вместимость по формуле с учетом полей и зазоров:',
    hubFormulaCols: 'Колонки = ⌊(Ширина области + Зазор) / (Ширина стикера + Зазор)⌋',
    hubFormulaRows: 'Строки = ⌊(Высота области + Зазор) / (Высота стикера + Зазор)⌋',
    hubFormulaTotal: 'Всего стикеров = Колонки × Строки',

    hubSizesTitle: 'Таблица популярных размеров стикеров на А4',
    hubSizesColSize: 'Размер (мм)',
    hubSizesColUsage: 'Назначение',
    hubSizesColMax: 'Вместимость на А4',
    hubSize1Usage: 'Круглые пломбы, иконки, мини-стикеры',
    hubSize2Usage: 'Товарные логотипы, этикетки для упаковки',
    hubSize3Usage: 'Стандартные квадратные брендовые наклейки',
    hubSize4Usage: 'Размер банковской карты / визитки',
    hubSize5Usage: 'Транспортные и упаковочные наклейки',

    hubScaleTitle: 'Печать в масштабе 1:1: почему это критично',
    hubScaleDesc: 'Диалоги печати в браузерах часто по умолчанию включают режим «По размеру страницы» (Fit to Page), сжимая макет на 3–7% и искажая физические миллиметры. Всегда выбирайте масштаб «100%» или «Реальный размер» (Actual size).',

    // FAQ
    faqTitle: 'Часто задаваемые вопросы (FAQ)',
    hubFaqTitle: 'Часто задаваемые вопросы (FAQ)',
    faqQ1: 'Что такое StickerFit?',
    faqA1: 'StickerFit — это онлайн-инструмент раскладки и генератор PDF. Он автоматически размещает копии наклейки на листе по точным миллиметровым размерам с максимальной плотностью и подготавливает макет к печати.',
    faqQ2: 'Какой размер у стандартного листа A4?',
    faqA2: 'Международный стандарт A4 имеет размер ровно 210 × 297 мм (8.27 × 11.69 дюймов). StickerFit рассчитывает раскладку строго в этих физических границах.',
    faqQ3: 'Как напечатать наклейки в точный физический размер?',
    faqA3: 'В диалоге печати всегда выбирайте масштаб «100%» или «Реальный размер» (Actual size). Никогда не используйте «Подогнать под размер страницы». Вы также можете распечатать нашу калибровочную страницу для проверки принтера линейкой.',
    faqQ4: 'Какое разрешение должно быть у исходного изображения?',
    faqA4: 'Для четкой полиграфической печати рекомендуется разрешение не менее 300 DPI. Панель параметров автоматически рассчитывает эффективный DPI для заданного вами физического размера.',
    faqQ5: 'Умеет ли программа автоматически поворачивать стикеры для экономии бумаги?',
    faqA5: 'Да! При включенном «Автоповороте» алгоритм сравнивает ориентации 0° и 90° и автоматически выбирает вариант с максимальным количеством наклеек на листе.',
    faqQ6: 'Сохраняются ли мои изображения на сервере?',
    faqA6: 'Нет. Вся обработка, кадрирование и генерация PDF происходят на 100% локально в вашем браузере. Ваши файлы никогда не покидают устройство.',
    faqQ7: 'Поддерживаются ли карманные термопринтеры (PeriPage, Paperang, Niimbot) и этикетки маркетплейсов?',
    faqA7: 'Да! В выпадающем меню «Ещё ▾» доступны готовые пресеты для рулонов PeriPage 57 мм, термоэтикеток 58 × 40 мм (Wildberries, Ozon), Niimbot 50 × 30 мм и логистических 4 × 6". При выборе термопринтера поля автоматически сбрасываются в 0 мм для печати в край рулона.',
  },

  en: {
    // Header & Brand
    brandName: 'StickerFit',
    appTitle: 'A4 Sticker Sheet Maker',
    appSubtitle: 'Online sticker layout & print preparation in millimeters',
    itemsBadge: '{count} pcs',
    btnGuide: 'Guide & FAQ',
    guideModalTitle: 'StickerFit Guide & Documentation',
    guideModalSub: 'Help Center & Grid Calculator',
    btnGuideDone: 'Done, back to layout',
    btnGuideBack: '← Back',
    btnGuideCloseAria: 'Close help modal',

    // Mobile tabs
    tabControls: 'Settings',
    tabPreview: 'Sheet Preview',
    tabGuide: 'Guide',

    // Section 1: Image
    secImageTitle: '1. Sticker Image',
    dropZoneMain: 'Click to select photo',
    dropZoneSub: 'from gallery, camera or drag & drop file',
    dropZoneTitle: 'Click to select photo or drag and drop a file',
    btnSelectImage: 'Choose Image',
    btnOpenCrop: 'Crop',
    imgStatSource: 'Source:',
    imgStatCropped: 'Cropped:',
    imgStatAuto: 'Auto',

    // Units
    lblUnitSystem: 'Measurement Unit',
    unitMm: 'mm',
    unitCm: 'cm',
    unitIn: 'in',

    // Section 2: Sticker Size
    secSizeTitle: '2. Sticker Dimensions',
    lblWidth: 'Width (mm)',
    lblHeight: 'Height (mm)',
    lblWidthUnit: 'Width ({unit})',
    lblHeightUnit: 'Height ({unit})',
    lblLockRatio: 'Link aspect ratio (W : H)',
    hintLockRatioOn: 'Proportions linked: changing one dimension proportionally adjusts the other.',
    hintLockRatioOff: 'Independent dimensions: free to set any custom width and height.',
    lblSizingMode: 'Sticker fitting mode',
    lblSizingFill: 'Fill (Crop edges)',
    lblSizingFit: 'Fit (Whole image)',
    titleSizingFill: 'Image completely fills sticker area (excess edges are cropped)',
    titleSizingFit: 'Entire image fits inside sticker area (no cropping, borders may appear)',
    explainSizingFill: '<strong>Fill (Crop edges):</strong> Image covers 100% of sticker without white bars. Excess edges are cropped.',
    explainSizingFit: '<strong>Fit (Whole image):</strong> Entire image fits without cutting any details. Borders appear if aspect ratios differ.',

    // Section 3: Sheet Settings
    secPageTitle: '3. Paper Sheet',
    lblPaperFormat: 'Paper Standard',
    lblCustomPaperWidth: 'Sheet width ({unit})',
    lblCustomPaperHeight: 'Sheet height ({unit})',
    lblRollLength: 'Roll length (mm)',
    lblRollLengthUnit: 'Roll length ({unit})',
    btnAutoRollLength: 'Fit to stickers',
    titleAutoRollLength: 'Automatically calculate minimum roll length to fit stickers',
    tipRollContinuous: 'Continuous roll: set custom length in mm or click "Fit to stickers".',
    paperGroupIso: 'International (ISO 216)',
    paperGroupAnsi: 'North America (ANSI / US)',
    paperGroupThermal: 'Thermal Printers & Labels (PeriPage, Niimbot, WB)',
    paperGroupPhoto: 'Photo Paper',
    paperGroupPhotoLabel: 'Labels & Photo',
    paperGroupCustom: 'Custom Size',
    paperChipA4: 'A4',
    paperChipThermal: 'Thermal',
    paperChipLetter: 'Letter',
    paperChipCustom: 'Custom Size',
    paperChipOther: 'Other Sizes ▾',
    paperChipOtherTitle: 'Select paper or label size (58×40, rolls, photo, A3, Letter)',
    lblOtherPaperFormats: 'Other paper standard:',

    // Paper & Media Size Catalog (Designer selector)
    catAll: 'All Sizes',
    catIso: 'Office (ISO)',
    catAnsi: 'US (ANSI)',
    catThermal: 'Labels & Rolls',
    catPhoto: 'Photo Paper',
    catCustom: 'Custom Size',
    searchPaperPlaceholder: 'Search size or format (A4, 58×40, roll, photo...)',
    searchNoResults: 'No matching formats found. Try another search query.',
    badgeRoll: 'Roll',
    badgeSheet: 'Sheet',
    badgePopular: 'Popular',
    badgeZeroMargins: '0 mm margins',
    badgeStandardMargins: '3–5 mm margins',
    paperCatalogTitle: 'Select Paper & Media Size',
    paperCatalogSubtitle: '15 presets for sheet, thermal and photo printing',
    btnSelectPaperFormat: 'Select',
    btnCloseCatalog: 'Done',
    btnOpenCatalog: 'All printers ▾',
    chipWb: 'WB 58×40',
    chipPeriPage: 'PeriPage',
    paperHintActive: 'Selected preset: {name}. {details}',
    paperHintThermalZero: 'Margins automatically set to 0 mm for borderless roll printing.',
    paperHintStandardMargins: 'Standard 3–5 mm margins recommended for feed rollers.',
    paperFmt_a4: 'A4 (210 × 297 mm)',
    paperFmt_a3: 'A3 (297 × 420 мм)',
    paperFmt_a5: 'A5 (148 × 210 мм)',
    paperFmt_a6: 'A6 (105 × 148 мм)',
    paperFmt_letter: 'US Letter (8.5 × 11" / 215.9 × 279.4 mm)',
    paperFmt_legal: 'US Legal (8.5 × 14" / 215.9 × 355.6 mm)',
    paperFmt_tabloid: 'US Tabloid (11 × 17" / 279.4 × 431.8 mm)',
    paperFmt_half_letter: 'Half Letter (5.5 × 8.5" / 139.7 × 215.9 mm)',
    paperFmt_peripage_57: 'PeriPage / Paperang (57 mm roll)',
    paperFmt_roll_80: '80 mm Thermal Roll (POS / receipt / label)',
    paperFmt_label_58x40: 'Thermal Label 58 × 40 mm (WB, Ozon, price tag)',
    paperFmt_label_50x30: 'Label 50 × 30 mm (Niimbot, Phomemo)',
    paperFmt_label_4x6: '4 × 6" / 100 × 150 mm (Shipping label WB, Ozon)',
    paperFmt_photo_10x15: '10 × 15 cm (Photo 100 × 150 mm)',
    paperFmt_custom: 'Custom Sheet Dimensions',
    lblOrientation: 'Page orientation',
    lblOrientPortrait: 'Portrait',
    lblOrientLandscape: 'Landscape',
    lblMargins: 'Sheet Margins',
    lblLinkMargins: 'Link all margins',
    lblMarginTop: 'Top (mm)',
    lblMarginBottom: 'Bottom (mm)',
    lblMarginLeft: 'Left (mm)',
    lblMarginRight: 'Right (mm)',
    lblMarginTopUnit: 'Top ({unit})',
    lblMarginBottomUnit: 'Bottom ({unit})',
    lblMarginLeftUnit: 'Left ({unit})',
    lblMarginRightUnit: 'Right ({unit})',
    lblGaps: 'Gap between stickers',
    lblLinkGaps: 'Link gaps',
    lblGapX: 'Horizontal (mm)',
    lblGapY: 'Vertical (mm)',
    lblGapXUnit: 'Horizontal ({unit})',
    lblGapYUnit: 'Vertical ({unit})',
    warnPrintableArea: 'Margins less than 3 mm ({min} mm): verify borderless printing capability.',
    tipPaperMargins: '<strong>Sheet Margins:</strong> 3–5 mm recommended for standard printer roller feed.',
    tipGaps: '<strong>Gap:</strong> 0 mm for fast knife cuts; 2–4 mm for scissors or plotter cuts.',

    // Section 4: Layout & Grid
    secLayoutTitle: '4. Layout & Grid',
    lblAllowRotation: 'Auto-rotate 90° for optimal sheet economy',
    tipAutoRotate: 'Rotates stickers if 90° orientation yields more copies.',
    lblSpacingMode: 'Spacing distribution',
    optSpacingCenter: 'Centered',
    optSpacingStart: 'Strict margins',
    optSpacingJustify: 'Justified',
    tipSpacing: '«Strict margins» keeps sheet margins exact; «Justified» spreads remaining paper space evenly.',
    lblCopies: 'Number of copies',
    placeholderCopies: 'AUTO or number',
    btnMaxCopies: 'Maximum',
    statStickersOnSheet: 'stickers on sheet',
    statGrid: 'Grid:',
    statColsRows: '{cols} columns × {rows} rows',
    statCapacity: 'Capacity:',
    statRequested: '(requested: {req})',
    statStickerRotation: 'Sticker rotation:',
    statRotated90: 'Rotated 90°',
    statNoRotation: 'No rotation (0°)',

    // Layout recommendation messages
    recBestRotated: 'Best fit: 90° rotation — {rot} pcs instead of {orig} pcs.',
    recOptimalNoRotation: 'Optimal without rotation: {orig} pcs (with rotation — {rot} pcs).',
    recEqualCapacity: 'Equal capacity ({cap} pcs) in both orientations.',
    recEnableRotation: 'With 90° rotation more stickers fit: {rot} pcs instead of {orig} pcs. Enable auto-rotate.',
    recPlacedNoRotation: 'Layout without rotation: {orig} pcs.',
    errMarginsExceed: 'Margins exceed paper sheet dimensions.',
    errStickerSizeZero: 'Sticker dimensions must be greater than 0.',
    errNoFit: 'Sticker does not fit into printable area with current margins.',
    errSizeExceedsSheet: 'Size {val} mm exceeds sheet dimension ({max} mm).',
    errSizeExceedsSheetDynamic: 'Size {val} {unit} exceeds sheet dimensions ({max} {unit}).',
    errSizeExceedsUsable: 'Size {val} mm exceeds printable area ({usable} mm).',
    errSizeTooSmall: 'Minimum sticker size is 5 mm.',
    errSizeTooSmallDynamic: 'Minimum sticker size is {min} {unit}.',

    // Section 5: Printing & Cutting
    secPrintPrepTitle: '5. Printing & Cutting',
    lblCutMarks: 'Cut marks',
    lblBleed: 'Bleed margin',
    optBleed0: '0 mm (no bleed)',
    optBleed1: '1 mm',
    optBleed2: '2 mm',
    optBleed3: '3 mm',

    // Section 6: Export & Print
    secExportTitle: '6. Export & Print',
    lblPngDpi: 'PNG Quality',
    optPngDpi150: '150 DPI (Fast)',
    optPngDpi300: '300 DPI ★',
    optPngDpi600: '600 DPI (Ultra)',
    tipPngDpi: '150 DPI for drafts/web; 300 DPI is print standard; 600 DPI is ultra-sharp for tiny labels.',
    btnDownloadPdf: 'Download Print-Ready PDF',
    btnDownloadPdfShort: 'Download PDF',
    btnDownloadPng: 'Download PNG ({dpi} DPI)',
    btnDownloadPngShort: 'Download PNG',
    btnPrintPdf: 'Print',
    printNotice: '<strong>Print Scale:</strong> Always set scale to <strong>100%</strong> (Actual size) in your printer dialog.',
    btnCalibrationPdf: 'Printer Calibration Test (1:1)',
    btnResetSettings: 'Reset Settings',

    // Zoom & view
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Fit to screen',

    // Preview area
    previewLoading: 'Loading A4 sheet...',
    previewScale: 'Print scale: 100%',
    chipSheet: 'Sheet',
    chipSticker: 'Sticker',
    chipGrid: 'Grid',
    chipMargins: 'Margins',
    chipGap: 'Gap',
    previewMm: 'mm',
    previewStickerPlaceholder: '#{idx} ({w}×{h} mm)',

    // Mobile sticky bar
    mobileGrid: 'Grid: {cols}×{rows}',
    mobileDownload: 'Download PDF',

    // Crop dialog
    cropModalTitle: 'Crop Sticker',
    cropModalRatio: 'Aspect Ratio: {w} × {h} mm ({ratio})',
    cropBtnRotateLeftTitle: 'Rotate 90° left',
    cropBtnRotateRightTitle: 'Rotate 90° right',
    cropBtnResetTitle: 'Reset crop',
    cropBtnReset: 'Reset',
    cropBtnCancel: 'Cancel',
    cropBtnApply: 'Apply',

    // DPI grades
    dpiExcellentTitle: 'Excellent Quality',
    dpiExcellentDesc: 'Image has high print clarity for professional printing (≥300 DPI).',
    dpiAcceptableTitle: 'Good Quality',
    dpiAcceptableDesc: 'Suitable for printing, though very small text may appear slightly soft (200-299 DPI).',
    dpiLowTitle: 'Low Quality',
    dpiLowDesc: 'Noticeable loss of sharpness and detail may occur (150-199 DPI).',
    dpiWarningTitle: 'Warning: Very Low Resolution',
    dpiWarningDesc: 'Image will appear pixelated when printed (<150 DPI). A higher-resolution original is recommended.',

    // Alerts
    alertNoStickers: 'No stickers to place on the sheet.',
    alertImageError: 'Image loading error: {error}',

    // SEO & GEO Content Hub (Documentation & FAQ)
    hubHeroTitle: 'A4 Sticker Sheet Maker',
    hubHeroSubtitle: 'Upload a sticker, enter its exact dimensions, and StickerFit automatically fills an A4 sheet with the maximum number of copies. Export a print-ready layout without changing the sticker dimensions.',
    hubPrivacyBadge: '100% Client-Side Privacy: Your images are processed entirely in your browser and never leave your device',

    hubHowTitle: 'How StickerFit Works',
    hubStep1Title: '1. Upload Sticker',
    hubStep1Desc: 'Select any sticker image (PNG, JPG, WebP) from your files, camera or paste directly from clipboard.',
    hubStep2Title: '2. Set Exact Dimensions',
    hubStep2Desc: 'Enter target width and height in millimeters (mm). Crop, rotate or lock aspect ratio as required.',
    hubStep3Title: '3. Auto-Fit on A4 Sheet',
    hubStep3Desc: 'The smart layout engine calculates optimal grid rows/columns and tests 90° rotation to maximize sheet capacity.',
    hubStep4Title: '4. Print 1:1 Vector PDF',
    hubStep4Desc: 'Download your print-ready vector PDF with optional cut marks and bleed margins. Always print at 100% scale.',

    hubCalcTitle: 'How Many Stickers Fit on an A4 Sheet?',
    hubCalcDesc: 'Standard international A4 paper measures 210 × 297 mm. The formula calculates total copies based on margins and gaps:',
    hubFormulaCols: 'Columns = ⌊(Usable Width + Gap) / (Sticker Width + Gap)⌋',
    hubFormulaRows: 'Rows = ⌊(Usable Height + Gap) / (Sticker Height + Gap)⌋',
    hubFormulaTotal: 'Total Stickers = Columns × Rows',

    hubSizesTitle: 'Popular Sticker Sizes Reference on A4',
    hubSizesColSize: 'Size (mm)',
    hubSizesColUsage: 'Recommended Use',
    hubSizesColMax: 'Max Copies on A4',
    hubSize1Usage: 'Small circular seals, icons, journal stickers',
    hubSize2Usage: 'Product logo labels, packaging seals',
    hubSize3Usage: 'Standard square branding stickers',
    hubSize4Usage: 'Credit card / ID badge / business card size',
    hubSize5Usage: 'Shipping labels, large package stickers',

    hubScaleTitle: 'Print at Exact 1:1 Scale: Why 100% Matters',
    hubScaleDesc: 'Desktop and mobile print dialogs often default to "Fit to Page" or "Shrink to Fit". This shrinks your document by 3–7%, distorting the physical millimeters. Always ensure "100%" or "Actual Size" is selected in your printer settings.',

    hubFaqTitle: 'Frequently Asked Questions (FAQ)',
    faqQ1: 'What is StickerFit?',
    faqA1: 'StickerFit is an online sticker sheet layout tool and PDF generator. It automatically arranges copies of a sticker on an A4 page using exact physical millimeter dimensions and prepares the layout for printing.',
    faqQ2: 'What size is an A4 sticker sheet?',
    faqA2: 'International standard A4 paper measures exactly 210 × 297 mm (8.27 × 11.69 inches). StickerFit computes placement using these exact physical boundaries.',
    faqQ3: 'How do I ensure stickers print at their exact physical size?',
    faqA3: 'Always choose "100%" or "Actual Size" in your print dialog. Never use "Fit to Page". You can also print our calibration test page to verify printer geometry with a physical ruler.',
    faqQ4: 'What resolution should my sticker artwork have?',
    faqA4: 'For sharp, professional results, use artwork with at least 300 DPI. StickerFit dynamically calculates the effective DPI for your chosen dimensions and warns you if the resolution is too low.',
    faqQ5: 'Can StickerFit auto-rotate stickers to fit more copies?',
    faqA5: 'Yes! When "Auto-rotate" is enabled, StickerFit compares both 0° and 90° orientations and automatically chooses whichever packs more stickers onto the sheet.',
    faqQ6: 'Are my uploaded images saved or sent to any server?',
    faqA6: 'No. All image processing, cropping, and PDF layout rendering take place 100% locally in your web browser. Your artwork and images never leave your device. StickerFit uses minimal, privacy-friendly anonymous product analytics (counting pageviews and successful exports) without cookies and without collecting your files or personal data.',
    faqQ7: 'Does StickerFit support portable thermal printers (PeriPage, Niimbot, Phomemo) and barcode labels?',
    faqA7: 'Yes! In the "More ▾" menu you will find presets for PeriPage 57 mm rolls, 58 × 40 mm thermal barcode labels (Wildberries, Ozon), Niimbot 50 × 30 mm, and 4 × 6" shipping labels. Selecting a thermal preset automatically resets margins to 0 mm for borderless roll printing.',
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

type LanguageChangeListener = (lang: Language) => void;
const listeners: Set<LanguageChangeListener> = new Set();

function getSafeStorage(): { getItem(key: string): string | null; setItem(key: string, value: string): void } | null {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // игнорируем
  }
  return null;
}

/**
 * Определение исходного языка приложения:
 * 1. Явный URL-параметр (?lang=ru или ?lang=en)
 * 2. Сохраненный выбор в localStorage ('ru' или 'en')
 * 3. Язык браузера/системы устройства (navigator.languages / navigator.language)
 */
export function detectInitialLanguage(): Language {
  // 1. Приоритет: явный URL параметр
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang')?.toLowerCase();
      if (urlLang === 'ru' || urlLang === 'en') {
        const storage = getSafeStorage();
        storage?.setItem(STORAGE_LANG_KEY, urlLang);
        return urlLang;
      }
    } catch {
      // игнорируем
    }
  }

  // 2. Приоритет: сохраненный выбор в localStorage
  const storage = getSafeStorage();
  if (storage) {
    try {
      const saved = storage.getItem(STORAGE_LANG_KEY);
      if (saved === 'ru' || saved === 'en') {
        return saved;
      }
    } catch {
      // игнорируем
    }
  }

  // 3. Приоритет: предпочтительные языки браузера/системы пользователя
  if (typeof navigator !== 'undefined') {
    const langs: readonly string[] = navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || (navigator as any).userLanguage || 'en'];

    for (const rawLang of langs) {
      if (!rawLang) continue;
      const l = rawLang.toLowerCase();
      // Если язык русский, белорусский, украинский или казахский — включаем русскую локаль
      if (l.startsWith('ru') || l.startsWith('be') || l.startsWith('uk') || l.startsWith('kk')) {
        return 'ru';
      }
    }
  }

  // Для всех остальных стран по умолчанию английский
  return 'en';
}

let currentLanguage: Language = detectInitialLanguage();

// Первоначальная синхронизация lang у <html> при загрузке страницы
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = currentLanguage;
}

// Автоматическая реакция на смену языка в настройках системы/браузера
if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    const storage = getSafeStorage();
    // Если пользователь вручную не зафиксировал выбор в localStorage, мгновенно адаптируем язык под систему
    if (!storage?.getItem(STORAGE_LANG_KEY)) {
      setLanguage(detectInitialLanguage());
    }
  });
}

/**
 * Получение текущего активного языка
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Установка активного языка с сохранением в localStorage и оповещением подписчиков
 */
export function setLanguage(lang: Language): void {
  if (lang !== 'ru' && lang !== 'en') return;
  currentLanguage = lang;

  const storage = getSafeStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_LANG_KEY, lang);
    } catch {
      // игнорируем
    }
  }

  // Обновляем атрибут lang у html для доступности и поисковых систем
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang;
  }

  // Применяем переводы ко всем элементам с атрибутами data-i18n
  if (typeof document !== 'undefined') {
    applyTranslations();
  }

  // Оповещаем подписчиков
  listeners.forEach((fn) => fn(lang));
}

/**
 * Подписка на изменение языка
 */
export function onLanguageChange(fn: LanguageChangeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Получение переведенной строки по ключу с интерполяцией параметров {param}
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = translations[currentLanguage] || translations.ru;
  let text = (dict as any)[key] || (translations.ru as any)[key] || key;

  if (params) {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
    });
  }

  return text;
}

/**
 * Автоматический обход DOM-дерева и замена текстового содержимого,
 * плейсхолдеров и подсказок (title) на основе data-атрибутов:
 * - [data-i18n="key"] -> textContent / innerHTML
 * - [data-i18n-placeholder="key"] -> placeholder
 * - [data-i18n-title="key"] -> title
 */
export function applyTranslations(root: any = typeof document !== 'undefined' ? document : null): void {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = currentLanguage;
  }

  // 1. Текстовое содержимое
  const textElements = root.querySelectorAll('[data-i18n]');
  textElements.forEach((el: any) => {
    const key = el.getAttribute('data-i18n') as TranslationKey;
    if (key) {
      const translated = t(key);
      if (translated.includes('<') && translated.includes('>')) {
        el.innerHTML = translated;
      } else {
        el.textContent = translated;
      }
    }
  });

  // 2. Плейсхолдеры для инпутов
  const placeholderElements = root.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach((el: any) => {
    const key = el.getAttribute('data-i18n-placeholder') as TranslationKey;
    if (key) {
      el.placeholder = t(key);
    }
  });

  // 3. Подсказки title
  const titleElements = root.querySelectorAll('[data-i18n-title]');
  titleElements.forEach((el: any) => {
    const key = el.getAttribute('data-i18n-title') as TranslationKey;
    if (key) {
      el.title = t(key);
    }
  });

  // 4. Лейблы optgroup и других элементов с атрибутом label
  const labelElements = root.querySelectorAll('[data-i18n-label]');
  labelElements.forEach((el: any) => {
    const key = el.getAttribute('data-i18n-label') as TranslationKey;
    if (key) {
      el.label = t(key);
    }
  });

  // 5. Доступность aria-label
  const ariaElements = root.querySelectorAll('[data-i18n-aria-label]');
  ariaElements.forEach((el: any) => {
    const key = el.getAttribute('data-i18n-aria-label') as TranslationKey;
    if (key) {
      el.setAttribute('aria-label', t(key));
    }
  });

  // 6. Синхронизация состояния кнопок переключателя в шапке
  if (typeof document !== 'undefined') {
    const btnRu = document.getElementById('btnLangRu');
    const btnEn = document.getElementById('btnLangEn');
    if (btnRu && btnEn) {
      if (currentLanguage === 'ru') {
        btnRu.classList.add('active');
        btnEn.classList.remove('active');
      } else {
        btnEn.classList.add('active');
        btnRu.classList.remove('active');
      }
    }
  }
}
