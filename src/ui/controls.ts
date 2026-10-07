import { store, AppState, PageOrientation, PngDpi, StickerShape } from '../state';
import { calculateLayout, LayoutResult, SpacingMode } from '../layout/layoutEngine';
import { loadSourceImage, extractImageFromClipboard, isSupportedImageType } from '../image/imageLoader';
import { renderCroppedArtwork, CropData } from '../image/cropEngine';
import { getDpiInfo } from '../image/dpiCalculator';
import { cropDialog } from './cropDialog';
import { generateStickerSheetPdf, downloadPdfBlob, openPdfForPrint } from '../pdf/pdfGenerator';
import { generateStickerSheetPng, downloadPngBlob } from '../export/pngGenerator';
import { generateStickerCutSvg, downloadCutSvgBlob, generateRegistrationTemplateSvg } from '../export/svgCutGenerator';
import { ZoomController } from '../preview/zoomController';
import { createCalibrationPdf } from '../pdf/calibrationPage';
import { renderPreviewSvg } from '../preview/previewRenderer';
import { roundMm } from '../units/mm';
import { Unit, toMm, fromMm, formatUnitValue, getUnitSymbol } from '../units/units';
import { PAPER_FORMATS, getPaperFormat, getAppTitleForFormat, isThermalPaperFormat } from '../units/paperFormats';
import { setLanguage, t, applyTranslations, onLanguageChange, TranslationKey } from '../i18n';
import { trackEvent } from '../analytics';
import {
  fitDimensionsToPhotoRatio,
  getSimplifiedAspectRatio,
  calculateHeightFromWidth,
  calculateWidthFromHeight,
} from '../image/aspectRatio';

export class UIController {
  private currentLayout: LayoutResult | null = null;
  private isProcessingImage: boolean = false;
  private hasPendingArtworkRecalculation: boolean = false;
  private currentBlobUrl: string | null = null;
  private isPhotoRatioActive: boolean = false;
  private zoomController: ZoomController | null = null;
  private activeCatalogCategory: string = 'all';
  private catalogSearchQuery: string = '';
  private lastThermalFormatId: string = 'peripage_57';
  private lastArtworkCache: {
    imageSrc: string;
    cropJson: string;
    sizingMode: string;
    aspectRatio: number;
    sheetRotation: number;
  } | null = null;

  constructor() {
    this.initEventListeners();
    this.initLanguageSwitch();
    this.updateUnitLabels();
    applyTranslations();
    onLanguageChange(() => {
      const state = store.getState();
      this.updateAppHeaderTitle(state.paperFormatId);
      this.updateLockRatioHint(state.lockAspectRatio);
      this.updateSizingExplanation(state.sizingMode);
      this.updateUnitLabels(state.unit);
      this.validateStickerDimensions();
      this.render(state);
    });
    store.subscribe((state) => this.render(state));
  }

  /**
   * Привязка "умного" обработчика к числовому инпуту:
   * 1. Во время набора (событие input) не производит тяжелых расчетов,
   *    а ждет паузы в наборе (debounce 450 мс).
   * 2. При явном завершении ввода (blur, change, Enter) сразу коммитит без ожидания.
   * 3. Поддерживает запятую как десятичный разделитель на мобильных клавиатурах.
   * 4. Защищает от пустых или микро-значений (не крашит макет).
   * 5. По клавише Enter вызывает blur(), скрывая мобильную экранную клавиатуру.
   */
  private bindSmartNumberInput(
    input: HTMLInputElement | null,
    options: {
      min?: number;
      max?: number;
      getFallback: () => number;
      onCommit: (val: number) => void | Promise<void>;
      debounceMs?: number;
      onInput?: (parsed: number | null, raw: string) => void;
    }
  ) {
    if (!input) return;

    const { min = 0, max = 1000, getFallback, onCommit, debounceMs = 450, onInput } = options;
    let timer: any = null;

    const parseVal = (raw: string): number | null => {
      const sanitized = raw.trim().replace(',', '.');
      if (sanitized === '' || sanitized === '-' || sanitized === '.') return null;
      const num = parseFloat(sanitized);
      return isNaN(num) ? null : num;
    };

    const commit = async (forceValid = false) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      const parsed = parseVal(input.value);
      let finalVal: number;

      if (parsed === null) {
        if (forceValid) {
          finalVal = getFallback();
          input.value = finalVal.toString();
        } else {
          return; // пользователь в процессе набора
        }
      } else {
        finalVal = parsed;
        if (min !== undefined && finalVal < min) finalVal = min;
        if (max !== undefined && finalVal > max) finalVal = max;
        if (forceValid) {
          input.value = finalVal.toString();
        }
      }

      if (onInput) {
        onInput(finalVal, input.value);
      }

      await onCommit(finalVal);
    };

