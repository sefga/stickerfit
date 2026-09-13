import { describe, it, expect } from 'vitest';
import { calculateLayout } from './layoutEngine';

describe('Layout Engine — Математические тесты геометрии раскладки', () => {
  // Test 1 из ТЗ (§29):
  // A4: 210 × 297 мм, Sticker: 50 × 50 мм, Margins: 5 мм, Gap: 0 мм.
  it('Тест 1: A4 210x297, стикер 50x50, поля 5 мм, зазор 0 мм', () => {
    const result = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 0,
      gapY: 0,
      allowRotation: false,
    });

    // Доступная ширина = 210 - 10 = 200 мм -> 200 / 50 = 4 колонки
    // Доступная высота = 297 - 10 = 287 мм -> floor(287 / 50) = 5 строк (250 мм)
    // Емкость = 4 * 5 = 20 шт.
    expect(result.columns).toBe(4);
    expect(result.rows).toBe(5);
    expect(result.totalCapacity).toBe(20);
    expect(result.actualCopies).toBe(20);
    expect(result.positions.length).toBe(20);

    // Проверка центрирования:
    // По горизонтали: 200 - 200 = 0 остаток -> offsetX = 5 мм
    // По вертикали: 287 - 250 = 37 мм остаток -> 37 / 2 = 18.5 мм смещение -> offsetY = 5 + 18.5 = 23.5 мм
    expect(result.positions[0].xMm).toBe(5);
    expect(result.positions[0].yMm).toBe(23.5);

    // Последний стикер (col 3, row 4):
    // x = 5 + 3 * 50 = 155 мм (край = 155 + 50 = 205 мм <= 205 мм)
    // y = 23.5 + 4 * 50 = 223.5 мм (край = 223.5 + 50 = 273.5 мм <= 292 мм)
    const lastSticker = result.positions[19];
    expect(lastSticker.xMm).toBe(155);
    expect(lastSticker.yMm).toBe(223.5);
    expect(lastSticker.xMm + lastSticker.widthMm).toBeLessThanOrEqual(205);
    expect(lastSticker.yMm + lastSticker.heightMm).toBeLessThanOrEqual(292);
  });

  // Test 2 из ТЗ (§29 и §10):
  // Sticker: 54 × 85 мм, Margins: 5 мм, Gap: 3 мм.
  // Вариант без поворота (54x85) -> 9 шт.
  // Вариант с поворотом (85x54) -> 10 шт.
  it('Тест 2: Автовыбор ориентации (54x85 мм) выбирает вариант с 10 шт. вместо 9 шт.', () => {
    // 1. При allowRotation = false
    const withoutRotation = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 54,
      stickerHeightMm: 85,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 3,
      gapY: 3,
      allowRotation: false,
    });
    expect(withoutRotation.selectedRotation).toBe(0);
    expect(withoutRotation.columns).toBe(3);
    expect(withoutRotation.rows).toBe(3);
    expect(withoutRotation.totalCapacity).toBe(9);

    // 2. При allowRotation = true
    const withRotation = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 54,
      stickerHeightMm: 85,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 3,
      gapY: 3,
      allowRotation: true,
    });
    expect(withRotation.selectedRotation).toBe(90);
    expect(withRotation.columns).toBe(2);
    expect(withRotation.rows).toBe(5);
    expect(withRotation.totalCapacity).toBe(10);
    expect(withRotation.rotationRecommended).toBe(true);
    expect(withRotation.recommendationMessage).toContain('10 шт. вместо 9 шт.');
  });

  // Test 3 из ТЗ (§29):
  // Стикер больше доступной области. Результат: 0 copies + понятная ошибка.
  it('Тест 3: Стикер больше доступной области -> 0 копий и понятная ошибка', () => {
    const result = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 250,
      stickerHeightMm: 350,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 3,
      gapY: 3,
      allowRotation: true,
    });
    expect(result.totalCapacity).toBe(0);
    expect(result.actualCopies).toBe(0);
    expect(result.positions).toHaveLength(0);
    expect(result.hasError).toBe(true);
    expect(result.errorMessage).toBeDefined();
  });

  // Test 4 из ТЗ (§29):
  // Gap = 0.
  it('Тест 4: Зазор (Gap) = 0 мм корректно рассчитывается', () => {
    const result = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 60,
      stickerHeightMm: 40,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      gapX: 0,
      gapY: 0,
      allowRotation: false,
    });
    // Usable: 190 x 277
    // Cols = floor(190 / 60) = 3 (180 мм)
    // Rows = floor(277 / 40) = 6 (240 мм)
    expect(result.columns).toBe(3);
    expect(result.rows).toBe(6);
    expect(result.totalCapacity).toBe(18);
  });

  // Test 5 из ТЗ (§29):
  // Margins = 0.
  it('Тест 5: Поля (Margins) = 0 мм корректно рассчитываются', () => {
    const result = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 70,
      stickerHeightMm: 99,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      gapX: 0,
      gapY: 0,
      allowRotation: false,
    });
    // Usable: 210 x 297
    // Cols = 210 / 70 = 3
    // Rows = 297 / 99 = 3
    expect(result.columns).toBe(3);
    expect(result.rows).toBe(3);
    expect(result.totalCapacity).toBe(9);
    expect(result.positions[0].xMm).toBe(0);
    expect(result.positions[0].yMm).toBe(0);
  });

  // Test 6 из ТЗ (§29):
  // Дробные миллиметры: 54.3 × 84.7 мм, отсутствие накопления погрешностей округления.
  it('Тест 6: Дробные размеры (54.3 × 84.7 мм) без накопления ошибок округления', () => {
    const result = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 54.3,
      stickerHeightMm: 84.7,
      margins: { top: 5.5, bottom: 5.5, left: 5.5, right: 5.5 },
      gapX: 2.5,
      gapY: 2.5,
      allowRotation: false,
    });

    // Usable width: 210 - 11 = 199 mm
    // Usable height: 297 - 11 = 286 mm
    // Cols = floor((199 + 2.5) / (54.3 + 2.5)) = floor(201.5 / 56.8) = 3
    // Rows = floor((286 + 2.5) / (84.7 + 2.5)) = floor(288.5 / 87.2) = 3
    expect(result.columns).toBe(3);
    expect(result.rows).toBe(3);
    expect(result.totalCapacity).toBe(9);

    // Все координаты должны быть строго в пределах листа A4
    for (const pos of result.positions) {
      expect(pos.xMm).toBeGreaterThanOrEqual(0);
      expect(pos.yMm).toBeGreaterThanOrEqual(0);
      expect(pos.xMm + pos.widthMm).toBeLessThanOrEqual(210);
      expect(pos.yMm + pos.heightMm).toBeLessThanOrEqual(297);
    }
  });

  // Дополнительный тест: Ограничение количества копий (requestedCopies = 7 из 10)
  it('Тест частичного заполнения (requestedCopies = 7)', () => {
    const result = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 54,
      stickerHeightMm: 85,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 3,
      gapY: 3,
      allowRotation: true,
      requestedCopies: 7,
    });

    expect(result.totalCapacity).toBe(10);
    expect(result.actualCopies).toBe(7);
    expect(result.positions).toHaveLength(7);
  });

  // Тесты режимов распределения отступов (spacingMode)
  describe('Тестирование режимов распределения отступов (spacingMode)', () => {
    it('Режим "start" (Точные поля): строго фиксирует левый и верхний отступ от края листа', () => {
      const margins = { top: 10, bottom: 10, left: 15, right: 10 };
      const gapX = 4;
      const gapY = 4;
      const result = calculateLayout({
        pageWidthMm: 210,
        pageHeightMm: 297,
        stickerWidthMm: 50,
        stickerHeightMm: 50,
        margins,
        gapX,
        gapY,
        allowRotation: false,
        spacingMode: 'start',
      });

      // Первый стикер должен начинаться строго с margins.left и margins.top
      expect(result.positions[0].xMm).toBeCloseTo(margins.left, 4);
      expect(result.positions[0].yMm).toBeCloseTo(margins.top, 4);

      // Проверяем, что зазор между соседними колонками равен ровно gapX
      if (result.columns > 1) {
        const deltaX = result.positions[1].xMm - (result.positions[0].xMm + result.positions[0].widthMm);
        expect(deltaX).toBeCloseTo(gapX, 4);
      }

      // Проверяем, что зазор между соседними строками равен ровно gapY
      if (result.rows > 1) {
        const secondRowFirstCol = result.positions[result.columns];
        const deltaY = secondRowFirstCol.yMm - (result.positions[0].yMm + result.positions[0].heightMm);
        expect(deltaY).toBeCloseTo(gapY, 4);
      }
    });

    it('Режим "justify" (Равномерно): равномерно распределяет остаточное пространство между зазорами', () => {
      const margins = { top: 5, bottom: 5, left: 5, right: 5 };
      const gapX = 2;
      const gapY = 2;
      const resultJustify = calculateLayout({
        pageWidthMm: 210,
        pageHeightMm: 297,
        stickerWidthMm: 50,
        stickerHeightMm: 50,
        margins,
        gapX,
        gapY,
        allowRotation: false,
        spacingMode: 'justify',
      });

      // В режиме justify эффективный зазор должен быть больше или равен базовому gapX/gapY
      if (resultJustify.columns > 1) {
        const deltaX = resultJustify.positions[1].xMm - (resultJustify.positions[0].xMm + resultJustify.positions[0].widthMm);
        expect(deltaX).toBeGreaterThanOrEqual(gapX);
      }
      // Все элементы не выходят за границы листа
      for (const pos of resultJustify.positions) {
        expect(pos.xMm).toBeGreaterThanOrEqual(margins.left - 0.001);
        expect(pos.yMm).toBeGreaterThanOrEqual(margins.top - 0.001);
        expect(pos.xMm + pos.widthMm).toBeLessThanOrEqual(210 - margins.right + 0.001);
        expect(pos.yMm + pos.heightMm).toBeLessThanOrEqual(297 - margins.bottom + 0.001);
      }
    });

    it('Режим "center" (дефолт): центрирует всю сетку стикеров внутри полезной области', () => {
      const margins = { top: 5, bottom: 5, left: 5, right: 5 };
      const resultCenter = calculateLayout({
        pageWidthMm: 210,
        pageHeightMm: 297,
        stickerWidthMm: 50,
        stickerHeightMm: 50,
        margins,
        gapX: 2,
        gapY: 2,
        allowRotation: false,
        spacingMode: 'center',
      });

      // В center режиме при наличии неполного заполнения offsetX > margins.left
      expect(resultCenter.positions[0].xMm).toBeGreaterThanOrEqual(margins.left);
      expect(resultCenter.positions[0].yMm).toBeGreaterThanOrEqual(margins.top);
    });
  });
});
