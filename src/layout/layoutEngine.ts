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
  bleedMm?: number;
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
  capacityWithoutBleed: number;
  effectiveGapX: number;
  effectiveGapY: number;
  rotationRecommended: boolean;
  recommendationMessage: string;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Рассчитывает сетку для заданной ориентации стикера с учетом внешнего вылета под обрез (Bleed)
 */
function calculateForOrientation(
  usableTrimWidth: number,
  usableTrimHeight: number,
  stickerW: number,
  stickerH: number,
  gapX: number,
  gapY: number,
  marginLeft: number,
  marginTop: number,
  bleedMm: number,
  rotation: 0 | 90,
  spacingMode: SpacingMode = 'center'
): OrientationCalculation {
  const b = Math.max(0, bleedMm);
  // FR-009: Минимальный фактический зазор между линиями реза effectiveGap = max(gap, 2b)
  const minGap = 2 * b;
  const baseGapX = Math.max(gapX, minGap);
  const baseGapY = Math.max(gapY, minGap);

  // Защита от некорректных размеров доступной области реза
  if (usableTrimWidth <= 0 || usableTrimHeight <= 0 || stickerW <= 0 || stickerH <= 0) {
    return {
      rotation,
      stickerWidthMm: stickerW,
      stickerHeightMm: stickerH,
      columns: 0,
      rows: 0,
      capacity: 0,
      gridWidthMm: 0,
      gridHeightMm: 0,
      offsetX: marginLeft + b,
      offsetY: marginTop + b,
      effectiveGapX: baseGapX,
      effectiveGapY: baseGapY,
    };
  }

  // Используем epsilon 1e-9 для исключения погрешностей чисел с плавающей точкой
  const EPSILON = 1e-9;
  const cols = Math.max(0, Math.floor((usableTrimWidth + baseGapX + EPSILON) / (stickerW + baseGapX)));
  const rows = Math.max(0, Math.floor((usableTrimHeight + baseGapY + EPSILON) / (stickerH + baseGapY)));
  const capacity = cols * rows;

  const gridTrimWidth = cols > 0 ? roundMm(cols * stickerW + (cols - 1) * baseGapX, 3) : 0;
  const gridTrimHeight = rows > 0 ? roundMm(rows * stickerH + (rows - 1) * baseGapY, 3) : 0;

  const remainingX = Math.max(0, usableTrimWidth - gridTrimWidth);
  const remainingY = Math.max(0, usableTrimHeight - gridTrimHeight);

  // FR-011: Поля листа отсчитываются от внешнего края вылета, поэтому базовое положение
  // первого контура реза смещено внутрь на b: (marginLeft + b, marginTop + b).
  let offsetX = roundMm(marginLeft + b, 3);
  let offsetY = roundMm(marginTop + b, 3);
  let effectiveGapX = baseGapX;
  let effectiveGapY = baseGapY;

  if (spacingMode === 'start') {
    // FR-012: Режим 'start': первый вылет начинается ровно у поля marginLeft, линия реза — в marginLeft + b
    offsetX = roundMm(marginLeft + b, 3);
    offsetY = roundMm(marginTop + b, 3);
    effectiveGapX = baseGapX;
    effectiveGapY = baseGapY;
  } else if (spacingMode === 'justify') {
    // FR-012: Равномерное распределение: остаток поровну распределяется между зазорами сверх minGap
    if (cols > 1 && remainingX > 0) {
      effectiveGapX = roundMm(baseGapX + remainingX / (cols - 1), 3);
      offsetX = roundMm(marginLeft + b, 3);
    } else {
      offsetX = roundMm(marginLeft + b + (remainingX > 0 ? remainingX / 2 : 0), 3);
      effectiveGapX = baseGapX;
    }

    if (rows > 1 && remainingY > 0) {
      effectiveGapY = roundMm(baseGapY + remainingY / (rows - 1), 3);
      offsetY = roundMm(marginTop + b, 3);
    } else {
      offsetY = roundMm(marginTop + b + (remainingY > 0 ? remainingY / 2 : 0), 3);
      effectiveGapY = baseGapY;
    }
  } else {
    // По умолчанию ('center'): центрирование всей сетки (с учетом вылетов) внутри доступной области листа
    offsetX = roundMm(marginLeft + b + (remainingX > 0 ? remainingX / 2 : 0), 3);
    offsetY = roundMm(marginTop + b + (remainingY > 0 ? remainingY / 2 : 0), 3);
    effectiveGapX = baseGapX;
    effectiveGapY = baseGapY;
  }

  return {
    rotation,
    stickerWidthMm: stickerW,
    stickerHeightMm: stickerH,
    columns: cols,
    rows: rows,
    capacity,
    gridWidthMm: gridTrimWidth,
    gridHeightMm: gridTrimHeight,
    offsetX,
    offsetY,
    effectiveGapX,
    effectiveGapY,
  };
}

