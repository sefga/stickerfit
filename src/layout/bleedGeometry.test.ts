import { describe, it, expect } from 'vitest';
import {
  getBleedBounds,
  getBleedDifferenceSvgPath,
  getBleedOuterSvgPath,
  isValidHexColor,
  normalizeHexColor,
  hexToRgb01,
  getInnerArtBounds,
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

  describe('getBleedOuterSvgPath', () => {
    it('возвращает пустую строку при нулевом вылете', () => {
      const path = getBleedOuterSvgPath({
        xMm: 10,
        yMm: 10,
        widthMm: 50,
        heightMm: 50,
        bleedMm: 0,
        shape: 'rect',
      });
      expect(path).toBe('');
    });

    it('формирует сплошной внешний прямоугольник без внутренних вырезов', () => {
      const path = getBleedOuterSvgPath({
        xMm: 10,
        yMm: 20,
        widthMm: 50,
        heightMm: 50,
        bleedMm: 1,
        shape: 'rect',
      });

      expect(path).toBe('M 9 19 H 61 V 71 H 9 Z');
    });

    it('формирует сплошной внешний круг без внутренней дырки', () => {
      const path = getBleedOuterSvgPath({
        xMm: 0,
        yMm: 0,
        widthMm: 50,
        heightMm: 50,
        bleedMm: 2,
        shape: 'circle',
      });

      expect(path).toContain('A 27 27 0 1 1');
      expect(path).not.toContain('A 25'); // Нет внутреннего выреза
    });

    it('формирует сплошной внешний скругленный прямоугольник', () => {
      const path = getBleedOuterSvgPath({
        xMm: 10,
        yMm: 10,
        widthMm: 40,
        heightMm: 40,
        bleedMm: 1,
        shape: 'rounded',
        cornerRadiusMm: 5,
      });

      expect(path).toContain('A 6 6 0 0 1');
      expect(path).not.toContain('A 5 5'); // Нет внутреннего выреза
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

  describe('getInnerArtBounds', () => {
    it('возвращает исходные габариты без сжатия при bleedCenterCut = false', () => {
      const bounds = getInnerArtBounds(50, 50, 2, 'circle', false);
      expect(bounds.insetMm).toBe(0);
      expect(bounds.innerX).toBe(0);
      expect(bounds.innerY).toBe(0);
      expect(bounds.innerWidth).toBe(50);
      expect(bounds.innerHeight).toBe(50);
      expect(bounds.innerRadius).toBe(25);
    });

    it('возвращает исходные габариты без сжатия при bleedMm = 0 даже если bleedCenterCut = true', () => {
      const bounds = getInnerArtBounds(50, 50, 0, 'circle', true);
      expect(bounds.insetMm).toBe(0);
      expect(bounds.innerWidth).toBe(50);
      expect(bounds.innerHeight).toBe(50);
      expect(bounds.innerRadius).toBe(25);
    });

    it('AC-01: для круга 50 мм и вылета 1 мм сжимает картинку на 1 мм (диаметр 48 мм, радиус 24 мм)', () => {
      const bounds = getInnerArtBounds(50, 50, 1, 'circle', true);
      expect(bounds.insetMm).toBe(1);
      expect(bounds.innerX).toBe(1);
      expect(bounds.innerY).toBe(1);
      expect(bounds.innerWidth).toBe(48);
      expect(bounds.innerHeight).toBe(48);
      expect(bounds.innerRadius).toBe(24);
    });

    it('для прямоугольника 60x40 и вылета 2 мм сжимает до 56x36 со смещением (2, 2)', () => {
      const bounds = getInnerArtBounds(60, 40, 2, 'rect', true);
      expect(bounds.insetMm).toBe(2);
      expect(bounds.innerX).toBe(2);
      expect(bounds.innerY).toBe(2);
      expect(bounds.innerWidth).toBe(56);
      expect(bounds.innerHeight).toBe(36);
    });

    it('для скругленного прямоугольника 60x40 r=5 и вылета 2 мм уменьшает радиус скругления до 3 мм', () => {
      const bounds = getInnerArtBounds(60, 40, 2, 'rounded', true, 5);
      expect(bounds.insetMm).toBe(2);
      expect(bounds.innerRadius).toBe(3);
      expect(bounds.innerWidth).toBe(56);
      expect(bounds.innerHeight).toBe(36);
    });

    it('ограничивает сжатие лимитом 40% от минимального размера, если вылет слишком велик', () => {
      // Стикер 10 мм, вылет 5 мм -> лимит 40% = 4 мм, результирующий размер 2 мм (20% от исходного)
      const bounds = getInnerArtBounds(10, 10, 5, 'circle', true);
      expect(bounds.insetMm).toBe(4);
      expect(bounds.innerWidth).toBe(2);
      expect(bounds.innerHeight).toBe(2);
      expect(bounds.innerRadius).toBe(1);
    });
  });
});
