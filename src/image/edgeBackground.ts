import { BleedShape } from '../layout/bleedGeometry';

export interface EdgeFillGeometry {
  widthMm: number;
  heightMm: number;
  shape: BleedShape;
  cornerRadiusMm?: number;
}

/** Максимальная глубина исправления светлой каймы внутрь контура реза. */
export const EDGE_FILL_DEPTH_MM = 0.5;

/**
 * Расстояние от центра пикселя до контура реза; внутри оно отрицательное.
 */
function distanceToCut(x: number, y: number, geometry: EdgeFillGeometry): number {
  const halfW = geometry.widthMm / 2;
  const halfH = geometry.heightMm / 2;
  const dx = Math.abs(x - halfW);
  const dy = Math.abs(y - halfH);
  if (geometry.shape === 'circle') {
    return Math.hypot(dx, dy) - Math.min(halfW, halfH);
  }
  const radius = geometry.shape === 'rounded'
    ? Math.min(Math.max(0, geometry.cornerRadiusMm ?? 0), halfW, halfH)
    : 0;
  const qx = dx - halfW + radius;
  const qy = dy - halfH + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

/**
 * Находит светлый фон, связанный с внешним краем, и строит маску заливки в мм.
 * Исходные RGBA не изменяются. Прозрачность служит проходом для поиска фона,
 * но не закрашивается. Белые детали внутри рисунка и фон глубже 0.5 мм сохраняются.
 * Построчный обход не использует рекурсию или очередь размером со всё изображение.
 */
export function createEdgeFillPath(
  rgba: Uint8ClampedArray,
  pixelWidth: number,
  pixelHeight: number,
  geometry: EdgeFillGeometry
): string {
  if (
    !Number.isSafeInteger(pixelWidth) || !Number.isSafeInteger(pixelHeight) ||
    pixelWidth <= 0 || pixelHeight <= 0 || rgba.length !== pixelWidth * pixelHeight * 4 ||
    !Number.isFinite(geometry.widthMm) || !Number.isFinite(geometry.heightMm) ||
    geometry.widthMm <= 0 || geometry.heightMm <= 0 ||
    (geometry.cornerRadiusMm !== undefined && !Number.isFinite(geometry.cornerRadiusMm))
  ) {
    throw new Error('Некорректные размеры изображения или контура для исправления каймы.');
  }

  const visited = new Uint8Array(pixelWidth * pixelHeight);
  const stack: number[] = [];
  const mmPerPixelX = geometry.widthMm / pixelWidth;
  const mmPerPixelY = geometry.heightMm / pixelHeight;
  const halfPixelDiagonal = Math.hypot(mmPerPixelX, mmPerPixelY) / 2;

  /** Отделяет почти белый нейтральный фон от цветных деталей и бликов. */
  const isBackground = (index: number): boolean => {
    const offset = index * 4;
    if (rgba[offset + 3] === 0) return true;
    const min = Math.min(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
    const max = Math.max(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
    return min >= 225 && max - min <= 30;
  };

  /** Добавляет не посещённую точку связного светлого фона. */
  const seed = (index: number): void => {
    if (!visited[index] && isBackground(index)) stack.push(index);
  };

  for (let x = 0; x < pixelWidth; x++) {
    seed(x);
    seed((pixelHeight - 1) * pixelWidth + x);
  }
  for (let y = 1; y < pixelHeight - 1; y++) {
    seed(y * pixelWidth);
    seed(y * pixelWidth + pixelWidth - 1);
  }

  while (stack.length > 0) {
    const index = stack.pop()!;
    if (visited[index]) continue;
    const y = Math.floor(index / pixelWidth);
    const rowStart = y * pixelWidth;
    let left = index - rowStart;
    let right = left;
    while (left > 0 && !visited[rowStart + left - 1] && isBackground(rowStart + left - 1)) left--;
    while (right + 1 < pixelWidth && !visited[rowStart + right + 1] && isBackground(rowStart + right + 1)) right++;
    let aboveRun = false;
    let belowRun = false;
    for (let x = left; x <= right; x++) {
      const current = rowStart + x;
      visited[current] = 1;
      if (y > 0) {
        const connected = !visited[current - pixelWidth] && isBackground(current - pixelWidth);
        if (connected && !aboveRun) stack.push(current - pixelWidth);
        aboveRun = connected;
      }
      if (y + 1 < pixelHeight) {
        const connected = !visited[current + pixelWidth] && isBackground(current + pixelWidth);
        if (connected && !belowRun) stack.push(current + pixelWidth);
        belowRun = connected;
      }
    }
  }

  const parts: string[] = [];
  /** Ограничивает точность координат, не округляя их до пикселей экспортного листа. */
  const mm = (value: number): number => Math.round(value * 100000) / 100000;

  for (let y = 0; y < pixelHeight; y++) {
    let runStart = -1;
    for (let x = 0; x <= pixelWidth; x++) {
      const index = y * pixelWidth + x;
      let selected = x < pixelWidth && visited[index] === 1 && rgba[index * 4 + 3] === 255;
      if (selected) {
        const distance = distanceToCut((x + 0.5) * mmPerPixelX, (y + 0.5) * mmPerPixelY, geometry);
        selected = distance >= -EDGE_FILL_DEPTH_MM && distance <= halfPixelDiagonal;
      }
      if (selected && runStart < 0) runStart = x;
      if (!selected && runStart >= 0) {
        // Соседние строки немного перекрываются, чтобы сглаживание не создало новые щели.
        const overlap = Math.min(mmPerPixelY / 4, 0.01);
        const top = Math.max(0, y * mmPerPixelY - overlap);
        const bottom = Math.min(geometry.heightMm, (y + 1) * mmPerPixelY + overlap);
        parts.push(`M ${mm(runStart * mmPerPixelX)} ${mm(top)} H ${mm(x * mmPerPixelX)} V ${mm(bottom)} H ${mm(runStart * mmPerPixelX)} Z`);
        runStart = -1;
      }
    }
  }
  return parts.join(' ');
}