/**
 * Чистая математическая функция расчета раскладки стикеров на листе.
 * Поддерживает внешний цветной вылет (Bleed) и гарантирует защиту от наложения.
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
    bleedMm = 0,
  } = input;

  const b = Math.max(0, bleedMm);

  // FR-011: Доступная область реза за вычетом полей и двух внешних вылетов по краям листа
  const usableTrimWidth = roundMm(pageWidthMm - margins.left - margins.right - 2 * b, 3);
  const usableTrimHeight = roundMm(pageHeightMm - margins.top - margins.bottom - 2 * b, 3);

  // Для обратной совместимости usableWidthMm / usableHeightMm возвращаются как исходная область листа без полей
  const usableWidthRaw = roundMm(pageWidthMm - margins.left - margins.right, 3);
  const usableHeightRaw = roundMm(pageHeightMm - margins.top - margins.bottom, 3);

  if (usableWidthRaw <= 0 || usableHeightRaw <= 0) {
    return {
      selectedRotation: 0,
      columns: 0,
      rows: 0,
      totalCapacity: 0,
      actualCopies: 0,
      requestedCopies,
      positions: [],
      usableWidthMm: Math.max(0, usableWidthRaw),
      usableHeightMm: Math.max(0, usableHeightRaw),
      alternativeCapacity: 0,
      capacityWithoutBleed: 0,
      effectiveGapX: Math.max(gapX, 2 * b),
      effectiveGapY: Math.max(gapY, 2 * b),
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
      usableWidthMm: usableWidthRaw,
      usableHeightMm: usableHeightRaw,
      alternativeCapacity: 0,
      capacityWithoutBleed: 0,
      effectiveGapX: Math.max(gapX, 2 * b),
      effectiveGapY: Math.max(gapY, 2 * b),
      rotationRecommended: false,
      recommendationMessage: 'Размеры стикера должны быть больше 0.',
      hasError: true,
      errorMessage: 'Размеры стикера должны быть больше 0.',
    };
  }

  // Расчет вместимости БЕЗ вылета (при bleed = 0) для FR-014 и AC-005
  let capacityWithoutBleed = 0;
  {
    const noBleedTrimW = roundMm(pageWidthMm - margins.left - margins.right, 3);
    const noBleedTrimH = roundMm(pageHeightMm - margins.top - margins.bottom, 3);
    const noBleedA = calculateForOrientation(
      noBleedTrimW,
      noBleedTrimH,
      stickerWidthMm,
      stickerHeightMm,
      gapX,
      gapY,
      margins.left,
      margins.top,
      0,
      0,
      spacingMode
    );
    const noBleedB = calculateForOrientation(
      noBleedTrimW,
      noBleedTrimH,
      stickerHeightMm,
      stickerWidthMm,
      gapX,
      gapY,
      margins.left,
      margins.top,
      0,
      90,
      spacingMode
    );
    if (allowRotation) {
      capacityWithoutBleed = Math.max(noBleedA.capacity, noBleedB.capacity);
    } else {
      capacityWithoutBleed = noBleedA.capacity;
    }
  }

  // Вариант A: исходная ориентация (rotation = 0, W x H) с учетом bleedMm
  const optionA = calculateForOrientation(
    usableTrimWidth,
    usableTrimHeight,
    stickerWidthMm,
    stickerHeightMm,
    gapX,
    gapY,
    margins.left,
    margins.top,
    b,
    0,
    spacingMode
  );

  // Вариант B: повернутая ориентация на 90° (rotation = 90, H x W) с учетом bleedMm
  const optionB = calculateForOrientation(
    usableTrimWidth,
    usableTrimHeight,
    stickerHeightMm,
    stickerWidthMm,
    gapX,
    gapY,
    margins.left,
    margins.top,
    b,
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
    ? (b > 0
      ? 'Стикер с выбранным вылетом не помещается в доступную область листа с текущими полями.'
      : 'Стикер не помещается в доступную область листа с текущими полями.')
    : undefined;

  // Определение фактического количества копий
  let actualCopies = selectedOption.capacity;
  if (typeof requestedCopies === 'number' && requestedCopies > 0) {
    actualCopies = Math.min(requestedCopies, selectedOption.capacity);
  }

  // Расчет позиций каждого экземпляра стикера (координаты относятся к контуру реза готовой наклейки)
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
    usableWidthMm: usableWidthRaw,
    usableHeightMm: usableHeightRaw,
    alternativeCapacity: alternativeOption.capacity,
    capacityWithoutBleed,
    effectiveGapX: selectedOption.effectiveGapX,
    effectiveGapY: selectedOption.effectiveGapY,
    rotationRecommended,
    recommendationMessage,
    hasError,
    errorMessage,
  };
}
