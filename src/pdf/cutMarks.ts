import { mmToPoints } from '../units/mm';
import { PDFPage, rgb } from 'pdf-lib';
import { StickerPosition } from '../layout/layoutEngine';

export interface CutMarkLine {
  // Координаты в миллиметрах (от верхнего левого угла страницы)
  x1Mm: number;
  y1Mm: number;
  x2Mm: number;
  y2Mm: number;
}

export interface CutMarksConfig {
  enabled: boolean;
  lengthMm: number; // по умолчанию 3 мм
  offsetMm: number; // по умолчанию 1 мм
  lineWidthPt: number; // по умолчанию 0.2 pt
}

export const DEFAULT_CUT_MARKS_CONFIG: CutMarksConfig = {
  enabled: false,
  lengthMm: 3,
  offsetMm: 1,
  lineWidthPt: 0.2,
};

/**
 * Расчет векторных отрезков меток реза для заданных стикеров (в миллиметрах)
 */
export function generateCutMarks(
  positions: StickerPosition[],
  config: CutMarksConfig = DEFAULT_CUT_MARKS_CONFIG
): CutMarkLine[] {
  if (!config.enabled || positions.length === 0) return [];

  const { lengthMm, offsetMm } = config;
  const lines: CutMarkLine[] = [];

  for (const pos of positions) {
    const x1 = pos.xMm;
    const y1 = pos.yMm;
    const x2 = pos.xMm + pos.widthMm;
    const y2 = pos.yMm + pos.heightMm;

    // Угол Top-Left (x1, y1)
    // Горизонтальная черта влево
    lines.push({ x1Mm: x1 - offsetMm - lengthMm, y1Mm: y1, x2Mm: x1 - offsetMm, y2Mm: y1 });
    // Вертикальная черта вверх
    lines.push({ x1Mm: x1, y1Mm: y1 - offsetMm - lengthMm, x2Mm: x1, y2Mm: y1 - offsetMm });

    // Угол Top-Right (x2, y1)
    // Горизонтальная черта вправо
    lines.push({ x1Mm: x2 + offsetMm, y1Mm: y1, x2Mm: x2 + offsetMm + lengthMm, y2Mm: y1 });
    // Вертикальная черта вверх
    lines.push({ x1Mm: x2, y1Mm: y1 - offsetMm - lengthMm, x2Mm: x2, y2Mm: y1 - offsetMm });

    // Угол Bottom-Left (x1, y2)
    // Горизонтальная черта влево
    lines.push({ x1Mm: x1 - offsetMm - lengthMm, y1Mm: y2, x2Mm: x1 - offsetMm, y2Mm: y2 });
    // Вертикальная черта вниз
    lines.push({ x1Mm: x1, y1Mm: y2 + offsetMm, x2Mm: x1, y2Mm: y2 + offsetMm + lengthMm });

    // Угол Bottom-Right (x2, y2)
    // Горизонтальная черта вправо
    lines.push({ x1Mm: x2 + offsetMm, y1Mm: y2, x2Mm: x2 + offsetMm + lengthMm, y2Mm: y2 });
    // Вертикальная черта вниз
    lines.push({ x1Mm: x2, y1Mm: y2 + offsetMm, x2Mm: x2, y2Mm: y2 + offsetMm + lengthMm });
  }

  return mergeColinearMarks(lines);
}

/**
 * Объединение перекрывающихся или соприкасающихся отрезков меток реза в зазорах
 */
function mergeColinearMarks(lines: CutMarkLine[]): CutMarkLine[] {
  const result: CutMarkLine[] = [];
  const EPSILON = 0.01;

  // Разделяем на горизонтальные и вертикальные
  const horiz: CutMarkLine[] = [];
  const vert: CutMarkLine[] = [];

  for (const line of lines) {
    if (Math.abs(line.y1Mm - line.y2Mm) < EPSILON) {
      const minX = Math.min(line.x1Mm, line.x2Mm);
      const maxX = Math.max(line.x1Mm, line.x2Mm);
      horiz.push({ x1Mm: minX, y1Mm: line.y1Mm, x2Mm: maxX, y2Mm: line.y1Mm });
    } else if (Math.abs(line.x1Mm - line.x2Mm) < EPSILON) {
      const minY = Math.min(line.y1Mm, line.y2Mm);
      const maxY = Math.max(line.y1Mm, line.y2Mm);
      vert.push({ x1Mm: line.x1Mm, y1Mm: minY, x2Mm: line.x1Mm, y2Mm: maxY });
    } else {
      result.push(line);
    }
  }

  // Сортировка и слияние горизонтальных
  horiz.sort((a, b) => Math.abs(a.y1Mm - b.y1Mm) > EPSILON ? a.y1Mm - b.y1Mm : a.x1Mm - b.x1Mm);
  for (const h of horiz) {
    const last = result.length > 0 ? result[result.length - 1] : null;
    if (last && Math.abs(last.y1Mm - last.y2Mm) < EPSILON && Math.abs(last.y1Mm - h.y1Mm) < EPSILON && h.x1Mm <= last.x2Mm + EPSILON) {
      last.x2Mm = Math.max(last.x2Mm, h.x2Mm);
    } else {
      result.push({ ...h });
    }
  }

  // Сортировка и слияние вертикальных
  vert.sort((a, b) => Math.abs(a.x1Mm - b.x1Mm) > EPSILON ? a.x1Mm - b.x1Mm : a.y1Mm - b.y1Mm);
  for (const v of vert) {
    const last = result.length > 0 ? result[result.length - 1] : null;
    if (last && Math.abs(last.x1Mm - last.x2Mm) < EPSILON && Math.abs(last.x1Mm - v.x1Mm) < EPSILON && v.y1Mm <= last.y2Mm + EPSILON) {
      last.y2Mm = Math.max(last.y2Mm, v.y2Mm);
    } else {
      result.push({ ...v });
    }
  }

  return result;
}

/**
 * Отрисовка векторных меток реза на странице PDF через pdf-lib
 */
export function drawCutMarksOnPdf(
  page: PDFPage,
  lines: CutMarkLine[],
  pageHeightPt: number,
  lineWidthPt: number = DEFAULT_CUT_MARKS_CONFIG.lineWidthPt
) {
  const strokeColor = rgb(0.2, 0.2, 0.2);

  for (const line of lines) {
    // В PDF ось Y направлена снизу вверх, поэтому: yPdf = pageHeightPt - yTopPt
    const startX = mmToPoints(line.x1Mm);
    const startY = pageHeightPt - mmToPoints(line.y1Mm);
    const endX = mmToPoints(line.x2Mm);
    const endY = pageHeightPt - mmToPoints(line.y2Mm);

    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      thickness: lineWidthPt,
      color: strokeColor,
    });
  }
}
