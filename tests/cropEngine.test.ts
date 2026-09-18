import { describe, it, expect } from 'vitest';
import { normalizeCropRect } from '../src/image/cropEngine';

describe('Модуль cropEngine (Нормализация пропорций кадрирования)', () => {
  it('не изменяет cropRect, если пропорции уже точно совпадают с targetAspectRatio', () => {
    // 800x600 -> 4:3 = 1.3333
    const result = normalizeCropRect(100, 50, 800, 600, 4 / 3);
    expect(result.x).toBe(100);
    expect(result.y).toBe(50);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('центрированно уменьшает ширину, если рамка шире целевого соотношения сторон', () => {
    // Исходная рамка горизонтальная 16:9 (1600x900), целевой стикер вертикальный 1:1 (aspectRatio = 1)
    const result = normalizeCropRect(0, 0, 1600, 900, 1);
    // Высота остается 900, ширина должна стать 900, сдвиг x = (1600 - 900) / 2 = 350
    expect(result.height).toBe(900);
    expect(result.width).toBe(900);
    expect(result.x).toBe(350);
    expect(result.y).toBe(0);
    // Проверяем соотношение сторон результата
    expect(result.width / result.height).toBeCloseTo(1, 2);
  });

  it('центрированно уменьшает высоту, если рамка выше целевого соотношения сторон', () => {
    // Исходная рамка вертикальная 9:16 (900x1600), целевой стикер горизонтальный 16:9 (aspectRatio = 1.777)
    // 900 / (16/9) = 506.25 -> 506
    const result = normalizeCropRect(50, 100, 900, 1600, 16 / 9);
    expect(result.width).toBe(900);
    expect(result.height).toBe(506);
    expect(result.x).toBe(50);
    // Сдвиг y = 100 + (1600 - 506) / 2 = 100 + 547 = 647
    expect(result.y).toBe(647);
    expect(result.width / result.height).toBeCloseTo(16 / 9, 2);
  });

  it('обрабатывает переход от горизонтального стикера (85x54) к вертикальному (54x85)', () => {
    // Пользователь выделил горизонтальную область 850x540
    // Затем стикер изменился на вертикальный 54/85 = ~0.635
    const targetRatio = 54 / 85;
    const result = normalizeCropRect(10, 20, 850, 540, targetRatio);
    // Ожидаем нормализацию ширины под высоту 540
    expect(result.height).toBe(540);
    expect(result.width).toBe(Math.round(540 * targetRatio)); // 343
    expect(result.width / result.height).toBeCloseTo(targetRatio, 2);
  });

  it('корректно обрабатывает граничные/некорректные значения', () => {
    const result = normalizeCropRect(0, 0, 0, 0, 1);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });
});
