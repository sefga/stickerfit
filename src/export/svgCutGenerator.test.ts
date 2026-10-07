import { describe, it, expect } from 'vitest';
import { generateStickerCutSvg, getRegistrationMarksPositions } from './svgCutGenerator';
import { LayoutResult } from '../layout/layoutEngine';

describe('svgCutGenerator', () => {
  const dummyLayout: LayoutResult = {
    selectedRotation: 0,
    columns: 2,
    rows: 1,
    totalCapacity: 2,
    actualCopies: 2,
    requestedCopies: 'AUTO',
    positions: [
      { index: 0, col: 0, row: 0, xMm: 10, yMm: 10, widthMm: 40, heightMm: 40, rotation: 0 },
      { index: 1, col: 1, row: 0, xMm: 60, yMm: 10, widthMm: 40, heightMm: 40, rotation: 0 },
    ],
    usableWidthMm: 190,
    usableHeightMm: 277,
    alternativeCapacity: 2,
    rotationRecommended: false,
    recommendationMessage: '',
    hasError: false,
  };

  it('генерирует корректный SVG с физическими миллиметровыми размерами для кругов', () => {
    const svg = generateStickerCutSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      layout: dummyLayout,
      shape: 'circle',
      registrationMarks: false,
    });

    expect(svg).toContain('width="210mm"');
    expect(svg).toContain('height="297mm"');
    expect(svg).toContain('viewBox="0 0 210 297"');
    expect(svg).toContain('<g id="CutContour" stroke="#ff0000" stroke-width="0.1" fill="none">');
    // Проверяем наличие 2 окружностей с cx=30, cy=30 и cx=80, cy=30, r=20
    expect(svg).toContain('<circle cx="30.000" cy="30.000" r="20.000" />');
    expect(svg).toContain('<circle cx="80.000" cy="30.000" r="20.000" />');
    expect(svg).not.toContain('id="RegistrationMarks"');
  });

  it('генерирует скругленные прямоугольники при shape="rounded"', () => {
    const svg = generateStickerCutSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      layout: dummyLayout,
      shape: 'rounded',
      cornerRadiusMm: 5,
    });

    expect(svg).toContain('<rect x="10.000" y="10.000" width="40.000" height="40.000" rx="5.000" ry="5.000" />');
  });

  it('генерирует стандартные прямоугольники при shape="rect"', () => {
    const svg = generateStickerCutSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      layout: dummyLayout,
      shape: 'rect',
    });

    expect(svg).toContain('<rect x="10.000" y="10.000" width="40.000" height="40.000" />');
  });

  it('генерирует группу RegistrationMarks при registrationMarks=true', () => {
    const svg = generateStickerCutSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      layout: dummyLayout,
      shape: 'circle',
      registrationMarks: true,
    });

    expect(svg).toContain('<g id="RegistrationMarks" stroke="#000000" stroke-width="0.25" fill="none">');
    const marks = getRegistrationMarksPositions(210, 297, 8);
    expect(marks).toHaveLength(4);
    expect(marks[0]).toEqual({ cx: 8, cy: 8 });
    expect(marks[1]).toEqual({ cx: 202, cy: 8 });
    expect(marks[2]).toEqual({ cx: 8, cy: 289 });
    expect(marks[3]).toEqual({ cx: 202, cy: 289 });
  });
});