    input.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      const parsed = parseVal(input.value);
      if (onInput) {
        onInput(parsed, input.value);
      }
      // Если значение валидно и не меньше допустимого порога, взводим таймер
      if (parsed !== null && parsed >= (min || 0)) {
        timer = setTimeout(() => commit(false), debounceMs);
      }
    });

    input.addEventListener('change', () => commit(true));
    input.addEventListener('blur', () => commit(true));

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit(true);
        input.blur(); // Скрывает экранную клавиатуру на мобильном
      }
    });
  }

  /**
   * Инициализация переключателя языков RU | EN
   */
  private initLanguageSwitch() {
    const btnRu = document.getElementById('btnLangRu');
    const btnEn = document.getElementById('btnLangEn');

    btnRu?.addEventListener('click', () => {
      setLanguage('ru');
    });

    btnEn?.addEventListener('click', () => {
      setLanguage('en');
    });
  }

  /**
   * Инициализация всех обработчиков событий формы и кнопок
   */
  private initEventListeners() {
    // 1. Загрузка файла (File Input, Label & Drag-and-Drop)
    const fileInput = document.getElementById('imageFileInput') as HTMLInputElement;
    const dropZone = document.getElementById('imageDropZone') as HTMLElement;
    const btnSelect = document.getElementById('btnSelectImage') as HTMLElement;
    const btnCrop = document.getElementById('btnOpenCrop') as HTMLButtonElement;

    // Клавиатурная доступность для семантических label (Enter / Пробел)
    [btnSelect, dropZone].forEach((elem) => {
      elem?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput?.click();
        }
      });
    });

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (file) await this.handleNewImage(file);
      fileInput.value = '';
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone?.addEventListener('drop', async (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && isSupportedImageType(file)) {
        await this.handleNewImage(file);
      }
    });

    // Вставка из буфера обмена (Ctrl+V / Paste)
    window.addEventListener('paste', async (e: ClipboardEvent) => {
      const file = extractImageFromClipboard(e);
      if (file) {
        await this.handleNewImage(file);
      }
    });

    // Кнопка вызова кадрирования
    btnCrop?.addEventListener('click', () => {
      const state = store.getState();
      if (!state.loadedImage) return;

      cropDialog.open({
        imageSrc: state.loadedImage.dataUrl,
        targetWidthMm: state.stickerWidthMm,
        targetHeightMm: state.stickerHeightMm,
        initialCropData: state.cropData,
        onApply: async (cropData: CropData) => {
          this.lastArtworkCache = null;
          store.update({ cropData });
          await this.recalculateArtwork();
        },
        onCancel: () => {},
      });
    });

    // 1.1 Переключение единиц измерения (мм / см / дюймы)
    const btnMm = document.getElementById('btnUnitMm');
    const btnCm = document.getElementById('btnUnitCm');
    const btnIn = document.getElementById('btnUnitIn');

    const handleUnitSwitch = (newUnit: Unit) => {
      store.update({ unit: newUnit });
      this.updateUnitLabels(newUnit);
      this.syncFormValues(store.getState());
    };

    btnMm?.addEventListener('click', () => handleUnitSwitch('mm'));
    btnCm?.addEventListener('click', () => handleUnitSwitch('cm'));
    btnIn?.addEventListener('click', () => handleUnitSwitch('in'));

    // 2. Размеры стикера (в активной единице измерения)
    const inputWidth = document.getElementById('stickerWidth') as HTMLInputElement;
    const inputHeight = document.getElementById('stickerHeight') as HTMLInputElement;
    const lockRatioToggle = document.getElementById('lockAspectRatio') as HTMLInputElement;
    const sizingFillBtn = document.getElementById('sizingFill') as HTMLInputElement;
    const sizingFitBtn = document.getElementById('sizingFit') as HTMLInputElement;

    // Выбор формы стикера (Прямоугольник / Круг / Скругленный)
    const shapeRect = document.getElementById('shapeRect') as HTMLInputElement;
    const shapeCircle = document.getElementById('shapeCircle') as HTMLInputElement;
    const shapeRounded = document.getElementById('shapeRounded') as HTMLInputElement;
    const cornerRadiusInput = document.getElementById('cornerRadius') as HTMLInputElement;

    const handleShapeSwitch = async (shape: StickerShape) => {
      const state = store.getState();
      if (shape === 'circle') {
        const d = state.stickerWidthMm;
        store.update({
          stickerShape: 'circle',
          stickerHeightMm: d,
          lockAspectRatio: true,
        });
        if (inputHeight) inputHeight.value = formatUnitValue(d, state.unit);
        if (lockRatioToggle) lockRatioToggle.checked = true;
      } else if (shape === 'rounded') {
        store.update({ stickerShape: 'rounded' });
      } else {
        store.update({ stickerShape: 'rect' });
      }
      this.syncShapeUi(shape);
      this.validateStickerDimensions();
      await this.recalculateArtwork();
    };

    shapeRect?.addEventListener('change', () => { if (shapeRect.checked) handleShapeSwitch('rect'); });
    shapeCircle?.addEventListener('change', () => { if (shapeCircle.checked) handleShapeSwitch('circle'); });
    shapeRounded?.addEventListener('change', () => { if (shapeRounded.checked) handleShapeSwitch('rounded'); });

    this.bindSmartNumberInput(cornerRadiusInput, {
      min: 0.5,
      max: 100,
      getFallback: () => fromMm(store.getState().cornerRadiusMm, store.getState().unit),
      onCommit: async (valInUnit) => {
        const valMm = toMm(valInUnit, store.getState().unit);
        store.update({ cornerRadiusMm: valMm });
        await this.recalculateArtwork();
      },
    });

    this.bindSmartNumberInput(inputWidth, {
      min: 0.1,
      max: 2000,
      getFallback: () => fromMm(store.getState().stickerWidthMm, store.getState().unit),
      onInput: (parsed) => {
        const parsedMm = parsed !== null ? toMm(parsed, store.getState().unit) : null;
        this.validateStickerDimensions(parsedMm, null);
      },
      onCommit: async (valInUnit) => {
        const state = store.getState();
        const newWidth = toMm(valInUnit, state.unit);
        if (state.stickerShape === 'circle') {
          inputHeight.value = formatUnitValue(newWidth, state.unit);
          store.update({ stickerWidthMm: newWidth, stickerHeightMm: newWidth, lockAspectRatio: true });
        } else if (state.lockAspectRatio) {
          let newHeight: number;
          if (this.isPhotoRatioActive && state.loadedImage && state.loadedImage.sourceWidthPx > 0 && state.loadedImage.sourceHeightPx > 0) {
            const ratio = state.loadedImage.sourceWidthPx / state.loadedImage.sourceHeightPx;
            newHeight = calculateHeightFromWidth(newWidth, ratio);
          } else if (state.stickerWidthMm > 0) {
            const ratio = state.stickerHeightMm / state.stickerWidthMm;
            newHeight = roundMm(newWidth * ratio, 1);
          } else {
            newHeight = state.stickerHeightMm;
          }
          inputHeight.value = formatUnitValue(newHeight, state.unit);
          store.update({ stickerWidthMm: newWidth, stickerHeightMm: newHeight });
        } else {
          this.isPhotoRatioActive = false;
          store.update({ stickerWidthMm: newWidth });
        }
        this.validateStickerDimensions();
        await this.recalculateArtwork();
      },
    });

    this.bindSmartNumberInput(inputHeight, {
      min: 0.1,
      max: 2000,
      getFallback: () => fromMm(store.getState().stickerHeightMm, store.getState().unit),
      onInput: (parsed) => {
        const parsedMm = parsed !== null ? toMm(parsed, store.getState().unit) : null;
        this.validateStickerDimensions(null, parsedMm);
      },
      onCommit: async (valInUnit) => {
        const state = store.getState();
        const newHeight = toMm(valInUnit, state.unit);
        if (state.lockAspectRatio) {
          let newWidth: number;
          if (this.isPhotoRatioActive && state.loadedImage && state.loadedImage.sourceWidthPx > 0 && state.loadedImage.sourceHeightPx > 0) {
            const ratio = state.loadedImage.sourceWidthPx / state.loadedImage.sourceHeightPx;
            newWidth = calculateWidthFromHeight(newHeight, ratio);
          } else if (state.stickerHeightMm > 0) {
            const ratio = state.stickerWidthMm / state.stickerHeightMm;
            newWidth = roundMm(newHeight * ratio, 1);
          } else {
            newWidth = state.stickerWidthMm;
          }
          inputWidth.value = formatUnitValue(newWidth, state.unit);
          store.update({ stickerWidthMm: newWidth, stickerHeightMm: newHeight });
        } else {
          this.isPhotoRatioActive = false;
          store.update({ stickerHeightMm: newHeight });
        }
        this.validateStickerDimensions();
        await this.recalculateArtwork();
      },
    });

    lockRatioToggle?.addEventListener('change', () => {
      const isLocked = lockRatioToggle.checked;
      if (!isLocked) {
        this.isPhotoRatioActive = false;
      }
      store.update({ lockAspectRatio: isLocked });
      this.updateLockRatioHint(isLocked);
    });

    const btnApplyPhotoRatio = document.getElementById('btnApplyPhotoRatio') as HTMLButtonElement;
    btnApplyPhotoRatio?.addEventListener('click', async () => {
      const state = store.getState();
      if (!state.loadedImage) {
        return;
      }

      const pageDim = store.getPageDimensions();
      const maxW = Math.max(10, pageDim.widthMm - state.margins.left - state.margins.right);
      const maxH = Math.max(10, pageDim.heightMm - state.margins.top - state.margins.bottom);

      const fitted = fitDimensionsToPhotoRatio({
        currentWidthMm: state.stickerWidthMm,
        currentHeightMm: state.stickerHeightMm,
        photoWidthPx: state.loadedImage.sourceWidthPx,
        photoHeightPx: state.loadedImage.sourceHeightPx,
        maxPageWidthMm: maxW,
        maxPageHeightMm: maxH,
      });

      this.isPhotoRatioActive = true;
      if (lockRatioToggle) lockRatioToggle.checked = true;
      if (inputWidth) inputWidth.value = formatUnitValue(fitted.widthMm, state.unit);
      if (inputHeight) inputHeight.value = formatUnitValue(fitted.heightMm, state.unit);

      store.update({
        stickerWidthMm: fitted.widthMm,
        stickerHeightMm: fitted.heightMm,
        cropData: null,
        lockAspectRatio: true,
      });

      this.updateLockRatioHint(true, fitted.fraction);
      this.validateStickerDimensions();
      await this.recalculateArtwork();
    });

    sizingFillBtn?.addEventListener('change', async () => {
      if (sizingFillBtn.checked) {
        store.update({ sizingMode: 'fill' });
        this.updateSizingExplanation('fill');
        await this.recalculateArtwork();
      }
    });

    sizingFitBtn?.addEventListener('change', async () => {
      if (sizingFitBtn.checked) {
        store.update({ sizingMode: 'fit' });
        this.updateSizingExplanation('fit');
        await this.recalculateArtwork();
      }
    });

    // 3. Формат бумаги и дизайнерский каталог принтеров
    this.initPaperCatalog();

    const customW = document.getElementById('customPageWidth') as HTMLInputElement;
    const customH = document.getElementById('customPageHeight') as HTMLInputElement;

    this.bindSmartNumberInput(customW, {
      min: 1,
      max: 5000,
      getFallback: () => fromMm(store.getState().customPageWidthMm, store.getState().unit),
      onCommit: async (valInUnit) => {
        const valMm = toMm(valInUnit, store.getState().unit);
        store.update({ customPageWidthMm: valMm, paperFormatId: 'custom' });
        await this.recalculateArtwork();
      },
    });

    this.bindSmartNumberInput(customH, {
      min: 1,
      max: 5000,
      getFallback: () => fromMm(store.getState().customPageHeightMm, store.getState().unit),
      onCommit: async (valInUnit) => {
        const valMm = toMm(valInUnit, store.getState().unit);
        store.update({ customPageHeightMm: valMm, paperFormatId: 'custom' });
        await this.recalculateArtwork();
      },
    });

    // 3.1.2 Длина рулона термопринтера (настройка расстояния по длине в мм)
    const thermalRollLenInput = document.getElementById('thermalRollLength') as HTMLInputElement;
    this.bindSmartNumberInput(thermalRollLenInput, {
      min: 20,
      max: 3000,
      getFallback: () => fromMm(store.getState().rollLengthMm, store.getState().unit),
      onCommit: async (valInUnit) => {
        const valMm = toMm(valInUnit, store.getState().unit);
        store.update({ rollLengthMm: valMm });
        await this.recalculateArtwork();
      },
    });

    // Быстрые пресеты длины рулона (80, 120, 150, 200 мм)
    const rollChips = document.querySelectorAll('.roll-preset-chip');
    rollChips.forEach((chip) => {
      chip.addEventListener('click', async () => {
        const lenVal = parseFloat((chip as HTMLElement).dataset.len || '80');
        store.update({ rollLengthMm: lenVal });
        await this.recalculateArtwork();
      });
    });

    // Авто-длина рулона под наклейки ("По наклейкам")
    const btnAutoRoll = document.getElementById('btnAutoRollLength');
    btnAutoRoll?.addEventListener('click', async () => {
      const state = store.getState();
      const fmt = getPaperFormat(state.paperFormatId);
      const rollW = fmt.widthMm;
      const usableW = Math.max(10, rollW - state.margins.left - state.margins.right);
      const stW = state.stickerWidthMm;
      const stH = state.stickerHeightMm;
      const gapX = state.gapX;
      const gapY = state.gapY;

      // Число колонок
      const cols = Math.max(1, Math.floor((usableW + gapX) / (stW + gapX)));
      let targetCopies = 1;
      if (typeof state.requestedCopies === 'number' && state.requestedCopies > 0) {
        targetCopies = state.requestedCopies;
      } else if (this.currentLayout && this.currentLayout.actualCopies > 0) {
        targetCopies = this.currentLayout.actualCopies;
      }

      const rows = Math.max(1, Math.ceil(targetCopies / cols));
      const requiredH = roundMm(state.margins.top + rows * stH + (rows - 1) * gapY + state.margins.bottom);
      const finalH = Math.max(30, Math.min(3000, requiredH));

      store.update({ rollLengthMm: finalH });
      await this.recalculateArtwork();
    });

    // 3.2 Ориентация листа (Portrait / Landscape)
    const orientPortrait = document.getElementById('orientPortrait') as HTMLInputElement;
    const orientLandscape = document.getElementById('orientLandscape') as HTMLInputElement;
    const lblOrientPortrait = document.getElementById('lblOrientPortrait');
    const lblOrientLandscape = document.getElementById('lblOrientLandscape');

    const handleOrientationSwitch = async (orientation: PageOrientation) => {
      store.update({ pageOrientation: orientation });
      await this.recalculateArtwork();
    };

    orientPortrait?.addEventListener('change', () => {
      if (orientPortrait.checked) handleOrientationSwitch('portrait');
    });
    orientLandscape?.addEventListener('change', () => {
      if (orientLandscape.checked) handleOrientationSwitch('landscape');
    });

    lblOrientPortrait?.addEventListener('click', () => {
      if (orientPortrait) orientPortrait.checked = true;
      handleOrientationSwitch('portrait');
    });
    lblOrientLandscape?.addEventListener('click', () => {
      if (orientLandscape) orientLandscape.checked = true;
      handleOrientationSwitch('landscape');
    });

    // 4. Поля страницы (Margins)
    const marginAll = document.getElementById('marginAll') as HTMLInputElement;
    const marginTop = document.getElementById('marginTop') as HTMLInputElement;
    const marginBottom = document.getElementById('marginBottom') as HTMLInputElement;
    const marginLeft = document.getElementById('marginLeft') as HTMLInputElement;
    const marginRight = document.getElementById('marginRight') as HTMLInputElement;
    const linkMarginsToggle = document.getElementById('linkMargins') as HTMLInputElement;

    linkMarginsToggle?.addEventListener('change', () => {
      store.update({ linkMargins: linkMarginsToggle.checked });
    });

    this.bindSmartNumberInput(marginAll, {
      min: 0,
      max: 500,
      getFallback: () => fromMm(store.getState().margins.top, store.getState().unit),
      onCommit: (valInUnit) => {
        const val = toMm(valInUnit, store.getState().unit);
        store.update({
          margins: { top: val, bottom: val, left: val, right: val },
        });
      },
    });

    const marginFields = [
      { el: marginTop, key: 'top' as const },
      { el: marginBottom, key: 'bottom' as const },
      { el: marginLeft, key: 'left' as const },
      { el: marginRight, key: 'right' as const },
    ];

    marginFields.forEach(({ el, key }) => {
      this.bindSmartNumberInput(el, {
        min: 0,
        max: 500,
        getFallback: () => fromMm(store.getState().margins[key], store.getState().unit),
        onCommit: (valInUnit) => {
          const val = toMm(valInUnit, store.getState().unit);
          store.update({
            margins: { ...store.getState().margins, [key]: val },
          });
        },
      });
    });

    // 5. Зазор между стикерами (Gap)
    const gapAll = document.getElementById('gapAll') as HTMLInputElement;
    const gapX = document.getElementById('gapX') as HTMLInputElement;
    const gapY = document.getElementById('gapY') as HTMLInputElement;
    const linkGapsToggle = document.getElementById('linkGaps') as HTMLInputElement;

    linkGapsToggle?.addEventListener('change', () => {
      store.update({ linkGaps: linkGapsToggle.checked });
    });

    this.bindSmartNumberInput(gapAll, {
      min: 0,
      max: 500,
      getFallback: () => fromMm(store.getState().gapX, store.getState().unit),
      onCommit: (valInUnit) => {
        const val = toMm(valInUnit, store.getState().unit);
        store.update({ gapX: val, gapY: val });
      },
    });

    this.bindSmartNumberInput(gapX, {
      min: 0,
      max: 500,
      getFallback: () => fromMm(store.getState().gapX, store.getState().unit),
      onCommit: (valInUnit) => {
        const val = toMm(valInUnit, store.getState().unit);
        store.update({ gapX: val });
      },
    });

    this.bindSmartNumberInput(gapY, {
      min: 0,
      max: 500,
      getFallback: () => fromMm(store.getState().gapY, store.getState().unit),
      onCommit: (valInUnit) => {
        const val = toMm(valInUnit, store.getState().unit);
        store.update({ gapY: val });
      },
    });

    // 6. Раскладка и количество копий
    const autoRotationToggle = document.getElementById('allowRotation') as HTMLInputElement;
    const requestedCopiesInput = document.getElementById('requestedCopies') as HTMLInputElement;
    const autoCopiesBtn = document.getElementById('btnAutoCopies') as HTMLButtonElement;

    autoRotationToggle?.addEventListener('change', async () => {
      store.update({ allowRotation: autoRotationToggle.checked });
      await this.recalculateArtwork();
    });

    let copiesTimer: any = null;
    const commitCopies = (force = false) => {
      if (copiesTimer) {
        clearTimeout(copiesTimer);
        copiesTimer = null;
      }
      if (!requestedCopiesInput) return;
      const raw = requestedCopiesInput.value.trim().toUpperCase();
      if (raw === 'AUTO' || raw === '') {
        store.update({ requestedCopies: 'AUTO' });
        if (force) requestedCopiesInput.value = 'AUTO';
      } else {
        const num = parseInt(raw, 10);
        if (!isNaN(num) && num > 0) {
          store.update({ requestedCopies: num });
          if (force) requestedCopiesInput.value = num.toString();
        } else if (force) {
          store.update({ requestedCopies: 'AUTO' });
          requestedCopiesInput.value = 'AUTO';
        }
      }
    };

    requestedCopiesInput?.addEventListener('input', () => {
      if (copiesTimer) clearTimeout(copiesTimer);
      copiesTimer = setTimeout(() => commitCopies(false), 450);
    });
    requestedCopiesInput?.addEventListener('change', () => commitCopies(true));
    requestedCopiesInput?.addEventListener('blur', () => commitCopies(true));
    requestedCopiesInput?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCopies(true);
        requestedCopiesInput.blur();
      }
    });

    autoCopiesBtn?.addEventListener('click', () => {
      store.update({ requestedCopies: 'AUTO' });
      if (requestedCopiesInput) requestedCopiesInput.value = 'AUTO';
    });

    // Режим распределения отступов (сетка)
    const spacingRadios = document.querySelectorAll('input[name="spacingMode"]');
    spacingRadios.forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          store.update({ spacingMode: target.value as SpacingMode });
          await this.recalculateArtwork();
        }
      });
    });

    // 7. Метки реза и Bleed
    const cutMarksToggle = document.getElementById('cutMarksEnabled') as HTMLInputElement;
    const bleedSelect = document.getElementById('bleedSelect') as HTMLSelectElement;

    cutMarksToggle?.addEventListener('change', () => {
      const state = store.getState();
      store.update({
        cutMarks: { ...state.cutMarks, enabled: cutMarksToggle.checked },
      });
    });

    const regMarksToggle = document.getElementById('registrationMarksEnabled') as HTMLInputElement;
    regMarksToggle?.addEventListener('change', async () => {
      store.update({ registrationMarks: regMarksToggle.checked });
      await this.recalculateArtwork();
    });

    const cutSvgMarksToggle = document.getElementById('cutSvgIncludeMarks') as HTMLInputElement;
    cutSvgMarksToggle?.addEventListener('change', () => {
      store.update({ cutSvgIncludeMarks: cutSvgMarksToggle.checked });
    });

    document.getElementById('btnDownloadTemplateSvg')?.addEventListener('click', () => {
      this.handleDownloadTemplateSvg();
    });

    bleedSelect?.addEventListener('change', () => {
      store.update({ bleedMm: parseInt(bleedSelect.value, 10) || 0 });
      this.updateBleedGapWarning();
    });

    // 8. Кнопки экспорта (PDF, PNG и контур SVG)
    const pngDpiRadios = document.querySelectorAll('input[name="pngDpi"]');
    pngDpiRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          const dpi = parseInt(target.value, 10) as PngDpi;
          store.update({ pngDpi: dpi });
          this.updatePngInfoBadge();
        }
      });
    });

    document.getElementById('btnDownloadPdf')?.addEventListener('click', () => this.handleDownloadPdf());
    document.getElementById('btnHeaderDownloadPdf')?.addEventListener('click', () => this.handleDownloadPdf());
    document.getElementById('btnDownloadPng')?.addEventListener('click', () => this.handleDownloadPng());
    document.getElementById('btnHeaderDownloadPng')?.addEventListener('click', () => this.handleDownloadPng());
    document.getElementById('btnDownloadCutSvg')?.addEventListener('click', () => this.handleDownloadCutSvg());
    document.getElementById('btnHeaderDownloadSvg')?.addEventListener('click', () => this.handleDownloadCutSvg());
    document.getElementById('btnPrintPdf')?.addEventListener('click', () => this.handlePrintPdf());
    document.getElementById('btnCalibrationPdf')?.addEventListener('click', () => this.handleCalibrationPdf());
    document.getElementById('btnResetSettings')?.addEventListener('click', () => {
      if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
        store.resetToDefaults();
      }
    });

    // 8.1 Интерактивный Zoom & Pan предпросмотра листа
    const viewport = document.querySelector('.sheet-viewport-wrapper') as HTMLElement;
    const sheetContainer = document.getElementById('sheetPreviewContainer') as HTMLElement;
    if (viewport && sheetContainer) {
      this.zoomController = new ZoomController(viewport, sheetContainer);
      const badge = document.getElementById('zoomLevelBadge');
      this.zoomController.setBadgeElement(badge);

      document.getElementById('btnZoomIn')?.addEventListener('click', () => this.zoomController?.zoomIn(0.25));
      document.getElementById('btnZoomOut')?.addEventListener('click', () => this.zoomController?.zoomOut(0.25));
      document.getElementById('btnZoomReset')?.addEventListener('click', () => this.zoomController?.resetZoom(true));
      document.getElementById('btnZoomFit')?.addEventListener('click', () => this.zoomController?.resetZoom(true));
    }

    // 9. Мобильные табы (Параметры / Превью / Справка)
    const tabBtnControls = document.getElementById('tabBtnControls');
    const tabBtnPreview = document.getElementById('tabBtnPreview');
    const tabBtnGuide = document.getElementById('tabBtnGuide');
    const btnGuideLink = document.getElementById('btnGuideLink');
    const btnMobileDownloadPdf = document.getElementById('btnMobileDownloadPdf');
    const btnMobileDownloadPng = document.getElementById('btnMobileDownloadPng');

    // По умолчанию на мобильных активны параметры
    document.body.classList.add('tab-active-controls');
    let lastActiveTab: 'controls' | 'preview' = 'controls';

    const guideModalBackdrop = document.getElementById('guideModalBackdrop');
    const btnGuideModalClose = document.getElementById('btnGuideModalClose');
    const btnGuideBack = document.getElementById('btnGuideBack');
    const btnGuideDoneBottom = document.getElementById('btnGuideDoneBottom');

    const openGuideModal = () => {
      if (window.innerWidth <= 1024) {
        activateTab('guide');
      } else {
        guideModalBackdrop?.classList.add('open');
        guideModalBackdrop?.setAttribute('aria-hidden', 'false');
      }
    };

    const dismissGuide = () => {
      guideModalBackdrop?.classList.remove('open');
      guideModalBackdrop?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('tab-active-guide');
      document.body.style.overflow = '';
      tabBtnGuide?.classList.remove('active');

      if (window.innerWidth <= 1024) {
        activateTab(lastActiveTab);
      }
    };

    const activateTab = (tab: 'controls' | 'preview' | 'guide') => {
      document.body.classList.remove('tab-active-controls', 'tab-active-preview', 'tab-active-guide');
      tabBtnControls?.classList.remove('active');
      tabBtnPreview?.classList.remove('active');
      tabBtnGuide?.classList.remove('active');

      if (tab === 'controls') {
        document.body.style.overflow = '';
        lastActiveTab = 'controls';
        document.body.classList.add('tab-active-controls');
        tabBtnControls?.classList.add('active');
      } else if (tab === 'preview') {
        document.body.style.overflow = '';
        lastActiveTab = 'preview';
        document.body.classList.add('tab-active-preview');
        tabBtnPreview?.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (tab === 'guide') {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('tab-active-guide');
        tabBtnGuide?.classList.add('active');
        const guideScroll = document.querySelector('.guide-modal-scroll');
        if (guideScroll) {
          guideScroll.scrollTop = 0;
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };

    tabBtnControls?.addEventListener('click', () => activateTab('controls'));
    tabBtnPreview?.addEventListener('click', () => activateTab('preview'));
    tabBtnGuide?.addEventListener('click', () => activateTab('guide'));

    // Открытие модального окна Справки на десктопе или переключение таба на мобильных
    btnGuideLink?.addEventListener('click', (e) => {
      e.preventDefault();
      openGuideModal();
    });

    // Мульти-выход из Справки: крестик, мобильная кнопка назад и кнопка внизу контента
    btnGuideModalClose?.addEventListener('click', (e) => {
      e.preventDefault();
      dismissGuide();
    });

    btnGuideBack?.addEventListener('click', (e) => {
      e.preventDefault();
      dismissGuide();
    });

    btnGuideDoneBottom?.addEventListener('click', (e) => {
      e.preventDefault();
      dismissGuide();
    });

    // Закрытие по клику вне модального окна (на затемненный оверлей)
    guideModalBackdrop?.addEventListener('click', (e) => {
      const modalWindow = document.querySelector('.guide-modal-window');
      if (modalWindow && !modalWindow.contains(e.target as Node)) {
        dismissGuide();
      }
    });

    // Закрытие по нажатию клавиши Escape в любом режиме (десктоп или мобильный)
    window.addEventListener('keydown', (e) => {
      const isGuideOpen =
        guideModalBackdrop?.classList.contains('open') ||
        document.body.classList.contains('tab-active-guide');

      if (e.key === 'Escape' && isGuideOpen) {
        dismissGuide();
      }
    });

    btnMobileDownloadPdf?.addEventListener('click', () => this.handleDownloadPdf());
    btnMobileDownloadPng?.addEventListener('click', () => this.handleDownloadPng());
  }

  /**
   * Обработка загруженного файла изображения
   */
  private async handleNewImage(file: File) {
    try {
      const loaded = await loadSourceImage(file);
      this.lastArtworkCache = null;
      store.update({
        loadedImage: loaded,
        cropData: null,
      });
      await this.recalculateArtwork();

      // Фиксация шага воронки: пользователь выбрал и загрузил стикер
      trackEvent({
        name: 'sticker_uploaded',
        data: {
          format: file.type,
          sizeBytes: file.size,
        },
      });

      // На мобильных устройствах (<= 768px) после успешной загрузки фото
      // автоматически переключаем на вкладку «Превью листа»,
      // чтобы пользователь сразу увидел разложенные стикеры
      if (window.innerWidth <= 768) {
        const tabBtnPreview = document.getElementById('tabBtnPreview');
        if (tabBtnPreview && !tabBtnPreview.classList.contains('active')) {
          setTimeout(() => {
            tabBtnPreview.click();
          }, 300);
        }
      }
    } catch (e: any) {
      alert(t('alertImageError', { error: e.message }));
    }
  }

  /**
   * Пересчет кадрированного изображения в максимальном качестве
   * Использует паттерн Last-Wins Queue: ни одно изменение пользователя не теряется во время асинхронного рендера.
   */
  private async recalculateArtwork() {
    const state = store.getState();
    if (!state.loadedImage) return;

    if (this.isProcessingImage) {
      this.hasPendingArtworkRecalculation = true;
      return;
    }

    this.isProcessingImage = true;
    try {
      do {
        this.hasPendingArtworkRecalculation = false;
        const currentState = store.getState();
        if (!currentState.loadedImage) break;

        const pageDim = store.getPageDimensions();
        // Вычисляем актуальную раскладку, чтобы знать выбранный поворот
        const layout = calculateLayout({
          pageWidthMm: pageDim.widthMm,
          pageHeightMm: pageDim.heightMm,
          stickerWidthMm: currentState.stickerWidthMm,
          stickerHeightMm: currentState.stickerHeightMm,
          margins: currentState.margins,
          gapX: currentState.gapX,
          gapY: currentState.gapY,
          allowRotation: currentState.allowRotation,
          requestedCopies: currentState.requestedCopies,
          spacingMode: currentState.spacingMode,
        });

        const sheetRotation = layout.selectedRotation;
        const aspectRatio = roundMm(currentState.stickerWidthMm / currentState.stickerHeightMm, 4);

        const cacheKey = {
          imageSrc: currentState.loadedImage.imageElement.src,
          cropJson: JSON.stringify(currentState.cropData),
          sizingMode: currentState.sizingMode,
          aspectRatio,
          sheetRotation,
        };

        if (
          this.lastArtworkCache &&
          this.lastArtworkCache.imageSrc === cacheKey.imageSrc &&
          this.lastArtworkCache.cropJson === cacheKey.cropJson &&
          this.lastArtworkCache.sizingMode === cacheKey.sizingMode &&
          Math.abs(this.lastArtworkCache.aspectRatio - cacheKey.aspectRatio) < 0.001 &&
          this.lastArtworkCache.sheetRotation === cacheKey.sheetRotation &&
          currentState.croppedResult !== null
        ) {
          // Кэш актуален, пропускаем тяжелый рендер холста
          continue;
        }

        const cropped = await renderCroppedArtwork(
          currentState.loadedImage.imageElement,
          currentState.cropData,
          currentState.sizingMode,
          aspectRatio,
          currentState.loadedImage.mimeType,
          sheetRotation
        );

        // Освобождаем предыдущий Blob URL из памяти браузера при создании нового
        if (this.currentBlobUrl && this.currentBlobUrl.startsWith('blob:') && this.currentBlobUrl !== cropped.dataUrl) {
          try {
            URL.revokeObjectURL(this.currentBlobUrl);
          } catch {
            // ignore
          }
        }
        if (cropped.dataUrl && cropped.dataUrl.startsWith('blob:')) {
          this.currentBlobUrl = cropped.dataUrl;
        }

        // Расчет эффективного разрешения DPI
        const dpiDimensionMm = sheetRotation === 90 ? currentState.stickerHeightMm : currentState.stickerWidthMm;
        const dpiInfo = getDpiInfo(cropped.pixelWidth, dpiDimensionMm);

        this.lastArtworkCache = cacheKey;

        store.update({
          croppedResult: cropped,
          effectiveDpi: dpiInfo.dpi,
        });
      } while (this.hasPendingArtworkRecalculation);
    } catch (e) {
      console.error('Ошибка нарезки изображения:', e);
    } finally {
      this.isProcessingImage = false;
    }
  }

  /**
   * Экспорт PDF для скачивания
   */
  private async handleDownloadPdf() {
    if (!this.currentLayout || this.currentLayout.positions.length === 0) {
      alert(t('alertNoStickers'));
      return;
    }

    const state = store.getState();
    const pageDim = store.getPageDimensions();

    const pdfBytes = await generateStickerSheetPdf({
      pageWidthMm: pageDim.widthMm,
      pageHeightMm: pageDim.heightMm,
      layout: this.currentLayout,
      imageBytes: state.croppedResult?.bytes,
      imageMimeType: state.croppedResult?.mimeType,
      cutMarks: state.cutMarks,
      bleedMm: state.bleedMm,
      stickerShape: state.stickerShape,
      cornerRadiusMm: state.cornerRadiusMm,
      registrationMarks: state.registrationMarks,
    });

    const formatName = state.paperFormatId.toLowerCase();
    const filename = `stickers-${formatName}-${state.stickerWidthMm}x${state.stickerHeightMm}mm-${this.currentLayout.actualCopies}pcs.pdf`;
    downloadPdfBlob(pdfBytes, filename);

    // Фиксация ключевой конверсии: пользователь успешно скачал готовый лист PDF
    trackEvent({
      name: 'pdf_downloaded',
      data: {
        widthMm: state.stickerWidthMm,
        heightMm: state.stickerHeightMm,
        copies: this.currentLayout.actualCopies,
        bleedMm: state.bleedMm,
        orientation: state.pageOrientation,
        paperFormat: state.paperFormatId,
        unit: state.unit,
      },
    });
  }

  /**
   * Экспорт чистого векторного 1:1 SVG контура для плоттерной резки
   */
  private handleDownloadCutSvg() {
    if (!this.currentLayout || this.currentLayout.positions.length === 0) {
      alert(t('alertNoStickers'));
      return;
    }

    const state = store.getState();
    const pageDim = store.getPageDimensions();

    const svgContent = generateStickerCutSvg({
      pageWidthMm: pageDim.widthMm,
      pageHeightMm: pageDim.heightMm,
      layout: this.currentLayout,
      shape: state.stickerShape,
      cornerRadiusMm: state.cornerRadiusMm,
      registrationMarks: state.registrationMarks,
      includeMarksInSvg: Boolean(state.cutSvgIncludeMarks),
    });

    const formatName = state.paperFormatId.toLowerCase();
    const filename = `stickers-cut-${formatName}-${state.stickerWidthMm}x${state.stickerHeightMm}mm-${this.currentLayout.actualCopies}pcs.svg`;
    downloadCutSvgBlob(svgContent, filename);

    trackEvent({
      name: 'pdf_downloaded',
      data: {
        widthMm: state.stickerWidthMm,
        heightMm: state.stickerHeightMm,
        copies: this.currentLayout.actualCopies,
        shape: state.stickerShape,
        type: 'svg_cut_contour',
      },
    });
  }

  /**
   * Скачивание калибровочного шаблона реперов для вычерчивания плоттерной ручкой на прозрачной пленке
   */
  private handleDownloadTemplateSvg() {
    const pageDim = store.getPageDimensions();
    const svgContent = generateRegistrationTemplateSvg(pageDim.widthMm, pageDim.heightMm, 8);
    const filename = `stickers-registration-template-${pageDim.widthMm}x${pageDim.heightMm}mm.svg`;
    downloadCutSvgBlob(svgContent, filename);
  }

  /**
   * Экспорт листа в формате PNG высокого качества (выбранный DPI: 150 / 300 / 600)
   */
  private async handleDownloadPng() {
    if (!this.currentLayout || this.currentLayout.positions.length === 0) {
      alert(t('alertNoStickers'));
      return;
    }

    const state = store.getState();
    const pageDim = store.getPageDimensions();
    const dpi = state.pngDpi || 300;

    try {
      const pngBlob = await generateStickerSheetPng({
        pageWidthMm: pageDim.widthMm,
        pageHeightMm: pageDim.heightMm,
        layout: this.currentLayout,
        imageDataUrl: state.croppedResult?.dataUrl || null,
        cutMarks: state.cutMarks,
        bleedMm: state.bleedMm,
        dpi,
        stickerShape: state.stickerShape,
        cornerRadiusMm: state.cornerRadiusMm,
        registrationMarks: state.registrationMarks,
      });

      const formatName = state.paperFormatId.toLowerCase();
      const filename = `stickers-${formatName}-${state.stickerWidthMm}x${state.stickerHeightMm}mm-${this.currentLayout.actualCopies}pcs-${dpi}dpi.png`;
      downloadPngBlob(pngBlob, filename);

      trackEvent({
        name: 'pdf_downloaded',
        data: {
          widthMm: state.stickerWidthMm,
          heightMm: state.stickerHeightMm,
          copies: this.currentLayout.actualCopies,
          bleedMm: state.bleedMm,
          orientation: state.pageOrientation,
          paperFormat: state.paperFormatId,
          unit: state.unit,
        },
      });
    } catch (e) {
      console.error('Ошибка экспорта PNG:', e);
      alert('Ошибка при генерации PNG: ' + String(e));
    }
  }

  /**
   * Обновление бейджа с пиксельными размерами листа и надписи кнопки PNG
   */
  private updatePngInfoBadge() {
    const state = store.getState();
    const pageDim = store.getPageDimensions();
    const dpi = state.pngDpi || 300;
    const dpmm = dpi / 25.4;
    const wPx = Math.round(pageDim.widthMm * dpmm);
    const hPx = Math.round(pageDim.heightMm * dpmm);

    const badge = document.getElementById('pngDimensionsBadge');
    if (badge) {
      badge.textContent = `${wPx} × ${hPx} px`;
    }

    const btnText = document.getElementById('btnDownloadPngText');
    if (btnText) {
      btnText.textContent = t('btnDownloadPng', { dpi });
    }
  }

  /**
   * Печать PDF с выводом предупреждения о масштабе 100%
   */
  private async handlePrintPdf() {
    if (!this.currentLayout || this.currentLayout.positions.length === 0) {
      alert(t('alertNoStickers'));
      return;
    }

    const state = store.getState();
    const pageDim = store.getPageDimensions();

    const pdfBytes = await generateStickerSheetPdf({
      pageWidthMm: pageDim.widthMm,
      pageHeightMm: pageDim.heightMm,
      layout: this.currentLayout,
      imageBytes: state.croppedResult?.bytes,
      imageMimeType: state.croppedResult?.mimeType,
      cutMarks: state.cutMarks,
      bleedMm: state.bleedMm,
      stickerShape: state.stickerShape,
      cornerRadiusMm: state.cornerRadiusMm,
      registrationMarks: state.registrationMarks,
    });

    openPdfForPrint(pdfBytes);

    // Фиксация действия: отправка на прямую печать
    trackEvent({
      name: 'print_initiated',
      data: {
        copies: this.currentLayout.actualCopies,
      },
    });
  }

  /**
   * Генерация калибровочного листа для проверки точности принтера
   */
  private async handleCalibrationPdf() {
    const pdfBytes = await createCalibrationPdf();
    downloadPdfBlob(pdfBytes, 'calibration-sheet-a4.pdf');

    // Фиксация действия: калибровка масштаба
    trackEvent({
      name: 'calibration_downloaded',
    });
  }

  /**
   * Главный метод отрисовки интерфейса на основе обновленного состояния
   */
  public render(state: AppState) {
    const pageDim = store.getPageDimensions();

    // 1. Расчет раскладки через layoutEngine (единый модуль для preview и PDF)
    this.currentLayout = calculateLayout({
      pageWidthMm: pageDim.widthMm,
      pageHeightMm: pageDim.heightMm,
      stickerWidthMm: state.stickerWidthMm,
      stickerHeightMm: state.stickerHeightMm,
      margins: state.margins,
      gapX: state.gapX,
      gapY: state.gapY,
      allowRotation: state.allowRotation,
      requestedCopies: state.requestedCopies,
      spacingMode: state.spacingMode,
    });

    // 2. Синхронизация полей ввода
    this.syncFormValues(state);

    // 3. Отображение информации об изображении и DPI
    this.updateImageStats(state);

    // 4. Отображение сводки раскладки
    this.updateLayoutStats(state, this.currentLayout, pageDim);

    // 5. Предупреждение о printable area (<3 мм)
    this.updatePrintableAreaWarning(state);

    // 6. Отрисовка Live Preview (векторный SVG в миллиметрах с адаптивным CSS aspect-ratio)
    const previewContainer = document.getElementById('sheetPreviewContainer');
    if (previewContainer) {
      previewContainer.style.aspectRatio = `${pageDim.widthMm} / ${pageDim.heightMm}`;
      if (pageDim.widthMm > pageDim.heightMm) {
        previewContainer.classList.add('landscape');
      } else {
        previewContainer.classList.remove('landscape');
      }

      previewContainer.innerHTML = renderPreviewSvg({
        pageWidthMm: pageDim.widthMm,
        pageHeightMm: pageDim.heightMm,
        margins: state.margins,
        layout: this.currentLayout,
        imageUrl: state.croppedResult?.dataUrl || null,
        sizingMode: state.sizingMode,
        cutMarksConfig: state.cutMarks,
        bleedMm: state.bleedMm,
        stickerShape: state.stickerShape,
        cornerRadiusMm: state.cornerRadiusMm,
        registrationMarks: state.registrationMarks,
      });
    }
  }

  /**
   * Синхронизация значений инпутов с состоянием
   */
  private syncFormValues(state: AppState) {
    const setVal = (id: string, val: string | number) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el && document.activeElement !== el) {
        el.value = val.toString();
      }
    };
    const setChecked = (id: string, checked: boolean) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.checked = checked;
    };

    // 1. Единицы измерения
    ['mm', 'cm', 'in'].forEach((u) => {
      const btn = document.getElementById(`btnUnit${u.charAt(0).toUpperCase() + u.slice(1)}`);
      if (btn) btn.classList.toggle('active', state.unit === u);
    });
    this.updateUnitLabels(state.unit);

    // 2. Формат бумаги и динамический заголовок
    this.updateAppHeaderTitle(state.paperFormatId);

    const paperSelect = document.getElementById('paperFormatSelect') as HTMLSelectElement;
    if (paperSelect && document.activeElement !== paperSelect) {
      paperSelect.value = state.paperFormatId;
    }
    const chipA4 = document.getElementById('chipPaperA4');
    const chipThermal = document.getElementById('chipPaperThermal');
    const chipCustom = document.getElementById('chipPaperCustom');
    const chipLetter = document.getElementById('chipPaperLetter');
    const chipWb = document.getElementById('chipPaperWb');
    const chipPeriPage = document.getElementById('chipPaperPeriPage');
    const chipMore = document.getElementById('chipPaperMore');
    const morePaperGroup = document.getElementById('morePaperGroup');

    const isThermal = isThermalPaperFormat(state.paperFormatId);

    const isA4 = state.paperFormatId === 'a4';
    const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';

    chipA4?.classList.toggle('active', isA4);
    chipMore?.classList.toggle('active', !isA4);

    if (chipMore) {
      if (isA4) {
        chipMore.textContent = t('paperChipOther');
      } else {
        const shortName = getShortPaperFormatName(state.paperFormatId, lang);
        chipMore.textContent = `${shortName} ▾`;
      }
    }

    // Обратная совместимость со скрытыми чипами
    chipThermal?.classList.toggle('active', isThermal);
    chipCustom?.classList.toggle('active', state.paperFormatId === 'custom');
    if (chipThermal) {
      chipThermal.textContent = t('paperChipThermal');
    }
    if (chipCustom) {
      chipCustom.textContent = t('paperChipCustom');
    }
    chipLetter?.classList.toggle('active', state.paperFormatId === 'letter');
    chipWb?.classList.toggle('active', state.paperFormatId === 'label_58x40');
    chipPeriPage?.classList.toggle('active', state.paperFormatId === 'peripage_57');

    if (morePaperGroup) {
      morePaperGroup.style.display = 'none';
    }

    // Обновление сводной дизайнерской карточки бумаги и принтера
    this.updatePaperSummaryCard(state);

    const customPaperGroup = document.getElementById('customPaperGroup');
    if (customPaperGroup) {
      customPaperGroup.style.display = state.paperFormatId === 'custom' ? 'flex' : 'none';
    }
    setVal('customPageWidth', formatUnitValue(state.customPageWidthMm, state.unit));
    setVal('customPageHeight', formatUnitValue(state.customPageHeightMm, state.unit));

    // Для ВСЕХ принтеров термопечати доступна настройка длины ленты/этикетки
    const thermalRollGroup = document.getElementById('thermalRollGroup');
    if (thermalRollGroup) {
      thermalRollGroup.style.display = isThermal ? 'flex' : 'none';
    }
    setVal('thermalRollLength', formatUnitValue(state.rollLengthMm, state.unit));

    const rollChips = document.querySelectorAll('.roll-preset-chip');
    rollChips.forEach((chip) => {
      const lenVal = parseFloat((chip as HTMLElement).dataset.len || '0');
      chip.classList.toggle('active', isThermal && Math.abs(state.rollLengthMm - lenVal) < 0.5);
    });

    setVal('stickerWidth', formatUnitValue(state.stickerWidthMm, state.unit));
    setVal('stickerHeight', formatUnitValue(state.stickerHeightMm, state.unit));
    setChecked('lockAspectRatio', state.lockAspectRatio);
    this.updateLockRatioHint(state.lockAspectRatio);

    setChecked('sizingFill', state.sizingMode === 'fill');
    setChecked('sizingFit', state.sizingMode === 'fit');
    this.updateSizingExplanation(state.sizingMode);

    this.validateStickerDimensions(state.stickerWidthMm, state.stickerHeightMm);

    setChecked('orientPortrait', state.pageOrientation === 'portrait');
    setChecked('orientLandscape', state.pageOrientation === 'landscape');

    setChecked('linkMargins', state.linkMargins);
    const marginLinkedGroup = document.getElementById('marginLinkedGroup');
    const marginUnlinkedGroup = document.getElementById('marginUnlinkedGroup');
    if (marginLinkedGroup && marginUnlinkedGroup) {
      marginLinkedGroup.style.display = state.linkMargins ? 'block' : 'none';
      marginUnlinkedGroup.style.display = state.linkMargins ? 'none' : 'grid';
    }
    setVal('marginAll', formatUnitValue(state.margins.top, state.unit));
    setVal('marginTop', formatUnitValue(state.margins.top, state.unit));
    setVal('marginBottom', formatUnitValue(state.margins.bottom, state.unit));
    setVal('marginLeft', formatUnitValue(state.margins.left, state.unit));
    setVal('marginRight', formatUnitValue(state.margins.right, state.unit));

    setChecked('linkGaps', state.linkGaps);
    const gapLinkedGroup = document.getElementById('gapLinkedGroup');
    const gapUnlinkedGroup = document.getElementById('gapUnlinkedGroup');
    if (gapLinkedGroup && gapUnlinkedGroup) {
      gapLinkedGroup.style.display = state.linkGaps ? 'block' : 'none';
      gapUnlinkedGroup.style.display = state.linkGaps ? 'none' : 'grid';
    }
    setVal('gapAll', formatUnitValue(state.gapX, state.unit));
    setVal('gapX', formatUnitValue(state.gapX, state.unit));
    setVal('gapY', formatUnitValue(state.gapY, state.unit));

    setChecked('allowRotation', state.allowRotation);
    setVal('requestedCopies', state.requestedCopies === 'AUTO' ? 'AUTO' : state.requestedCopies);

    setChecked('cutMarksEnabled', state.cutMarks.enabled);
    setChecked('spacingCenter', (state.spacingMode || 'center') === 'center');
    setChecked('spacingStart', state.spacingMode === 'start');
    setChecked('spacingJustify', state.spacingMode === 'justify');

    const currentPngDpi = state.pngDpi || 300;
    setChecked('pngDpi150', currentPngDpi === 150);
    setChecked('pngDpi300', currentPngDpi === 300);
    setChecked('pngDpi600', currentPngDpi === 600);
    this.updatePngInfoBadge();

    const bleedSelect = document.getElementById('bleedSelect') as HTMLSelectElement;
    if (bleedSelect) bleedSelect.value = state.bleedMm.toString();

    // Форма стикера, скругление и оптические метки совмещения плоттера
    const shape = state.stickerShape || 'rect';
    setChecked('shapeRect', shape === 'rect');
    setChecked('shapeCircle', shape === 'circle');
    setChecked('shapeRounded', shape === 'rounded');
    this.syncShapeUi(shape);
    setVal('cornerRadius', formatUnitValue(state.cornerRadiusMm !== undefined ? state.cornerRadiusMm : 3, state.unit));
    setChecked('registrationMarksEnabled', Boolean(state.registrationMarks));
    setChecked('cutSvgIncludeMarks', Boolean(state.cutSvgIncludeMarks));

    // Обновление карточки калибровки меток и расстояний для проверки линейкой
    const regMarksCard = document.getElementById('regMarksCalibrationCard');
    const cutSvgMarksRow = document.getElementById('cutSvgMarksRow');
    const regMarksDistText = document.getElementById('regMarksDistText');
    const isReg = Boolean(state.registrationMarks);
    if (regMarksCard) regMarksCard.style.display = isReg ? 'block' : 'none';
    if (cutSvgMarksRow) cutSvgMarksRow.style.display = isReg ? 'block' : 'none';
    if (regMarksDistText && isReg) {
      const pageDim = store.getPageDimensions();
      const distX = roundMm(pageDim.widthMm - 16, 1);
      const distY = roundMm(pageDim.heightMm - 16, 1);
      regMarksDistText.textContent = `${distX} мм (по длине) × ${distY} мм (по ширине)`;
    }

    this.updateBleedGapWarning(state);

    // Кнопка кадрирования доступна только если изображение загружено
    const btnCrop = document.getElementById('btnOpenCrop') as HTMLButtonElement;
    if (btnCrop) {
      btnCrop.disabled = !state.loadedImage;
    }

    // Кнопка применения пропорций фото доступна только если изображение загружено
    const btnApplyPhotoRatio = document.getElementById('btnApplyPhotoRatio') as HTMLButtonElement;
    const photoRatioBadge = document.getElementById('photoRatioBadge');
    if (btnApplyPhotoRatio) {
      btnApplyPhotoRatio.disabled = !state.loadedImage;
      if (state.loadedImage && photoRatioBadge) {
        const fraction = getSimplifiedAspectRatio(state.loadedImage.sourceWidthPx, state.loadedImage.sourceHeightPx);
        photoRatioBadge.textContent = fraction;
        photoRatioBadge.style.display = 'inline-block';
      } else if (photoRatioBadge) {
        photoRatioBadge.style.display = 'none';
      }
    }
  }

  /**
   * Синхронизация видимости полей ввода в зависимости от формы стикера (круг / скругленный / прямоугольник)
   */
  private syncShapeUi(shape: StickerShape) {
    const state = store.getState();
    const lblStickerWidth = document.getElementById('lblStickerWidth');
    const colStickerHeight = document.getElementById('colStickerHeight');
    const cornerRadiusGroup = document.getElementById('cornerRadiusGroup');
    const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';
    const symbol = getUnitSymbol(state.unit, lang);

    if (shape === 'circle') {
      if (lblStickerWidth) lblStickerWidth.textContent = t('lblDiameterUnit', { unit: symbol });
      if (colStickerHeight) colStickerHeight.style.display = 'none';
      if (cornerRadiusGroup) cornerRadiusGroup.style.display = 'none';
    } else if (shape === 'rounded') {
      if (lblStickerWidth) lblStickerWidth.textContent = t('lblWidthUnit', { unit: symbol });
      if (colStickerHeight) colStickerHeight.style.display = '';
      if (cornerRadiusGroup) cornerRadiusGroup.style.display = '';
    } else {
      if (lblStickerWidth) lblStickerWidth.textContent = t('lblWidthUnit', { unit: symbol });
      if (colStickerHeight) colStickerHeight.style.display = '';
      if (cornerRadiusGroup) cornerRadiusGroup.style.display = 'none';
    }
  }

  /**
   * Предупреждение о перекрытии зон вылетов при слишком малом зазоре между наклейками
   */
  private updateBleedGapWarning(s?: AppState) {
    const state = s || store.getState();
    const warningEl = document.getElementById('bleedGapWarning');
    const warningTextEl = document.getElementById('bleedGapWarningText');
    if (!warningEl) return;

    const minGap = state.bleedMm * 2;
    const isOverlap = state.bleedMm > 0 && (state.gapX < minGap || state.gapY < minGap);
    warningEl.style.display = isOverlap ? 'block' : 'none';
    if (warningTextEl && isOverlap) {
      warningTextEl.textContent = t('warnBleedGapOverlap', {
        bleed: state.bleedMm,
        minGap,
      });
    }
  }

  /**
   * Динамическое обновление заголовка приложения в шапке под текущий формат бумаги
   * Устраняет противоречие: когда выбран US Letter или 10x15, в шапке отображается реальный стандарт, а не "A4".
   */
  private updateAppHeaderTitle(paperFormatId?: string) {
    const titleEl = document.getElementById('headerAppTitle') || document.querySelector('.header-app-title');
    if (!titleEl) return;
    const formatId = paperFormatId || store.getState().paperFormatId || 'a4';
    const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';
    const newTitle = getAppTitleForFormat(formatId, lang);
    titleEl.textContent = newTitle;
  }

  /**
   * Обновление текста меток инпутов с учетом активной единицы измерения (мм / см / дюймы)
   */
  private updateUnitLabels(unit?: Unit) {
    const activeUnit = unit || store.getState().unit;
    const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';
    const symbol = getUnitSymbol(activeUnit, lang);

    const setLabel = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    const state = store.getState();
    if (state.stickerShape === 'circle') {
      setLabel('lblStickerWidth', t('lblDiameterUnit', { unit: symbol }));
    } else {
      setLabel('lblStickerWidth', t('lblWidthUnit', { unit: symbol }));
    }
    setLabel('lblStickerHeight', t('lblHeightUnit', { unit: symbol }));
    setLabel('lblCornerRadius', t('lblCornerRadiusUnit', { unit: symbol }));
    setLabel('lblMarginTop', t('lblMarginTopUnit', { unit: symbol }));
    setLabel('lblMarginBottom', t('lblMarginBottomUnit', { unit: symbol }));
    setLabel('lblMarginLeft', t('lblMarginLeftUnit', { unit: symbol }));
    setLabel('lblMarginRight', t('lblMarginRightUnit', { unit: symbol }));
    setLabel('lblGapX', t('lblGapXUnit', { unit: symbol }));
    setLabel('lblGapY', t('lblGapYUnit', { unit: symbol }));
    setLabel('lblCustomPageWidth', t('lblCustomPaperWidth', { unit: symbol }));
    setLabel('lblCustomPageHeight', t('lblCustomPaperHeight', { unit: symbol }));
    setLabel('lblThermalRollLength', t('lblRollLengthUnit', { unit: symbol }));
  }

  /**
   * Отображение информации об изображении и DPI
   */
  private updateImageStats(state: AppState) {
    const infoContainer = document.getElementById('imageInfoPanel');
    const dropPrompt = document.getElementById('dropZonePrompt');
    const dropThumb = document.getElementById('dropZoneThumb') as HTMLImageElement;

    if (!state.loadedImage) {
      if (infoContainer) infoContainer.style.display = 'none';
      if (dropPrompt) dropPrompt.style.display = 'block';
      if (dropThumb) dropThumb.style.display = 'none';
      return;
    }

    if (dropPrompt) dropPrompt.style.display = 'none';
    if (dropThumb) {
      dropThumb.style.display = 'block';
      dropThumb.src = state.croppedResult?.dataUrl || state.loadedImage.dataUrl;
    }

    if (infoContainer) {
      infoContainer.style.display = 'block';
      const dpi = state.effectiveDpi;
      const dpiInfo = getDpiInfo(state.croppedResult?.pixelWidth || state.loadedImage.sourceWidthPx, state.stickerWidthMm);

      const gradeTitleMap: Record<string, TranslationKey> = {
        excellent: 'dpiExcellentTitle',
        acceptable: 'dpiAcceptableTitle',
        low: 'dpiLowTitle',
        warning: 'dpiWarningTitle',
      };
      const gradeDescMap: Record<string, TranslationKey> = {
        excellent: 'dpiExcellentDesc',
        acceptable: 'dpiAcceptableDesc',
        low: 'dpiLowDesc',
        warning: 'dpiWarningDesc',
      };

      const dpiTitle = t(gradeTitleMap[dpiInfo.grade] || 'dpiAcceptableTitle');
      const dpiDesc = t(gradeDescMap[dpiInfo.grade] || 'dpiAcceptableDesc');

      const photoFraction = getSimplifiedAspectRatio(state.loadedImage.sourceWidthPx, state.loadedImage.sourceHeightPx);

      infoContainer.innerHTML = `
        <div class="image-stats-grid">
          <div><strong>${t('imgStatSource')}</strong> ${state.loadedImage.sourceWidthPx} × ${state.loadedImage.sourceHeightPx} px <span class="badge-ratio-val" style="margin-left: 4px; font-size: 0.72rem; padding: 1px 5px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-weight: 600;">${photoFraction}</span></div>
          <div><strong>${t('imgStatCropped')}</strong> ${state.croppedResult ? `${state.croppedResult.pixelWidth} × ${state.croppedResult.pixelHeight} px` : t('imgStatAuto')}</div>
        </div>
        <div class="dpi-badge-wrapper">
          <span class="dpi-badge" style="background-color: ${dpiInfo.color}18; color: ${dpiInfo.color}; border: 1px solid ${dpiInfo.color}40;">
            ● ${dpiTitle} — ${dpi} DPI
          </span>
          <p class="dpi-description">${dpiDesc}</p>
        </div>
      `;
    }
  }

  /**
   * Отображение сводки раскладки
   */
  private updateLayoutStats(state: AppState, layout: LayoutResult, pageDim: { widthMm: number; heightMm: number }) {
    const layoutSummary = document.getElementById('layoutSummaryStats');
    const layoutHeaderBadge = document.getElementById('layoutHeaderBadge');

    if (layoutHeaderBadge) {
      layoutHeaderBadge.textContent = t('itemsBadge', { count: layout.actualCopies });
    }

    if (layoutSummary) {
      if (layout.hasError) {
        layoutSummary.innerHTML = `
          <div class="alert alert-error">
            ⚠️ ${this.getLocalizedRecommendation(layout, state)}
          </div>
        `;
        return;
      }

      layoutSummary.innerHTML = `
        <div class="stats-card">
          <div class="stats-main-number">
            <span class="number">${layout.actualCopies}</span>
            <span class="label">${t('statStickersOnSheet')}</span>
          </div>
          <div class="stats-details">
            <div><strong>${t('statGrid')}</strong> ${t('statColsRows', { cols: layout.columns, rows: layout.rows })}</div>
            <div><strong>${t('statCapacity')}</strong> ${t('itemsBadge', { count: layout.totalCapacity })} ${state.requestedCopies !== 'AUTO' ? t('statRequested', { req: state.requestedCopies }) : ''}</div>
            <div><strong>${t('statStickerRotation')}</strong> ${layout.selectedRotation === 90 ? t('statRotated90') : t('statNoRotation')}</div>
          </div>
          <div class="recommendation-box">
            ${this.getLocalizedRecommendation(layout, state)}
          </div>
        </div>
      `;
    }

    // Обновление информационной полосы над превью (Apple HIG Capsule Chips)
    const previewHeaderStats = document.getElementById('previewHeaderStats');
    if (previewHeaderStats) {
      const pcsSuffix = t('previewMm') === 'мм' ? 'шт.' : 'pcs';
      const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';
      const unitSym = getUnitSymbol(state.unit, lang);
      const paperFormat = getPaperFormat(state.paperFormatId);
      const paperName = state.paperFormatId === 'custom' ? t('paperGroupCustom') : paperFormat.name;

      previewHeaderStats.innerHTML = `
        <span class="stat-chip" title="${t('chipSheet')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line></svg>
          <span class="stat-chip-label">${t('chipSheet')}:</span>
          <span class="stat-chip-val">${paperName} ${formatUnitValue(pageDim.widthMm, state.unit)} × ${formatUnitValue(pageDim.heightMm, state.unit)} ${unitSym}</span>
        </span>
        <span class="stat-chip" title="${t('chipSticker')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
          <span class="stat-chip-label">${t('chipSticker')}:</span>
          <span class="stat-chip-val">${formatUnitValue(state.stickerWidthMm, state.unit)} × ${formatUnitValue(state.stickerHeightMm, state.unit)} ${unitSym}</span>
        </span>
        <span class="stat-chip stat-chip-accent" title="${t('chipGrid')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span class="stat-chip-label">${t('chipGrid')}:</span>
          <span class="stat-chip-val">${layout.columns} × ${layout.rows} (${layout.actualCopies} ${pcsSuffix})</span>
        </span>
        <span class="stat-chip" title="${t('chipMargins')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3v18M19 3v18M3 5h18M3 19h18"></path></svg>
          <span class="stat-chip-label">${t('chipMargins')}:</span>
          <span class="stat-chip-val">${formatUnitValue(state.margins.top, state.unit)} ${unitSym}</span>
        </span>
        <span class="stat-chip" title="${t('chipGap')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
          <span class="stat-chip-label">${t('chipGap')}:</span>
          <span class="stat-chip-val">${formatUnitValue(state.gapX, state.unit)} ${unitSym}</span>
        </span>
      `;
    }

    // Обновление мобильного плавающего тулбара и бейджей табов
    const mobileStickyCount = document.getElementById('mobileStickyCount');
    const mobileStickyGrid = document.getElementById('mobileStickyGrid');
    const mobileTabBadge = document.getElementById('mobileTabBadge');

    if (mobileStickyCount) {
      mobileStickyCount.textContent = t('itemsBadge', { count: layout.actualCopies });
    }
    if (mobileStickyGrid) {
      mobileStickyGrid.textContent = t('mobileGrid', { cols: layout.columns, rows: layout.rows });
    }
    if (mobileTabBadge) {
      mobileTabBadge.textContent = `${layout.actualCopies}`;
    }
  }

  /**
   * Предупреждение о печати близко к краю листа (< 3 мм)
   */
  private updatePrintableAreaWarning(state: AppState) {
    const warningEl = document.getElementById('printableAreaWarning');
    if (!warningEl) return;

    const { top, bottom, left, right } = state.margins;
    const minMargin = Math.min(top, bottom, left, right);

    if (minMargin < 3) {
      warningEl.style.display = 'block';
      warningEl.innerHTML = t('warnPrintableArea', { min: minMargin });
    } else {
      warningEl.style.display = 'none';
    }
  }

  /**
   * Получение локализованного текста рекомендаций или ошибок раскладки
   */
  private getLocalizedRecommendation(layout: LayoutResult, state: AppState): string {
    if (layout.usableWidthMm <= 0 || layout.usableHeightMm <= 0) {
      return t('errMarginsExceed');
    }
    if (state.stickerWidthMm <= 0 || state.stickerHeightMm <= 0) {
      return t('errStickerSizeZero');
    }
    if (layout.totalCapacity === 0) {
      return t('errNoFit');
    }

    if (state.allowRotation) {
      if (layout.rotationRecommended) {
        return t('recBestRotated', { rot: layout.totalCapacity, orig: layout.alternativeCapacity });
      }
      if (layout.totalCapacity > layout.alternativeCapacity) {
        return t('recOptimalNoRotation', { orig: layout.totalCapacity, rot: layout.alternativeCapacity });
      }
      return t('recEqualCapacity', { cap: layout.totalCapacity });
    } else {
      if (layout.alternativeCapacity > layout.totalCapacity) {
        return t('recEnableRotation', { rot: layout.alternativeCapacity, orig: layout.totalCapacity });
      }
      return t('recPlacedNoRotation', { orig: layout.totalCapacity });
    }
  }

  /**
   * Обновление динамической подсказки о связывании размеров
   */
  private updateLockRatioHint(locked: boolean, customFraction?: string) {
    const hintEl = document.getElementById('lockRatioHint');
    if (hintEl) {
      if (locked && (this.isPhotoRatioActive || customFraction)) {
        const fraction = customFraction || (store.getState().loadedImage
          ? getSimplifiedAspectRatio(store.getState().loadedImage!.sourceWidthPx, store.getState().loadedImage!.sourceHeightPx)
          : null);
        if (fraction) {
          hintEl.textContent = t('hintLockRatioPhoto', { ratio: fraction });
          return;
        }
      }
      hintEl.textContent = t(locked ? 'hintLockRatioOn' : 'hintLockRatioOff');
    }
  }

  /**
   * Обновление интерактивного описания выбранного режима заполнения
   */
  private updateSizingExplanation(mode: 'fill' | 'fit') {
    const explainEl = document.getElementById('sizingExplanation');
    if (explainEl) {
      explainEl.innerHTML = t(mode === 'fill' ? 'explainSizingFill' : 'explainSizingFit');
    }
  }

  /**
   * Инлайн-валидация размеров стикера: динамическая проверка относительно габаритов выбранного листа
   */
  private validateStickerDimensions(widthMmOverride?: number | null, heightMmOverride?: number | null) {
    const errorBanner = document.getElementById('stickerSizeError');
    const inputWidth = document.getElementById('stickerWidth') as HTMLInputElement;
    const inputHeight = document.getElementById('stickerHeight') as HTMLInputElement;
    const state = store.getState();
    const pageDim = store.getPageDimensions();

    const parseNum = (val: string): number | null => {
      const sanitized = val.trim().replace(',', '.');
      if (!sanitized) return null;
      const num = parseFloat(sanitized);
      return isNaN(num) ? null : num;
    };

    // Если передан override, он уже в мм. Иначе парсим из инпута в state.unit и переводим в мм
    const wMm =
      widthMmOverride !== undefined
        ? widthMmOverride
        : inputWidth && parseNum(inputWidth.value) !== null
        ? toMm(parseNum(inputWidth.value)!, state.unit)
        : null;

    const hMm =
      heightMmOverride !== undefined
        ? heightMmOverride
        : inputHeight && parseNum(inputHeight.value) !== null
        ? toMm(parseNum(inputHeight.value)!, state.unit)
        : null;

    const maxSheetDim = Math.max(pageDim.widthMm, pageDim.heightMm);
    const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';
    const unitSym = getUnitSymbol(state.unit, lang);
    const maxValDisplay = formatUnitValue(maxSheetDim, state.unit);
    const minValDisplay = formatUnitValue(5, state.unit);

    let errorMessage: string | null = null;
    let hasErrorW = false;
    let hasErrorH = false;

    if (wMm !== null && wMm > maxSheetDim) {
      const displayVal = formatUnitValue(wMm, state.unit);
      errorMessage = t('errSizeExceedsSheetDynamic', { val: displayVal, max: maxValDisplay, unit: unitSym });
      hasErrorW = true;
    } else if (hMm !== null && hMm > maxSheetDim) {
      const displayVal = formatUnitValue(hMm, state.unit);
      errorMessage = t('errSizeExceedsSheetDynamic', { val: displayVal, max: maxValDisplay, unit: unitSym });
      hasErrorH = true;
    } else if ((wMm !== null && wMm < 5 && wMm > 0) || (hMm !== null && hMm < 5 && hMm > 0)) {
      errorMessage = t('errSizeTooSmallDynamic', { min: minValDisplay, unit: unitSym });
      if (wMm !== null && wMm < 5) hasErrorW = true;
      if (hMm !== null && hMm < 5) hasErrorH = true;
    }

    if (inputWidth) inputWidth.classList.toggle('input-has-error', hasErrorW);
    if (inputHeight) inputHeight.classList.toggle('input-has-error', hasErrorH);

    if (errorBanner) {
      if (errorMessage) {
        errorBanner.textContent = errorMessage;
        errorBanner.style.display = 'block';
      } else {
        errorBanner.style.display = 'none';
        errorBanner.textContent = '';
      }
    }
  }

  /**
   * Инициализация дизайнерского селектора бумаги и принтеров
   */
  private initPaperCatalog() {
    const chipA4 = document.getElementById('chipPaperA4');
    const chipThermal = document.getElementById('chipPaperThermal');
    const chipCustom = document.getElementById('chipPaperCustom');
    const chipLetter = document.getElementById('chipPaperLetter');
    const chipWb = document.getElementById('chipPaperWb');
    const chipPeriPage = document.getElementById('chipPaperPeriPage');
    const chipMore = document.getElementById('chipPaperMore');
    const btnOpenCatalogLink = document.getElementById('btnOpenCatalogLink');

    const paperSelect = document.getElementById('paperFormatSelect') as HTMLSelectElement;
    const morePaperGroup = document.getElementById('morePaperGroup');

    // Быстрые кнопки форматов (A4, Термо, Custom)
    chipA4?.addEventListener('click', () => {
      if (morePaperGroup) morePaperGroup.style.display = 'none';
      this.selectPaperFormat('a4');
    });
    chipThermal?.addEventListener('click', () => {
      if (morePaperGroup) morePaperGroup.style.display = 'none';
      const curFmt = getPaperFormat(store.getState().paperFormatId);
      if (curFmt.group === 'thermal') {
        // Уже выбран термопринтер - клик открывает полный каталог для смены принтера
        this.openPaperCatalog();
      } else {
        // Переключаемся на сохраненный или дефолтный термопринтер
        this.selectPaperFormat(this.lastThermalFormatId || 'peripage_57');
      }
    });
    chipCustom?.addEventListener('click', () => {
      if (morePaperGroup) morePaperGroup.style.display = 'none';
      this.selectPaperFormat('custom');
    });

    // Обратная совместимость с отдельными кнопками, если они вызываются в тестах
    chipLetter?.addEventListener('click', () => {
      if (morePaperGroup) morePaperGroup.style.display = 'none';
      this.selectPaperFormat('letter');
    });
    chipWb?.addEventListener('click', () => {
      if (morePaperGroup) morePaperGroup.style.display = 'none';
      this.selectPaperFormat('label_58x40');
    });
    chipPeriPage?.addEventListener('click', () => {
      if (morePaperGroup) morePaperGroup.style.display = 'none';
      this.selectPaperFormat('peripage_57');
    });

    // Открытие дизайнерского каталога по кнопке или всей карточке
    chipMore?.addEventListener('click', () => {
      this.openPaperCatalog();
    });
    btnOpenCatalogLink?.addEventListener('click', () => {
      this.openPaperCatalog();
    });

    const paperSummaryCard = document.getElementById('paperSummaryCard');
    paperSummaryCard?.addEventListener('click', () => {
      this.openPaperCatalog();
    });
    paperSummaryCard?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openPaperCatalog();
      }
    });

    // Синхронизация нативного селекта (для обратной совместимости)
    paperSelect?.addEventListener('change', () => {
      this.selectPaperFormat(paperSelect.value);
    });

    // Закрытие каталога
    const btnClose = document.getElementById('btnClosePaperCatalog');
    const btnDone = document.getElementById('btnDonePaperCatalog');
    const backdrop = document.getElementById('paperCatalogBackdrop');

    btnClose?.addEventListener('click', () => this.closePaperCatalog());
    btnDone?.addEventListener('click', () => this.closePaperCatalog());
    backdrop?.addEventListener('click', () => this.closePaperCatalog());

    // Клавиатура: Escape закрывает каталог
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const modal = document.getElementById('paperCatalogModal');
      if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
        this.closePaperCatalog();
      }
    });

    // Живой поиск в каталоге
    const searchInput = document.getElementById('paperCatalogSearch') as HTMLInputElement;
    const btnClearSearch = document.getElementById('btnClearPaperSearch');

    searchInput?.addEventListener('input', () => {
      this.catalogSearchQuery = searchInput.value.trim().toLowerCase();
      if (btnClearSearch) {
        btnClearSearch.style.display = this.catalogSearchQuery ? 'flex' : 'none';
      }
      this.renderCatalogCards();
    });

    btnClearSearch?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      this.catalogSearchQuery = '';
      if (btnClearSearch) btnClearSearch.style.display = 'none';
      this.renderCatalogCards();
    });

    // Табы категорий
    const tabs = document.querySelectorAll('.catalog-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCatalogCategory = (tab as HTMLElement).dataset.cat || 'all';
        this.renderCatalogCards();
      });
    });
  }

  /**
   * Открытие дизайнерского каталога форматов и принтеров
   */
  public openPaperCatalog() {
    const modal = document.getElementById('paperCatalogModal');
    if (!modal) return;

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('open');
    });
    document.body.style.overflow = 'hidden';

    // Рендерим актуальные карточки с текущими единицами и языком
    this.renderCatalogCards();

    // На десктопе даем фокус на поиск
    if (window.innerWidth > 768) {
      setTimeout(() => {
        const searchInput = document.getElementById('paperCatalogSearch') as HTMLInputElement;
        searchInput?.focus();
      }, 100);
    }
  }

  /**
   * Закрыть каталог форматов
   */
  public closePaperCatalog() {
    const modal = document.getElementById('paperCatalogModal');
    if (!modal) return;

    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }, 200);
  }

  /**
   * Применение выбранного формата бумаги и принтера
   * Включает логику "Smart Zero Margins": для рулонов/термопринтеров ставит поля 0 мм
   */
  public async selectPaperFormat(formatId: string) {
    const curFormat = getPaperFormat(store.getState().paperFormatId);
    const newFormat = getPaperFormat(formatId);
    const updates: any = { paperFormatId: formatId };

    const curMargins = store.getState().margins;
    const isCurStandard = curMargins.top === 5 && curMargins.bottom === 5 && curMargins.left === 5 && curMargins.right === 5;
    const isCurZero = curMargins.top === 0 && curMargins.bottom === 0 && curMargins.left === 0 && curMargins.right === 0;

    if (newFormat.group === 'thermal') {
      this.lastThermalFormatId = formatId;
      // При переходе на термопринтер сбрасываем поля в 0 мм для печати в край рулона
      if (isCurStandard) {
        updates.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      }
      // Для всех термопринтеров задаем длину ленты/этикетки по умолчанию, если не была задана
      if (!store.getState().rollLengthMm || store.getState().rollLengthMm <= 0 || curFormat.group !== 'thermal') {
        updates.rollLengthMm = newFormat.defaultRollLengthMm || newFormat.heightMm;
      }
    } else if (newFormat.group === 'iso' || newFormat.group === 'ansi') {
      // При возврате с термопринтера на офисный лист восстанавливаем рекомендуемые поля 5 мм
      if (curFormat.group === 'thermal' && isCurZero) {
        updates.margins = { top: 5, bottom: 5, left: 5, right: 5 };
      }
    }

    store.update(updates);

    // Скрываем блок customPaperGroup если не custom
    const customPaperGroup = document.getElementById('customPaperGroup');
    if (customPaperGroup) {
      customPaperGroup.style.display = formatId === 'custom' ? 'flex' : 'none';
    }

    // Для ВСЕХ термопринтеров показываем блок настройки длины
    const thermalRollGroup = document.getElementById('thermalRollGroup');
    if (thermalRollGroup) {
      thermalRollGroup.style.display = isThermalPaperFormat(formatId) ? 'flex' : 'none';
    }

    // Гарантируем скрытие рудиментарного блока morePaperGroup
    const morePaperGroup = document.getElementById('morePaperGroup');
    if (morePaperGroup) {
      morePaperGroup.style.display = 'none';
    }

    await this.recalculateArtwork();
  }

  /**
   * Отрисовка списка карточек в дизайнерском каталоге
   */
  private renderCatalogCards() {
    const grid = document.getElementById('paperCatalogCardsGrid');
    const noResults = document.getElementById('catalogNoResults');
    if (!grid) return;

    grid.innerHTML = '';
    const state = store.getState();
    const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';
    const unitSymbol = getUnitSymbol(state.unit, lang);
    const query = this.catalogSearchQuery;
    const activeCat = this.activeCatalogCategory;

    let matchedCount = 0;

    PAPER_FORMATS.forEach((fmt) => {
      // Фильтр по категории
      if (activeCat !== 'all') {
        if (activeCat === 'custom' && fmt.id !== 'custom') return;
        if (activeCat !== 'custom' && fmt.group !== activeCat) return;
      }

      // Фильтр по поисковому запросу
      if (query) {
        const descRu = (fmt.descriptionRu || '').toLowerCase();
        const descEn = (fmt.descriptionEn || '').toLowerCase();
        const name = fmt.name.toLowerCase();
        const id = fmt.id.toLowerCase();
        const kw = (fmt.keywords || []).join(' ').toLowerCase();
        const terms = `${name} ${id} ${descRu} ${descEn} ${kw}`;
        if (!terms.includes(query)) return;
      }

      matchedCount++;

      const isSelected = state.paperFormatId.toLowerCase() === fmt.id.toLowerCase();
      const card = document.createElement('div');
      card.className = `catalog-card ${isSelected ? 'active' : ''}`;
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      card.setAttribute('tabindex', '0');
      card.dataset.paper = fmt.id;

      // SVG Иконка
      const iconSvg = getPaperFormatSvgIcon(fmt.group, fmt.id);

      // Размеры
      let dimText = '';
      if (fmt.id === 'custom') {
        const w = formatUnitValue(state.customPageWidthMm, state.unit);
        const h = formatUnitValue(state.customPageHeightMm, state.unit);
        dimText = `${w} × ${h} ${unitSymbol}`;
      } else if (fmt.isRoll) {
        const w = formatUnitValue(fmt.widthMm, state.unit);
        const h = formatUnitValue(state.paperFormatId === fmt.id ? state.rollLengthMm : (fmt.defaultRollLengthMm || fmt.heightMm), state.unit);
        dimText = `${w} × ${h} ${unitSymbol}`;
      } else {
        const w = formatUnitValue(fmt.widthMm, state.unit);
        const h = formatUnitValue(fmt.heightMm, state.unit);
        dimText = `${w} × ${h} ${unitSymbol}`;
      }

      // Бейджи
      const badgesHtml: string[] = [];
      if (fmt.id === 'a4' || fmt.id === 'label_58x40' || fmt.id === 'peripage_57' || fmt.id === 'roll_80') {
        badgesHtml.push(`<span class="card-badge card-badge-popular">${t('badgePopular')}</span>`);
      }
      if (fmt.group === 'thermal') {
        badgesHtml.push(`<span class="card-badge card-badge-roll">${t('badgeRoll')}</span>`);
        badgesHtml.push(`<span class="card-badge card-badge-zero">${t('badgeZeroMargins')}</span>`);
      }

      const desc = lang === 'ru' ? fmt.descriptionRu : fmt.descriptionEn;
      const displayName = lang === 'ru' ? fmt.name : fmt.name.replace('мм', 'mm');

      card.innerHTML = `
        <div class="card-header-row">
          <span class="card-icon" aria-hidden="true">${iconSvg}</span>
          <span class="card-name">${displayName}</span>
        </div>
        <div class="card-meta-row">
          <span class="card-dimensions">${dimText}</span>
          ${badgesHtml.length > 0 ? `<div class="card-badges">${badgesHtml.join('')}</div>` : ''}
        </div>
        <div class="card-description">${desc}</div>
      `;

      const selectThis = async () => {
        await this.selectPaperFormat(fmt.id);
        this.closePaperCatalog();
      };

      card.addEventListener('click', selectThis);
      card.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectThis();
        }
      });

      grid.appendChild(card);
    });

    if (noResults) {
      noResults.style.display = matchedCount === 0 ? 'block' : 'none';
    }
  }

  /**
   * Обновление информативной карточки активного формата бумаги и принтера
   */
  private updatePaperSummaryCard(state: AppState) {
    const cardTitle = document.getElementById('paperSummaryTitle');
    const cardDesc = document.getElementById('paperSummaryDesc');
    const cardIcon = document.getElementById('paperSummaryIcon');
    const badgeMargins = document.getElementById('badgeSmartMargins');

    const fmt = getPaperFormat(state.paperFormatId);
    const lang = (localStorage.getItem('sticker_sheet_lang') as 'ru' | 'en') || 'ru';

    if (cardIcon) {
      cardIcon.innerHTML = getPaperFormatSvgIcon(fmt.group, fmt.id);
    }

    const { title, subtitle } = getPaperCardDisplayInfo(state.paperFormatId, state, lang);
    if (cardTitle) {
      cardTitle.textContent = title;
    }
    if (cardDesc) {
      cardDesc.textContent = subtitle;
    }

    const isThermal = fmt.group === 'thermal';
    if (badgeMargins) {
      if (isThermal) {
        badgeMargins.className = 'badge-smart-margins badge-zero';
        badgeMargins.textContent = t('badgeZeroMargins');
      } else {
        badgeMargins.className = 'badge-smart-margins badge-std';
        badgeMargins.textContent = t('badgeStandardMargins');
      }
    }

    const hintEl = document.getElementById('paperFormatHint');
    if (hintEl) {
      if (isThermal) {
        hintEl.textContent = lang === 'ru' 
          ? 'Термопринтер: поля автоматически сброшены в 0 мм для печати в край рулона или этикетки.' 
          : 'Thermal printer: margins auto-reset to 0 mm for edge-to-edge printing.';
      } else {
        hintEl.textContent = lang === 'ru'
          ? 'Рекомендуемые поля для листовой офисной печати: 3–5 мм.'
          : 'Recommended sheet margins: 3–5 mm.';
      }
    }
  }
}

