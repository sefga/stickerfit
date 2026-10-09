import { describe, it, expect } from 'vitest';
import { renderPreviewSvg } from './previewRenderer';
import { calculateLayout } from '../layout/layoutEngine';
import { DEFAULT_CUT_MARKS_CONFIG } from '../pdf/cutMarks';

describe('previewRenderer', () => {
  const defaultLayout = calculateLayout({
    pageWidthMm: 210,
    pageHeightMm: 297,
    stickerWidthMm: 50,
    stickerHeightMm: 50,
    margins: { top: 5, bottom: 5, left: 5, right: 5 },
    gapX: 2,
    gapY: 2,
    allowRotation: false,
  });

  it('при вылете 0 мм не рисует путь вылета и условную желтую область', () => {
    const svg = renderPreviewSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      layout: defaultLayout,
      cutMarksConfig: DEFAULT_CUT_MARKS_CONFIG,
      bleedMm: 0,
      bleedColor: '#FF0000',
    });

    expect(svg).not.toContain('fill-rule="evenodd"');
    expect(svg).not.toContain('#fef3c7'); // Старый желтый цвет убран
    expect(svg).not.toContain('#FF0000'); // При 0 мм цвет вылета не рисуется
  });

  it('при вылете 1 мм и цвете #3B82F6 рисует внешнюю заливку реальным цветом с fill-rule="evenodd"', () => {
    const layoutWithBleed = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 2,
      gapY: 2,
      allowRotation: false,
      bleedMm: 1,
    });

    const svg = renderPreviewSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      layout: layoutWithBleed,
      cutMarksConfig: DEFAULT_CUT_MARKS_CONFIG,
      bleedMm: 1,
      bleedColor: '#3b82f6',
      stickerShape: 'rect',
    });

    expect(svg).toContain('fill="#3B82F6"');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).not.toContain('#fef3c7');
  });

  it('для круглого стикера вылет рисуется с реальным цветом', () => {
    const layout = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 40,
      stickerHeightMm: 40,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 2,
      gapY: 2,
      allowRotation: false,
      bleedMm: 2,
    });

    const svg = renderPreviewSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      layout,
      cutMarksConfig: DEFAULT_CUT_MARKS_CONFIG,
      bleedMm: 2,
      bleedColor: '#10B981',
      stickerShape: 'circle',
    });

    expect(svg).toContain('fill="#10B981"');
    expect(svg).toContain('fill-rule="evenodd"');
  });
});
