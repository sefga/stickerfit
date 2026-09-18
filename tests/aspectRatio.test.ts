import { describe, it, expect } from 'vitest';
import {
  getSimplifiedAspectRatio,
  calculateHeightFromWidth,
  calculateWidthFromHeight,
  fitDimensionsToPhotoRatio,
} from '../src/image/aspectRatio';

describe('Модуль aspectRatio (Соотношение сторон фото)', () => {
  describe('getSimplifiedAspectRatio', () => {
    it('корректно распознает популярные форматы: 1:1, 4:3, 16:9, 3:2', () => {
      expect(getSimplifiedAspectRatio(1000, 1000)).toBe('1:1');
      expect(getSimplifiedAspectRatio(1920, 1080)).toBe('16:9');
      expect(getSimplifiedAspectRatio(1600, 1200)).toBe('4:3');
      expect(getSimplifiedAspectRatio(3000, 2000)).toBe('3:2');
      expect(getSimplifiedAspectRatio(1080, 1920)).toBe('9:16');
      expect(getSimplifiedAspectRatio(1200, 1600)).toBe('3:4');
    });

    it('справляется с небольшими погрешностями пропорций камеры', () => {
      // 1920x1079 -> ~16:9
      expect(getSimplifiedAspectRatio(1920, 1079)).toBe('16:9');
      // 4032x3024 (iPhone 4:3)
      expect(getSimplifiedAspectRatio(4032, 3024)).toBe('4:3');
    });

    it('обрабатывает нестандартные соотношения через НОД или десятичную дробь', () => {
      expect(getSimplifiedAspectRatio(500, 700)).toBe('5:7');
      expect(getSimplifiedAspectRatio(2340, 1080)).toBe('13:6');
      expect(getSimplifiedAspectRatio(2341, 1080)).toBe('2.17:1');
    });

    it('обрабатывает нулевые или отрицательные размеры безопасно', () => {
      expect(getSimplifiedAspectRatio(0, 0)).toBe('1:1');
      expect(getSimplifiedAspectRatio(-10, 100)).toBe('1:1');
    });
  });

  describe('Синхронный расчет размеров: calculateHeightFromWidth и calculateWidthFromHeight', () => {
    const ratio16_9 = 16 / 9;

    it('вычисляет высоту по ширине с точностью до 0.1 мм', () => {
      // ширина 54 мм при 16:9 -> высота 54 / (16/9) = 30.375 -> 30.4 мм
      const height = calculateHeightFromWidth(54, ratio16_9);
      expect(height).toBe(30.4);
    });

    it('вычисляет ширину по высоте с точностью до 0.1 мм', () => {
      // высота 30.4 мм при 16:9 -> ширина 30.4 * (16/9) = 54.044... -> 54.0 мм
      const width = calculateWidthFromHeight(30.4, ratio16_9);
      expect(width).toBe(54.0);
    });

    it('ограничивает расчет максимальным размером листа', () => {
      const height = calculateHeightFromWidth(54, 0.1, 100); // очень высокое фото
      expect(height).toBe(100);
    });
  });

  describe('fitDimensionsToPhotoRatio', () => {
    it('подбирает размеры стикера под горизонтальное фото 4:3 при базовой ширине 54 мм', () => {
      const result = fitDimensionsToPhotoRatio({
        currentWidthMm: 54,
        currentHeightMm: 85,
        photoWidthPx: 1600,
        photoHeightPx: 1200,
        maxPageWidthMm: 200,
        maxPageHeightMm: 287,
      });

      expect(result.fraction).toBe('4:3');
      expect(result.widthMm).toBe(54);
      // 54 / (4/3) = 40.5 мм
      expect(result.heightMm).toBe(40.5);
    });

    it('ужимает пропорционально, если стикер не помещается по высоте листа', () => {
      // Вертикальная длинная полоса (соотношение 1:10)
      const result = fitDimensionsToPhotoRatio({
        currentWidthMm: 54,
        currentHeightMm: 85,
        photoWidthPx: 100,
        photoHeightPx: 1000,
        maxPageWidthMm: 200,
        maxPageHeightMm: 280,
      });

      // Высота не должна превышать maxPageHeightMm (280 мм)
      expect(result.heightMm).toBe(280);
      // Ширина пропорционально ужимается: 280 * (1/10) = 28 мм
      expect(result.widthMm).toBe(28);
    });

    it('сохраняет точное соотношение сторон при многократных изменениях ширины и высоты (без дрейфа)', () => {
      const photoWidth = 1920;
      const photoHeight = 1080;
      const exactRatio = photoWidth / photoHeight; // 16/9 = 1.7777777777777777

      // 1. Начальная подгонка
      const initial = fitDimensionsToPhotoRatio({
        currentWidthMm: 54,
        currentHeightMm: 85,
        photoWidthPx: photoWidth,
        photoHeightPx: photoHeight,
        maxPageWidthMm: 200,
        maxPageHeightMm: 287,
      });
      expect(initial.widthMm).toBe(54);
      expect(initial.heightMm).toBe(30.4);

      // 2. Пользователь меняет ширину на 80 мм -> высота должна пересчитаться строго по ratio
      const newHeight1 = calculateHeightFromWidth(80, exactRatio);
      expect(newHeight1).toBe(45.0); // 80 / (16/9) = 45.0

      // 3. Пользователь меняет ширину на 100 мм -> высота
      const newHeight2 = calculateHeightFromWidth(100, exactRatio);
      expect(newHeight2).toBe(56.3); // 100 / (16/9) = 56.25 -> 56.3

      // 4. Пользователь меняет высоту на 60 мм -> ширина должна пересчитаться строго по ratio
      const newWidth1 = calculateWidthFromHeight(60, exactRatio);
      expect(newWidth1).toBe(106.7); // 60 * (16/9) = 106.666... -> 106.7

      // 5. Проверяем обратный пересчет: 106.7 мм -> высота возвращается в 60.0 мм
      const backHeight = calculateHeightFromWidth(newWidth1, exactRatio);
      expect(backHeight).toBe(60.0);
    });
  });
});