function getPaperFormatSvgIcon(group: string, id: string): string {
  if (group === 'thermal') {
    if (id === 'peripage_57') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="3"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="16" y2="14"></line></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
  }
  if (group === 'photo') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
  }
  if (group === 'custom') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"></path><path d="m14.5 12.5 2-2"></path><path d="m11.5 9.5 2-2"></path><path d="m8.5 6.5 2-2"></path><path d="m17.5 15.5 2-2"></path></svg>`;
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
}

function getShortPaperFormatName(formatId: string, lang: 'ru' | 'en'): string {
  switch (formatId) {
    case 'label_58x40':
      return '58 × 40 мм';
    case 'peripage_57':
      return lang === 'ru' ? 'Лента 57 мм' : '57mm Roll';
    case 'roll_80':
      return lang === 'ru' ? 'Рулон 80 мм' : '80mm Roll';
    case 'label_50x30':
      return '50 × 30 мм';
    case 'label_4x6':
      return '100 × 150 мм';
    case 'photo_10x15':
      return '10 × 15 см';
    case 'letter':
      return 'US Letter';
    case 'legal':
      return 'US Legal';
    case 'tabloid':
      return 'Tabloid';
    case 'half_letter':
      return 'Half Letter';
    case 'a3':
      return 'A3';
    case 'a5':
      return 'A5';
    case 'a6':
      return 'A6';
    case 'custom':
      return lang === 'ru' ? 'Свой размер' : 'Custom Size';
    default: {
      const fmt = getPaperFormat(formatId);
      return fmt.name.replace(/\s*\(.*\)/, '').trim();
    }
  }
}

