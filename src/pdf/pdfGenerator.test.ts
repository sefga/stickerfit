import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateStickerSheetPdf } from './pdfGenerator';
import { calculateLayout } from '../layout/layoutEngine';
import { mmToPoints, A4_WIDTH_MM, A4_HEIGHT_MM } from '../units/mm';

describe('PDF Regression Test (§30 ТЗ)', () => {
  it('Проверяет точный MediaBox созданного A4 PDF (595.276 × 841.890 pt)', async () => {
    const layout = calculateLayout({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 0,
      gapY: 0,
      allowRotation: false,
    });

    const pdfBytes = await generateStickerSheetPdf({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      layout,
      cutMarks: { enabled: true, lengthMm: 3, offsetMm: 1, lineWidthPt: 0.2 },
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Загружаем созданный PDF для валидации структуры
    const loadedPdf = await PDFDocument.load(pdfBytes);
    const pages = loadedPdf.getPages();
    expect(pages.length).toBe(1);

    const page = pages[0];
    const { width, height } = page.getSize();

    const expectedWidthPt = mmToPoints(210);
    const expectedHeightPt = mmToPoints(297);

    // Допустимая погрешность не более 0.01 pt
    expect(width).toBeCloseTo(expectedWidthPt, 2);
    expect(height).toBeCloseTo(expectedHeightPt, 2);
    expect(width).toBeCloseTo(595.276, 1);
    expect(height).toBeCloseTo(841.890, 1);

    // Проверяем, что координаты первого и последнего стикера не выходят за пределы листа
    for (const pos of layout.positions) {
      expect(pos.xMm).toBeGreaterThanOrEqual(0);
      expect(pos.yMm).toBeGreaterThanOrEqual(0);
      expect(pos.xMm + pos.widthMm).toBeLessThanOrEqual(A4_WIDTH_MM + 0.001);
      expect(pos.yMm + pos.heightMm).toBeLessThanOrEqual(A4_HEIGHT_MM + 0.001);
    }
  });

  it('Корректно генерирует альбомную ориентацию Landscape (297 × 210 мм)', async () => {
    const layout = calculateLayout({
      pageWidthMm: A4_HEIGHT_MM, // 297
      pageHeightMm: A4_WIDTH_MM, // 210
      stickerWidthMm: 60,
      stickerHeightMm: 40,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 2,
      gapY: 2,
      allowRotation: true,
    });

    const pdfBytes = await generateStickerSheetPdf({
      pageWidthMm: 297,
      pageHeightMm: 210,
      layout,
    });

    const loadedPdf = await PDFDocument.load(pdfBytes);
    const page = loadedPdf.getPages()[0];
    const { width, height } = page.getSize();

    expect(width).toBeCloseTo(mmToPoints(297), 2);
    expect(height).toBeCloseTo(mmToPoints(210), 2);
  });

  it('Корректно генерирует PDF для круглой формы с оптическими метками и вылетом Bleed', async () => {
    const layout = calculateLayout({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      gapX: 3,
      gapY: 3,
      allowRotation: false,
    });

    const pdfBytes = await generateStickerSheetPdf({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      layout,
      stickerShape: 'circle',
      bleedMm: 2,
      registrationMarks: true,
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    const loadedPdf = await PDFDocument.load(pdfBytes);
    expect(loadedPdf.getPageCount()).toBe(1);
  });
});
