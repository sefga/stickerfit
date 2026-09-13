import { describe, it, expect } from 'vitest';
import { generateCutMarks, DEFAULT_CUT_MARKS_CONFIG } from './cutMarks';
import { StickerPosition } from '../layout/layoutEngine';

describe('Генератор меток реза (Cut Marks Generator)', () => {
  it('Возвращает пустой массив, если метки реза отключены', () => {
    const positions: StickerPosition[] = [
      { index: 0, col: 0, row: 0, xMm: 10, yMm: 10, widthMm: 50, heightMm: 50, rotation: 0 },
    ];
    const marks = generateCutMarks(positions, { ...DEFAULT_CUT_MARKS_CONFIG, enabled: false });
    expect(marks).toEqual([]);
  });

  it('Возвращает пустой массив при отсутствии стикеров', () => {
    const marks = generateCutMarks([], { ...DEFAULT_CUT_MARKS_CONFIG, enabled: true });
    expect(marks).toEqual([]);
  });

  it('Генерирует 8 меток реза для одного одиночного стикера (по 2 на каждый из 4 углов)', () => {
    const positions: StickerPosition[] = [
      { index: 0, col: 0, row: 0, xMm: 20, yMm: 20, widthMm: 50, heightMm: 50, rotation: 0 },
    ];
    const marks = generateCutMarks(positions, {
      enabled: true,
      lengthMm: 3,
      offsetMm: 1,
      lineWidthPt: 0.2,
    });
    expect(marks).toHaveLength(8);
  });

  it('Корректно объединяет встречные коллинеарные метки в зазоре между стикерами без наслоения', () => {
    // Два стикера по горизонтали с небольшим зазором
    const positions: StickerPosition[] = [
      { index: 0, col: 0, row: 0, xMm: 10, yMm: 10, widthMm: 50, heightMm: 50, rotation: 0 },
      { index: 1, col: 1, row: 0, xMm: 63, yMm: 10, widthMm: 50, heightMm: 50, rotation: 0 }, // зазор 3 мм
    ];
    const marks = generateCutMarks(positions, {
      enabled: true,
      lengthMm: 3,
      offsetMm: 1,
      lineWidthPt: 0.2,
    });

    // Без объединения было бы 16 меток (8 * 2).
    // Так как зазор 3 мм, а отступ 1 мм + длина 3 мм перекрываются в зазоре между x=60 и x=63,
    // коллинеарные отрезки по верхнему краю (y=10) и нижнему краю (y=60) объединяются!
    expect(marks.length).toBeLessThan(16);
  });
});