function getPaperCardDisplayInfo(
  formatId: string,
  state: AppState,
  lang: 'ru' | 'en'
): { title: string; subtitle: string } {
  const isRu = lang === 'ru';
  const unitSymbol = getUnitSymbol(state.unit, lang);
  const pageDim = store.getPageDimensions();
  const wVal = formatUnitValue(pageDim.widthMm, state.unit);
  const hVal = formatUnitValue(pageDim.heightMm, state.unit);

  switch (formatId) {
    case 'a4':
      return {
        title: `A4 (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Офисный лист' : 'Office paper sheet',
      };
    case 'a3':
      return {
        title: `A3 (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Большой лист' : 'Large sheet',
      };
    case 'a5':
      return {
        title: `A5 (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Половина A4' : 'Half of A4',
      };
    case 'a6':
      return {
        title: `A6 (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Открытка' : 'Postcard',
      };
    case 'peripage_57': {
      const rollH = formatUnitValue(state.rollLengthMm || 80, state.unit);
      return {
        title: isRu ? `Лента ${wVal} × ${rollH} ${unitSymbol}` : `${wVal} × ${rollH} ${unitSymbol} Roll`,
        subtitle: isRu ? 'Карманные принтеры' : 'Pocket mini printers',
      };
    }
    case 'roll_80': {
      const rollH = formatUnitValue(state.rollLengthMm || 100, state.unit);
      return {
        title: isRu ? `Рулон ${wVal} × ${rollH} ${unitSymbol}` : `${wVal} × ${rollH} ${unitSymbol} Roll`,
        subtitle: isRu ? 'Кассовая лента' : 'POS receipt roll',
      };
    }
    case 'label_58x40':
      return {
        title: isRu ? `Этикетка ${wVal} × ${hVal} ${unitSymbol}` : `${wVal} × ${hVal} ${unitSymbol} Label`,
        subtitle: isRu ? 'Wildberries, Ozon' : 'Wildberries, Ozon',
      };
    case 'label_50x30':
      return {
        title: isRu ? `Этикетка ${wVal} × ${hVal} ${unitSymbol}` : `${wVal} × ${hVal} ${unitSymbol} Label`,
        subtitle: isRu ? 'Штрихкоды, ценники' : 'Barcodes & tags',
      };
    case 'label_4x6':
      return {
        title: isRu ? `Этикетка 100 × 150 мм` : `100 × 150 mm Label`,
        subtitle: isRu ? 'Накладная WB, Ozon' : 'Shipping label 4×6"',
      };
    case 'photo_10x15':
      return {
        title: isRu ? `Фотобумага ${wVal} × ${hVal} ${unitSymbol}` : `Photo ${wVal} × ${hVal} ${unitSymbol}`,
        subtitle: isRu ? 'Фотопечать' : 'Photo print',
      };
    case 'letter':
      return {
        title: `US Letter (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Стандарт США' : 'US Standard',
      };
    case 'legal':
      return {
        title: `US Legal (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Длинный лист США' : 'US Legal sheet',
      };
    case 'tabloid':
      return {
        title: `US Tabloid (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Формат Tabloid' : 'Tabloid format',
      };
    case 'half_letter':
      return {
        title: `Half Letter (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Половина Letter' : 'Half of Letter',
      };
    case 'custom':
      return {
        title: isRu ? `Свой размер (${wVal} × ${hVal} ${unitSymbol})` : `Custom (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? 'Свои параметры' : 'Custom size',
      };
    default: {
      const fmt = getPaperFormat(formatId);
      return {
        title: `${fmt.name} (${wVal} × ${hVal} ${unitSymbol})`,
        subtitle: isRu ? fmt.descriptionRu.slice(0, 26) : fmt.descriptionEn.slice(0, 26),
      };
    }
  }
}

