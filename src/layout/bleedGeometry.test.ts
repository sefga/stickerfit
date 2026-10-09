import { describe, it, expect } from 'vitest';
import {
  getBleedBounds,
  getBleedDifferenceSvgPath,
  isValidHexColor,
  normalizeHexColor,
  hexToRgb01,
} from './bleedGeometry';

describe('bleedGeometry', () => {
  describe('getBleedBounds', () => {
    it('рассчитывает внешние габариты для прямоугольника (AC-001: 50x50 с вылетом 1 мм)', () => {
      const bounds = getBleedBounds({
        xMm: 10,
        yMm: 20,
        widthMm: 50,
        heightMm: 50,
        bleedMm: 1,
        shape: 'rect',
      });

      expect(bounds.outerX).toBe(9);
      expect(bounds.outerY).toBe(19);
      expect(bounds.outerWidth).toBe(52);
      expect(bounds.outerHeight).toBe(52);
    });

    it('рассчитывает габариты для круга с увеличением радиуса на b', () => {
      const bounds = getBleedBounds({
        xMm: 0,
        yMm: 0,
        widthMm: 40,
        heightMm: 40,
        bleedMm: 2,
        shape: 'circle',
      });

      expect(bounds.innerRadius).toBe(20);
      expect(bounds.outerRadius).toBe(22);
      expect(bounds.outerWidth).toBe(44);
      expect(bounds.outerHeight).toBe(44);
    });

    it('рассчитывает габариты для скругленного прямоугольника с радиусом R + b', () => {
      const bounds = getBleedBounds({
        xMm: 5,
        yMm: 5,
        widthMm: 60,
        heightMm: 40,
        bleedMm: 3,
        shape: 'rounded',
        cornerRadiusMm: 4,
      });

      expect(bounds.innerRadius).toBe(4);
      expect(bounds.outerRadius).toBe(7);
      expect(bounds.outerWidth).toBe(66);
      expect(bounds.outerHeight).toBe(46);
    });

    it('при вылете 0 мм внешние габариты совпадают с исходными', () => {
      const bounds = getBleedBounds({
        xMm: 15,
        yMm: 25,
        widthMm: 50,
        heightMm: 80,
        bleedMm: 0,
        shape: 'rect',
      });

      expect(bounds.outerX).toBe(15);
      expect(bounds.outerY).toBe(25);
      expect(bounds.outerWidth).toBe(50);
      expect(bounds.outerHeight).toBe(80);
    });
  });

  describe('getBleedDifferenceSvgPath', () => {
    it('возвращает пустую строку при нулевом вылете', () => {
      const path = getBleedDifferenceSvgPath({
        xMm: 10,
        yMm: 10,
        widthMm: 50,
        heightMm: 50,
        bleedMm: 0,
        shape: 'rect',
      });
      expect(path).toBe('');
    });

    it('формирует замкнутый составной путь для прямоугольника с CW и CCW обходами', () => {
      const path = getBleedDifferenceSvgPath({
        xMm: 10,
        yMm: 20,
        widthMm: 50,
        heightMm: 50,
        bleedMm: 1,
        shape: 'rect',
      });

      expect(path).toContain('M 9 19 H 61 V 71 H 9 Z');
      expect(path).toContain('M 10 20 V 70 H 60 V 20 Z');
    });

    it('формирует путь разности для круга', () => {
      const path = getBleedDifferenceSvgPath({
        xMm: 0,
        yMm: 0,
        widthMm: 50,
        heightMm: 50,
        bleedMm: 2,
        shape: 'circle',
      });

      expect(path).toContain('A 27 27 0 1 1');
      expect(path).toContain('A 25 25 0 1 0');
    });

    it('формирует путь разности для скругленного прямоугольника', () => {
      const path = getBleedDifferenceSvgPath({
        xMm: 10,
        yMm: 10,
        widthMm: 40,
        heightMm: 40,
        bleedMm: 1,
        shape: 'rounded',
        cornerRadiusMm: 5,
      });

      expect(path).toContain('A 6 6 0 0 1');
      expect(path).toContain('A 5 5 0 0 0');
    });
  });

  describe('HEX color helpers', () => {
    it('проверяет валидность HEX цветов', () => {
      expect(isValidHexColor('#ffffff')).toBe(true);
      expect(isValidHexColor('#FFF')).toBe(true);
      expect(isValidHexColor('#3b82f6')).toBe(true);
      expect(isValidHexColor('123456')).toBe(false);
      expect(isValidHexColor('#12345')).toBe(false);
      expect(isValidHexColor('#GGGGGG')).toBe(false);
    });

    it('нормализует HEX цвета', () => {
      expect(normalizeHexColor('#fff')).toBe('#FFFFFF');
      expect(normalizeHexColor('#3b82f6')).toBe('#3B82F6');
      expect(normalizeHexColor('invalid', '#FFFFFF')).toBe('#FFFFFF');
    });

    it('конвертирует HEX в компоненты 0..1 RGB', () => {
      const white = hexToRgb01('#FFFFFF');
      expect(white.r).toBe(1);
      expect(white.g).toBe(1);
      expect(white.b).toBe(1);

      const black = hexToRgb01('#000000');
      expect(black.r).toBe(0);
      expect(black.g).toBe(0);
      expect(black.b).toBe(0);

      const red = hexToRgb01('#FF0000');
      expect(red.r).toBe(1);
      expect(red.g).toBe(0);
      expect(red.b).toBe(0);
    });
  });
});
