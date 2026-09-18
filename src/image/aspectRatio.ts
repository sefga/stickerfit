import { roundMm } from '../units/mm';

export interface PhotoRatioInfo {
  ratio: number; // width / height
  fraction: string; // например '4:3', '16:9', '1:1'
  widthMm: number;
  heightMm: number;
}

const COMMON_RATIOS: Array<{ ratio: number; label: string }> = [
  { ratio: 1 / 1, label: '1:1' },
  { ratio: 4 / 3, label: '4:3' },
  { ratio: 3 / 4, label: '3:4' },
  { ratio: 3 / 2, label: '3:2' },
  { ratio: 2 / 3, label: '2:3' },
  { ratio: 16 / 9, label: '16:9' },
  { ratio: 9 / 16, label: '9:16' },
  { ratio: 5 / 4, label: '5:4' },
  { ratio: 4 / 5, label: '4:5' },
  { ratio: 16 / 10, label: '16:10' },
  { ratio: 21 / 9, label: '21:9' },
  { ratio: 2 / 1, label: '2:1' },
  { ratio: 1 / 2, label: '1:2' },
];

/**
 * Нахождение наибольшего общего делителя
 */
function gcd(a: number, b: number): number {
  let x = Math.round(Math.abs(a));
  let y = Math.round(Math.abs(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Преобразование пиксельных размеров в красивое строковое соотношение сторон (например, 16:9, 4:3, 1:1)
 */
export function getSimplifiedAspectRatio(widthPx: number, heightPx: number): string {
  if (!widthPx || !heightPx || widthPx <= 0 || heightPx <= 0) {
    return '1:1';
  }

  const rawRatio = widthPx / heightPx;

  // 1. Проверяем близость к распространенным стандартам фотографии и дисплеев (погрешность до 2.5%)
  for (const item of COMMON_RATIOS) {
    if (Math.abs(rawRatio - item.ratio) / item.ratio <= 0.025) {
      return item.label;
    }
  }

  // 2. Пробуем упростить через НОД, если числа небольшие
  const divisor = gcd(widthPx, heightPx);
  const simpW = Math.round(widthPx / divisor);
  const simpH = Math.round(heightPx / divisor);

  if (simpW <= 20 && simpH <= 20) {
    return `${simpW}:${simpH}`;
  }

  // 3. Для нестандартных соотношений возвращаем формат X.XX:1
  return `${rawRatio.toFixed(2)}:1`;
}

/**
 * Расчет высоты по заданной ширине с сохранением соотношения сторон
 */
export function calculateHeightFromWidth(widthMm: number, ratio: number, maxHeightMm?: number): number {
  if (ratio <= 0 || widthMm <= 0) return widthMm;
  let height = roundMm(widthMm / ratio, 1);
  if (maxHeightMm && height > maxHeightMm) {
    height = roundMm(maxHeightMm, 1);
  }
  return Math.max(1, height);
}

/**
 * Расчет ширины по заданной высоте с сохранением соотношения сторон
 */
export function calculateWidthFromHeight(heightMm: number, ratio: number, maxWidthMm?: number): number {
  if (ratio <= 0 || heightMm <= 0) return heightMm;
  let width = roundMm(heightMm * ratio, 1);
  if (maxWidthMm && width > maxWidthMm) {
    width = roundMm(maxWidthMm, 1);
  }
  return Math.max(1, width);
}

/**
 * Комплексный подбор размеров стикера строго под соотношение сторон фотографии
 * с автоматическим контролем вместимости в печатную область листа бумаги
 */
export function fitDimensionsToPhotoRatio(params: {
  currentWidthMm: number;
  currentHeightMm: number;
  photoWidthPx: number;
  photoHeightPx: number;
  maxPageWidthMm: number;
  maxPageHeightMm: number;
}): PhotoRatioInfo {
  const {
    currentWidthMm,
    photoWidthPx,
    photoHeightPx,
    maxPageWidthMm,
    maxPageHeightMm,
  } = params;

  if (photoWidthPx <= 0 || photoHeightPx <= 0) {
    return {
      ratio: 1,
      fraction: '1:1',
      widthMm: Math.min(currentWidthMm, maxPageWidthMm),
      heightMm: Math.min(params.currentHeightMm, maxPageHeightMm),
    };
  }

  const ratio = photoWidthPx / photoHeightPx;
  const fraction = getSimplifiedAspectRatio(photoWidthPx, photoHeightPx);

  // Берем за основу текущую ширину стикера (например, 54 мм)
  let targetWidth = currentWidthMm > 0 ? currentWidthMm : 54;
  let targetHeight = roundMm(targetWidth / ratio, 1);

  // Если вычисленная высота превышает допустимую высоту листа бумаги
  if (targetHeight > maxPageHeightMm) {
    targetHeight = roundMm(maxPageHeightMm, 1);
    targetWidth = roundMm(targetHeight * ratio, 1);
  }

  // Если ширина превышает допустимую ширину листа бумаги
  if (targetWidth > maxPageWidthMm) {
    targetWidth = roundMm(maxPageWidthMm, 1);
    targetHeight = roundMm(targetWidth / ratio, 1);
  }

  // Гарантируем минимальный размер 5 мм (минимальный печатный стикер)
  targetWidth = Math.max(5, roundMm(targetWidth, 1));
  targetHeight = Math.max(5, roundMm(targetHeight, 1));

  return {
    ratio,
    fraction,
    widthMm: targetWidth,
    heightMm: targetHeight,
  };
}
