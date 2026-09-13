import { roundMm } from '../units/mm';

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type SpacingMode = 'center' | 'start' | 'justify';

export interface LayoutInput {
  pageWidthMm: number;
  pageHeightMm: number;
  stickerWidthMm: number;
  stickerHeightMm: number;
  margins: Margins;
  gapX: number;
  gapY: number;
  allowRotation: boolean;
  requestedCopies?: number | 'AUTO';
  spacingMode?: SpacingMode;
}

export interface StickerPosition {
  index: number;
  col: number;
  row: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: 0 | 90;
}

export interface OrientationCalculation {
  rotation: 0 | 90;
  stickerWidthMm: number;
  stickerHeightMm: number;
  columns: number;
  rows: number;
  capacity: number;
  gridWidthMm: number;
  gridHeightMm: number;
  offsetX: number;
  offsetY: number;
  effectiveGapX: number;
  effectiveGapY: number;
}

export interface LayoutResult {
  selectedRotation: 0 | 90;
  columns: number;
  rows: number;
  totalCapacity: number;
  actualCopies: number;
  requestedCopies: number | 'AUTO';
  positions: StickerPosition[];
  usableWidthMm: number;
  usableHeightMm: number;
  alternativeCapacity: number;
  rotationRecommended: boolean;
  recommendationMessage: string;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Рассчитывает сетку для заданной ориентации стикера
 */
function calculateForOrientation(
  usableWidth: number,
  usableHeight: number,
  stickerW: number,
  stickerH: number,
  gapX: number,
  gapY: number,
  marginLeft: number,
  marginTop: number,
  rotation: 0 | 90,
  spacingMode: SpacingMode = 'center'
): OrientationCalculation {
  // Защита от некорректных размеров
  if (usableWidth <= 0 || usableHeight <= 0 || stickerW <= 0 || stickerH <= 0) {
    return {
      rotation,
      stickerWidthMm: stickerW,
      stickerHeightMm: stickerH,
      columns: 0,
      rows: 0,
      capacity: 0,
      gridWidthMm: 0,
      gridHeightMm: 0,
      offsetX: marginLeft,
      offsetY: marginTop,
      effectiveGapX: gapX,
      effectiveGapY: gapY,
    };
  }

  // Используем epsilon 1e-9 для исключения погрешностей чисел с плавающей точкой
  const EPSILON = 1e-9;
  const cols = Math.max(0, Math.floor((usableWidth + gapX + EPSILON) / (stickerW + gapX)));
  const rows = Math.max(0, Math.floor((usableHeight + gapY + EPSILON) / (stickerH + gapY)));
  const capacity = cols * rows;

  const gridWidthMm = cols > 0 ? roundMm(cols * stickerW + (cols - 1) * gapX, 3) : 0;
  const gridHeightMm = rows > 0 ? roundMm(rows * stickerH + (rows - 1) * gapY, 3) : 0;

  const remainingX = Math.max(0, usableWidth - gridWidthMm);
  const remainingY = Math.max(0, usableHeight - gridHeightMm);

  let offsetX = marginLeft;
  let offsetY = marginTop;
  let effectiveGapX = gapX;
  let effectiveGapY = gapY;

  if (spacingMode === 'start') {
    // Точные поля листа: первый стикер начинается строго от полей, остаток не складывается с полями
    offsetX = marginLeft;
    offsetY = marginTop;
    effectiveGapX = gapX;
    effectiveGapY = gapY;
  } else if (spacingMode === 'justify') {
    // Равномерное распределение: остаток поровну распределяется между зазорами
    if (cols > 1 && remainingX > 0) {
      effectiveGapX = roundMm(gapX + remainingX / (cols - 1), 3);
      offsetX = marginLeft;
    } else {
      offsetX = roundMm(marginLeft + (remainingX > 0 ? remainingX / 2 : 0), 3);
      effectiveGapX = gapX;
    }

    if (rows > 1 && remainingY > 0) {
      effectiveGapY = roundMm(gapY + remainingY / (rows - 1), 3);
      offsetY = marginTop;
    } else {
      offsetY = roundMm(marginTop + (remainingY > 0 ? remainingY / 2 : 0), 3);
      effectiveGapY = gapY;
    }
  } else {
    // По умолчанию ('center'): центрирование сетки внутри доступной области листа
    offsetX = roundMm(marginLeft + (remainingX > 0 ? remainingX / 2 : 0), 3);
    offsetY = roundMm(marginTop + (remainingY > 0 ? remainingY / 2 : 0), 3);
    effectiveGapX = gapX;
    effectiveGapY = gapY;
  }

  return {
    rotation,
    stickerWidthMm: stickerW,
    stickerHeightMm: stickerH,
    columns: cols,
    rows: rows,
    capacity,
    gridWidthMm,
    gridHeightMm,
    offsetX,
    offsetY,
    effectiveGapX,
    effectiveGapY,
  };
}

/**
 * Чистая математическая функция расчета раскладки стикеров на листе.
 * Не зависит от DOM, Canvas или PDF.
 */
export function calculateLayout(input: LayoutInput): LayoutResult {
  const {
    pageWidthMm,
    pageHeightMm,
    stickerWidthMm,
    stickerHeightMm,
    margins,
    gapX,
    gapY,
    allowRotation,
    requestedCopies = 'AUTO',
    spacingMode = 'center',
  } = input;

  const usableWidth = roundMm(pageWidthMm - margins.left - margins.right, 3);
  const usableHeight = roundMm(pageHeightMm - margins.top - margins.bottom, 3);

  if (usableWidth <= 0 || usableHeight <= 0) {
    return {
      selectedRotation: 0,
      columns: 0,
      rows: 0,
      totalCapacity: 0,
      actualCopies: 0,
      requestedCopies,
      positions: [],
      usableWidthMm: Math.max(0, usableWidth),
      usableHeightMm: Math.max(0, usableHeight),
      alternativeCapacity: 0,
      rotationRecommended: false,
      recommendationMessage: 'Поля превышают размер листа бумаги.',
      hasError: true,
      errorMessage: 'Поля превышают размер листа бумаги.',
    };
  }

  if (stickerWidthMm <= 0 || stickerHeightMm <= 0) {
    return {
      selectedRotation: 0,
      columns: 0,
      rows: 0,
      totalCapacity: 0,
      actualCopies: 0,
      requestedCopies,
      positions: [],
      usableWidthMm: usableWidth,
      usableHeightMm: usableHeight,
      alternativeCapacity: 0,
      rotationRecommended: false,
      recommendationMessage: 'Размеры стикера должны быть больше 0.',
      hasError: true,
      errorMessage: 'Размеры стикера должны быть больше 0.',
    };
  }

  // Вариант A: исходная ориентация (rotation = 0, W x H)
  const optionA = calculateForOrientation(
    usableWidth,
    usableHeight,
    stickerWidthMm,
    stickerHeightMm,
    gapX,
    gapY,
    margins.left,
    margins.top,
    0,
    spacingMode
  );

  // Вариант B: повернутая ориентация на 90° (rotation = 90, H x W)
  const optionB = calculateForOrientation(
    usableWidth,
    usableHeight,
    stickerHeightMm,
    stickerWidthMm,
    gapX,
    gapY,
    margins.left,
    margins.top,
    90,
    spacingMode
  );

  let selectedOption: OrientationCalculation;
  let alternativeOption: OrientationCalculation;
  let rotationRecommended = false;
  let recommendationMessage = '';

  if (allowRotation) {
    if (optionB.capacity > optionA.capacity) {
      selectedOption = optionB;
      alternativeOption = optionA;
      rotationRecommended = true;
      recommendationMessage = `Лучшее размещение: с поворотом 90° — ${optionB.capacity} шт. вместо ${optionA.capacity} шт.`;
    } else if (optionA.capacity > optionB.capacity) {
      selectedOption = optionA;
      alternativeOption = optionB;
      rotationRecommended = false;
      recommendationMessage = `Оптимально без поворота: ${optionA.capacity} шт. (с поворотом — ${optionB.capacity} шт.)`;
    } else {
      // Равная вместимость — выбираем исходную ориентацию
      selectedOption = optionA;
      alternativeOption = optionB;
      rotationRecommended = false;
      recommendationMessage = `Одинаковая вместимость (${optionA.capacity} шт.) в обоих вариантах.`;
    }
  } else {
    selectedOption = optionA;
    alternativeOption = optionB;
    if (optionB.capacity > optionA.capacity) {
      recommendationMessage = `С поворотом на 90° поместится больше: ${optionB.capacity} шт. вместо ${optionA.capacity} шт. Включите автоповорот.`;
    } else {
      recommendationMessage = `Размещение без поворота: ${optionA.capacity} шт.`;
    }
  }

  const hasError = selectedOption.capacity === 0;
  const errorMessage = hasError
    ? 'Стикер не помещается в доступную область листа с текущими полями.'
    : undefined;

  // Определение фактического количества копий
  let actualCopies = selectedOption.capacity;
  if (typeof requestedCopies === 'number' && requestedCopies > 0) {
    actualCopies = Math.min(requestedCopies, selectedOption.capacity);
  }

  // Расчет позиций каждого экземпляра стикера
  const positions: StickerPosition[] = [];
  let stickerCount = 0;

  for (let r = 0; r < selectedOption.rows && stickerCount < actualCopies; r++) {
    for (let c = 0; c < selectedOption.columns && stickerCount < actualCopies; c++) {
      const xMm = roundMm(selectedOption.offsetX + c * (selectedOption.stickerWidthMm + selectedOption.effectiveGapX), 3);
      const yMm = roundMm(selectedOption.offsetY + r * (selectedOption.stickerHeightMm + selectedOption.effectiveGapY), 3);

      positions.push({
        index: stickerCount,
        col: c,
        row: r,
        xMm,
        yMm,
        widthMm: selectedOption.stickerWidthMm,
        heightMm: selectedOption.stickerHeightMm,
        rotation: selectedOption.rotation,
      });

      stickerCount++;
    }
  }

  return {
    selectedRotation: selectedOption.rotation,
    columns: selectedOption.columns,
    rows: selectedOption.rows,
    totalCapacity: selectedOption.capacity,
    actualCopies,
    requestedCopies,
    positions,
    usableWidthMm: usableWidth,
    usableHeightMm: usableHeight,
    alternativeCapacity: alternativeOption.capacity,
    rotationRecommended,
    recommendationMessage,
    hasError,
    errorMessage,
  };
}
