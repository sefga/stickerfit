import { describe, expect, it } from 'vitest';
import { createEdgeFillPath, EdgeFillGeometry } from './edgeBackground';

/** Создаёт синтетическое изображение для проверки фона и деталей рисунка. */
function pixels(width: number, height: number, color: readonly number[]): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index++) rgba.set(color, index * 4);
  return rgba;
}

/** Задаёт отдельный пиксель тестового изображения. */
function paint(rgba: Uint8ClampedArray, width: number, x: number, y: number, color: readonly number[]): void {
  rgba.set(color, (y * width + x) * 4);
}

/** Проверяет попадание физической точки в объединение прямоугольников маски. */
function covers(path: string, xMm: number, yMm: number): boolean {
  const rectangles = path.matchAll(/M ([\d.]+) ([\d.]+) H ([\d.]+) V ([\d.]+) H [\d.]+ Z/g);
  for (const match of rectangles) {
    const [, left, top, right, bottom] = match.map(Number);
    if (xMm >= left && xMm < right && yMm >= top && yMm < bottom) return true;
  }
  return false;
}

const rect: EdgeFillGeometry = { widthMm: 10, heightMm: 10, shape: 'rect' };
const blue = [0, 38, 181, 255];
const white = [251, 252, 251, 255];

describe('Исправление светлого фона у контура реза', () => {
  it('закрывает непрозрачную кайму исходника, сохраняя сам исходник и белые детали внутри', () => {
    const rgba = pixels(100, 100, blue);
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
      if (x < 3 || x >= 97 || y < 3 || y >= 97) paint(rgba, 100, x, y, white);
    }
    paint(rgba, 100, 50, 50, white);
    const original = rgba.slice();
    const path = createEdgeFillPath(rgba, 100, 100, rect);
    expect(covers(path, 0.15, 5.05)).toBe(true);
    expect(covers(path, 9.85, 5.05)).toBe(true);
    expect(covers(path, 5.05, 0.15)).toBe(true);
    expect(covers(path, 5.05, 9.85)).toBe(true);
    expect(covers(path, 5.05, 5.05)).toBe(false);
    expect(covers(path, 0.45, 5.05)).toBe(false);
    expect(rgba).toEqual(original);
  });

  it('сохраняет прозрачность PNG и поля Fit, включая прозрачные пиксели у края', () => {
    const rgba = pixels(100, 100, [0, 0, 0, 0]);
    for (let y = 0; y < 100; y++) paint(rgba, 100, 2, y, white);
    const path = createEdgeFillPath(rgba, 100, 100, rect);
    expect(covers(path, 0.25, 5.05)).toBe(true);
    expect(covers(path, 0.05, 5.05)).toBe(false);
    expect(covers(path, 5.05, 5.05)).toBe(false);
    expect(createEdgeFillPath(pixels(100, 100, [255, 255, 255, 0]), 100, 100, rect)).toBe('');
  });

  it('не заменяет белые детали, не связанные со светлым фоном внешнего края', () => {
    const rgba = pixels(100, 100, blue);
    paint(rgba, 100, 2, 50, white);
    expect(createEdgeFillPath(rgba, 100, 100, rect)).toBe('');
  });

  it('сохраняет полупрозрачные светлые пиксели, даже если они связаны с внешним фоном', () => {
    const rgba = pixels(100, 100, [255, 255, 255, 128]);
    for (let y = 0; y < 100; y++) paint(rgba, 100, 2, y, white);
    const path = createEdgeFillPath(rgba, 100, 100, rect);
    expect(covers(path, 0.25, 5.05)).toBe(true);
    expect(covers(path, 0.05, 5.05)).toBe(false);
    expect(covers(path, 0.45, 5.05)).toBe(false);
  });

  it('ограничивает замену 0.5 мм, даже если белая область связана с центром рисунка', () => {
    const path = createEdgeFillPath(pixels(100, 100, white), 100, 100, rect);
    expect(covers(path, 0.45, 5.05)).toBe(true);
    expect(covers(path, 0.55, 5.05)).toBe(false);
    expect(covers(path, 5.05, 5.05)).toBe(false);
  });

  it('учитывает круглый контур вместо границ квадратного растра', () => {
    const rgba = pixels(100, 100, white);
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
      if (Math.hypot(x + 0.5 - 50, y + 0.5 - 50) < 47) paint(rgba, 100, x, y, blue);
    }
    const path = createEdgeFillPath(rgba, 100, 100, { ...rect, shape: 'circle' });
    expect(covers(path, 5.05, 0.15)).toBe(true);
    expect(covers(path, 0.15, 5.05)).toBe(true);
    expect(covers(path, 0.05, 0.05)).toBe(false);
    expect(covers(path, 5.05, 5.05)).toBe(false);
  });

  it('учитывает скругление и физические размеры прямоугольной наклейки', () => {
    const path = createEdgeFillPath(pixels(400, 100, white), 400, 100, {
      widthMm: 40, heightMm: 10, shape: 'rounded', cornerRadiusMm: 2,
    });
    expect(covers(path, 0.45, 5.05)).toBe(true);
    expect(covers(path, 0.55, 5.05)).toBe(false);
    expect(covers(path, 20.05, 0.45)).toBe(true);
    expect(covers(path, 0.05, 0.05)).toBe(false);
  });

  it('сохраняет насыщенные светлые цвета и золотые детали, соприкасающиеся с краем', () => {
    const rgba = pixels(100, 100, blue);
    for (let x = 0; x < 100; x++) paint(rgba, 100, x, 0, [255, 239, 155, 255]);
    expect(createEdgeFillPath(rgba, 100, 100, rect)).toBe('');
  });

  it('отклоняет повреждённый растр и некорректную геометрию', () => {
    expect(() => createEdgeFillPath(new Uint8ClampedArray(4), 10, 10, rect)).toThrow();
    expect(() => createEdgeFillPath(pixels(10, 10, white), 10, 10, { ...rect, widthMm: NaN })).toThrow();
    expect(() => createEdgeFillPath(pixels(10, 10, white), 10, 10, { ...rect, heightMm: 0 })).toThrow();
  });
});
