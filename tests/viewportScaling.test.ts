import { describe, it, expect } from 'vitest';
import { renderPreviewSvg } from '../src/preview/previewRenderer';
import { calculateLayout } from '../src/layout/layoutEngine';
import { normalizeCropRect } from '../src/image/cropEngine';
import { DEFAULT_CUT_MARKS_CONFIG } from '../src/pdf/cutMarks';

describe('Viewport Scaling & Performance (Инварианты геометрии и скорости)', () => {
  const baseMargins = { top: 5, bottom: 5, left: 5, right: 5 };

  it('SVG-превью НИКОГДА не содержит preserveAspectRatio="none", предотвращая деформацию фото', () => {
    const layout = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 54,
      stickerHeightMm: 85,
      margins: baseMargins,
      gapX: 2,
      gapY: 2,
      allowRotation: false,
    });

    const svgFill = renderPreviewSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      margins: baseMargins,
      layout,
      imageUrl: 'blob:http://localhost:5173/mock-uuid-1',
      sizingMode: 'fill',
      cutMarksConfig: DEFAULT_CUT_MARKS_CONFIG,
    });

    // Никакого растяжения!
    expect(svgFill).not.toContain('preserveAspectRatio="none"');
    expect(svgFill).toContain('preserveAspectRatio="xMidYMid slice"');

    const svgFit = renderPreviewSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      margins: baseMargins,
      layout,
      imageUrl: 'blob:http://localhost:5173/mock-uuid-1',
      sizingMode: 'fit',
      cutMarksConfig: DEFAULT_CUT_MARKS_CONFIG,
    });

    expect(svgFit).not.toContain('preserveAspectRatio="none"');
    expect(svgFit).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it('SVG использует архитектуру <defs> + <use>, не тиражируя тяжелые данные по DOM', () => {
    // Раскладка на 50+ стикеров
    const layout = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 30,
      stickerHeightMm: 30,
      margins: baseMargins,
      gapX: 2,
      gapY: 2,
      allowRotation: false,
    });

    expect(layout.positions.length).toBeGreaterThan(40);

    const mockImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const svg = renderPreviewSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      margins: baseMargins,
      layout,
      imageUrl: mockImageUrl,
      sizingMode: 'fill',
      cutMarksConfig: DEFAULT_CUT_MARKS_CONFIG,
    });

    // Тег <image> объявляется ровно 1 раз внутри <defs>
    const imageTagCount = (svg.match(/<image\b/g) || []).length;
    expect(imageTagCount).toBe(1);

    // Все ячейки используют <use href="#stickerArtSource" ...>
    const useTagCount = (svg.match(/<use\b/g) || []).length;
    expect(useTagCount).toBe(layout.positions.length);

    // Размер разметки остается минимальным (< 15 КБ)
    expect(svg.length).toBeLessThan(15000);
  });

  it('Корректно обрабатывает поворот ячеек на 90° при автоповороте', () => {
    // Стикер 85x54 при включенном автоповороте
    const layout = calculateLayout({
      pageWidthMm: 210,
      pageHeightMm: 297,
      stickerWidthMm: 85,
      stickerHeightMm: 54,
      margins: baseMargins,
      gapX: 2,
      gapY: 2,
      allowRotation: true,
    });

    const svg = renderPreviewSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      margins: baseMargins,
      layout,
      imageUrl: 'blob:http://localhost:5173/mock-uuid-rot',
      sizingMode: 'fill',
      cutMarksConfig: DEFAULT_CUT_MARKS_CONFIG,
    });

    // Проверяем, что размеры в defs соответствуют ячейкам layout
    const firstPos = layout.positions[0];
    expect(svg).toContain(`width="${firstPos.widthMm}" height="${firstPos.heightMm}"`);
    expect(svg).toContain('<use href="#stickerArtSource"');
  });

  it('Нормализация cropRect сохраняет пропорции при переходе горизонтальное фото -> вертикальный стикер', () => {
    // 16:9 фото (1920x1080) кадрировано как 1920x1080
    // Целевой стикер вертикальный 54x85 (0.635)
    const targetRatio = 54 / 85;
    const normalized = normalizeCropRect(0, 0, 1920, 1080, targetRatio);

    // Новое соотношение строго равно targetRatio
    expect(normalized.width / normalized.height).toBeCloseTo(targetRatio, 2);
    // Высота 1080, ширина центрирована
    expect(normalized.height).toBe(1080);
    expect(normalized.width).toBe(Math.round(1080 * targetRatio)); // 686
    expect(normalized.x).toBe(Math.round((1920 - 686) / 2)); // 617
    expect(normalized.y).toBe(0);
  });
});
