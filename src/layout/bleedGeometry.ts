import { roundMm } from '../units/mm';

export type BleedShape = 'rect' | 'circle' | 'rounded';

export interface BleedDimensions {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  shape: BleedShape;
  cornerRadiusMm?: number;
}

export interface BleedBounds {
  outerX: number;
  outerY: number;
  outerWidth: number;
  outerHeight: number;
  outerRadius: number;
  innerRadius: number;
}

/**
 * Расчет внешних и внутренних габаритов вылета с точностью до 0.001 мм
 */
export function getBleedBounds(dims: BleedDimensions): BleedBounds {
  const { xMm, yMm, widthMm, heightMm, bleedMm, shape, cornerRadiusMm = 0 } = dims;
  const b = Math.max(0, bleedMm);

  const outerX = roundMm(xMm - b, 3);
  const outerY = roundMm(yMm - b, 3);
  const outerWidth = roundMm(widthMm + 2 * b, 3);
  const outerHeight = roundMm(heightMm + 2 * b, 3);

  let innerRadius = 0;
  let outerRadius = 0;

  if (shape === 'circle') {
    const d = Math.min(widthMm, heightMm);
    innerRadius = roundMm(d / 2, 3);
    outerRadius = roundMm(innerRadius + b, 3);
  } else if (shape === 'rounded') {
    const maxR = Math.min(widthMm / 2, heightMm / 2);
    innerRadius = roundMm(Math.min(Math.max(0, cornerRadiusMm), maxR), 3);
    outerRadius = roundMm(innerRadius + b, 3);
  }

  return {
    outerX,
    outerY,
    outerWidth,
    outerHeight,
    outerRadius,
    innerRadius,
  };
}

/**
 * Преобразование HEX цвета (#FFFFFF или #FFF) в компоненты RGB (0..1)
 */
export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace(/^#/, '').trim();
  let r = 255;
  let g = 255;
  let b = 255;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  }

  if (isNaN(r)) r = 255;
  if (isNaN(g)) g = 255;
  if (isNaN(b)) b = 255;

  return {
    r: Math.max(0, Math.min(1, r / 255)),
    g: Math.max(0, Math.min(1, g / 255)),
    b: Math.max(0, Math.min(1, b / 255)),
  };
}

/**
 * Валидация HEX цвета (#RRGGBB или #RGB)
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

/**
 * Нормализация HEX цвета к каноническому #RRGGBB в верхнем регистре
 */
export function normalizeHexColor(hex: string, fallback: string = '#FFFFFF'): string {
  if (!isValidHexColor(hex)) return fallback.toUpperCase();
  const cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`.toUpperCase();
  }
  return `#${cleaned}`.toUpperCase();
}

/**
 * Генерация замкнутого пути разности (внешний контур минус внутренний контур реза).
 * Внешний контур обходится по часовой стрелке (CW), внутренний — против часовой (CCW).
 * Это обеспечивает корректную работу как с evenodd, так и с nonzero winding rules в SVG, Canvas и PDF.
 */
export function getBleedDifferenceSvgPath(dims: BleedDimensions): string {
  const { xMm, yMm, widthMm, heightMm, bleedMm, shape } = dims;
  if (bleedMm <= 0) return '';

  const bounds = getBleedBounds(dims);
  const { outerX, outerY, outerWidth, outerHeight, outerRadius, innerRadius } = bounds;

  if (shape === 'rect') {
    // Внешний прямоугольник (CW)
    const outerPath = `M ${outerX} ${outerY} H ${outerX + outerWidth} V ${outerY + outerHeight} H ${outerX} Z`;
    // Внутренний прямоугольник (CCW)
    const innerPath = `M ${xMm} ${yMm} V ${yMm + heightMm} H ${xMm + widthMm} V ${yMm} Z`;
    return `${outerPath} ${innerPath}`;
  }

  if (shape === 'circle') {
    const cx = roundMm(xMm + widthMm / 2, 3);
    const cy = roundMm(yMm + heightMm / 2, 3);

    // Внешний круг (CW)
    const outerPath = `M ${roundMm(cx - outerRadius, 3)} ${cy} ` +
      `A ${outerRadius} ${outerRadius} 0 1 1 ${roundMm(cx + outerRadius, 3)} ${cy} ` +
      `A ${outerRadius} ${outerRadius} 0 1 1 ${roundMm(cx - outerRadius, 3)} ${cy} Z`;

    // Внутренний круг (CCW)
    const innerPath = `M ${roundMm(cx - innerRadius, 3)} ${cy} ` +
      `A ${innerRadius} ${innerRadius} 0 1 0 ${roundMm(cx + innerRadius, 3)} ${cy} ` +
      `A ${innerRadius} ${innerRadius} 0 1 0 ${roundMm(cx - innerRadius, 3)} ${cy} Z`;

    return `${outerPath} ${innerPath}`;
  }

  // shape === 'rounded'
  const ro = outerRadius;
  const ri = innerRadius;

  // Внешний скругленный прямоугольник (CW)
  const outerPath = `M ${roundMm(outerX + ro, 3)} ${outerY} ` +
    `H ${roundMm(outerX + outerWidth - ro, 3)} ` +
    `A ${ro} ${ro} 0 0 1 ${roundMm(outerX + outerWidth, 3)} ${roundMm(outerY + ro, 3)} ` +
    `V ${roundMm(outerY + outerHeight - ro, 3)} ` +
    `A ${ro} ${ro} 0 0 1 ${roundMm(outerX + outerWidth - ro, 3)} ${roundMm(outerY + outerHeight, 3)} ` +
    `H ${roundMm(outerX + ro, 3)} ` +
    `A ${ro} ${ro} 0 0 1 ${outerX} ${roundMm(outerY + outerHeight - ro, 3)} ` +
    `V ${roundMm(outerY + ro, 3)} ` +
    `A ${ro} ${ro} 0 0 1 ${roundMm(outerX + ro, 3)} ${outerY} Z`;

  // Внутренний скругленный прямоугольник (CCW)
  const innerPath = `M ${roundMm(xMm + ri, 3)} ${yMm} ` +
    `A ${ri} ${ri} 0 0 0 ${xMm} ${roundMm(yMm + ri, 3)} ` +
    `V ${roundMm(yMm + heightMm - ri, 3)} ` +
    `A ${ri} ${ri} 0 0 0 ${roundMm(xMm + ri, 3)} ${roundMm(yMm + heightMm, 3)} ` +
    `H ${roundMm(xMm + widthMm - ri, 3)} ` +
    `A ${ri} ${ri} 0 0 0 ${roundMm(xMm + widthMm, 3)} ${roundMm(yMm + heightMm - ri, 3)} ` +
    `V ${roundMm(yMm + ri, 3)} ` +
    `A ${ri} ${ri} 0 0 0 ${roundMm(xMm + widthMm - ri, 3)} ${yMm} Z`;

  return `${outerPath} ${innerPath}`;
}
