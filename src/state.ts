import { Margins, SpacingMode } from './layout/layoutEngine';
import { CutMarksConfig, DEFAULT_CUT_MARKS_CONFIG } from './pdf/cutMarks';
import { CropData, CroppedResult, SizingMode } from './image/cropEngine';
import { LoadedImage } from './image/imageLoader';
import { parseUrlSettings } from './urlParams';
import { Unit } from './units/units';
import { calculatePageDimensions, DEFAULT_PAPER_FORMAT_ID } from './units/paperFormats';

export type PageOrientation = 'portrait' | 'landscape';

export type PngDpi = 150 | 300 | 600;

export interface AppSettings {
  unit: Unit;
  paperFormatId: string;
  customPageWidthMm: number;
  customPageHeightMm: number;
  rollLengthMm: number;
  pageOrientation: PageOrientation;
  stickerWidthMm: number;
  stickerHeightMm: number;
  lockAspectRatio: boolean;
  sizingMode: SizingMode;
  margins: Margins;
  linkMargins: boolean;
  gapX: number;
  gapY: number;
  linkGaps: boolean;
  spacingMode: SpacingMode;
  allowRotation: boolean;
  requestedCopies: number | 'AUTO';
  cutMarks: CutMarksConfig;
  bleedMm: number;
  pngDpi: PngDpi;
}

export interface AppState extends AppSettings {
  // Данные изображения (не сохраняются в LocalStorage)
  loadedImage: LoadedImage | null;
  cropData: CropData | null;
  croppedResult: CroppedResult | null;
  effectiveDpi: number;
  // Флаги интерфейса
  isCropping: boolean;
}

const STORAGE_KEY = 'sticker_sheet_a4_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  unit: 'mm',
  paperFormatId: DEFAULT_PAPER_FORMAT_ID, // 'a4'
  customPageWidthMm: 210,
  customPageHeightMm: 297,
  rollLengthMm: 80,
  pageOrientation: 'portrait',
  stickerWidthMm: 54.0,
  stickerHeightMm: 85.0,
  lockAspectRatio: false,
  sizingMode: 'fill',
  margins: { top: 5, bottom: 5, left: 5, right: 5 },
  linkMargins: true,
  gapX: 3,
  gapY: 3,
  linkGaps: true,
  spacingMode: 'center',
  allowRotation: true,
  requestedCopies: 'AUTO',
  cutMarks: { ...DEFAULT_CUT_MARKS_CONFIG },
  bleedMm: 0,
  pngDpi: 300,
};

function loadSettings(): AppSettings {
  let settings: AppSettings = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      settings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        margins: { ...DEFAULT_SETTINGS.margins, ...(parsed.margins || {}) },
        cutMarks: { ...DEFAULT_CUT_MARKS_CONFIG, ...(parsed.cutMarks || {}) },
      };
    }
  } catch (e) {
    console.warn('Не удалось загрузить настройки из LocalStorage:', e);
  }

  // Применяем параметры из адресной строки (Smart Deeplinks от ChatGPT/поиска), если они переданы
  if (typeof window !== 'undefined' && window.location?.search) {
    const urlOverrides = parseUrlSettings(window.location.search);
    settings = {
      ...settings,
      ...urlOverrides,
      margins: { ...settings.margins, ...(urlOverrides.margins || {}) },
      cutMarks: { ...settings.cutMarks, ...(urlOverrides.cutMarks || {}) },
    };
  }

  return settings;
}

export function saveSettings(settings: AppSettings): void {
  try {
    const toSave: AppSettings = {
      unit: settings.unit,
      paperFormatId: settings.paperFormatId,
      customPageWidthMm: settings.customPageWidthMm,
      customPageHeightMm: settings.customPageHeightMm,
      rollLengthMm: settings.rollLengthMm,
      pageOrientation: settings.pageOrientation,
      stickerWidthMm: settings.stickerWidthMm,
      stickerHeightMm: settings.stickerHeightMm,
      lockAspectRatio: settings.lockAspectRatio,
      sizingMode: settings.sizingMode,
      margins: settings.margins,
      linkMargins: settings.linkMargins,
      gapX: settings.gapX,
      gapY: settings.gapY,
      linkGaps: settings.linkGaps,
      spacingMode: settings.spacingMode,
      allowRotation: settings.allowRotation,
      requestedCopies: settings.requestedCopies,
      cutMarks: settings.cutMarks,
      bleedMm: settings.bleedMm,
      pngDpi: settings.pngDpi || 300,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Не удалось сохранить настройки в LocalStorage:', e);
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Не удалось очистить настройки LocalStorage:', e);
  }
}

export class AppStore {
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();

  constructor() {
    const initialSettings = loadSettings();
    this.state = {
      ...initialSettings,
      loadedImage: null,
      cropData: null,
      croppedResult: null,
      effectiveDpi: 0,
      isCropping: false,
    };
  }

  public getState(): AppState {
    return this.state;
  }

  public getPageDimensions(): { widthMm: number; heightMm: number } {
    return calculatePageDimensions(
      this.state.paperFormatId,
      this.state.customPageWidthMm,
      this.state.customPageHeightMm,
      this.state.pageOrientation,
      this.state.rollLengthMm
    );
  }

  public update(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    saveSettings(this.state);
    this.notify();
  }

  public resetToDefaults(): void {
    clearSettings();
    this.state = {
      ...DEFAULT_SETTINGS,
      loadedImage: this.state.loadedImage,
      cropData: null,
      croppedResult: this.state.croppedResult,
      effectiveDpi: this.state.effectiveDpi,
      isCropping: false,
    };
    saveSettings(this.state);
    this.notify();
  }

  public subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('Ошибка в подписчике состояния:', e);
      }
    }
  }
}

export const store = new AppStore();
