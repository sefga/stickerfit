import { describe, it, expect } from 'vitest';
import { generateStickerCutSvg, getRegistrationMarksPositions, generateRegistrationTemplateSvg } from './svgCutGenerator';
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

  it('генерирует корректный SVG с физическими миллиметровыми размерами для кругов и PageBoundary', () => {
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
    expect(svg).toContain('<rect id="PageBoundary" x="0" y="0" width="210" height="297" fill="none" stroke="none" pointer-events="none" />');
    expect(svg).toContain('<g id="CutContour" stroke="#ff0000" stroke-width="0.1" fill="none">');
    // Проверяем наличие 2 окружностей с cx=30, cy=30 и cx=80, cy=30, r=20
    expect(svg).toContain('<circle cx="30.000" cy="30.000" r="20.000" />');
    expect(svg).toContain('<circle cx="80.000" cy="30.000" r="20.000" />');
    expect(svg).not.toContain('id="RegistrationMarks"');
  });

  it('по умолчанию исключает метки совмещения из SVG резки, даже если registrationMarks=true (защита мата)', () => {
    const svg = generateStickerCutSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      layout: dummyLayout,
      shape: 'circle',
      registrationMarks: true,
      includeMarksInSvg: false,
    });

    expect(svg).not.toContain('id="RegistrationMarks"');
    expect(svg).toContain('<g id="CutContour"');
  });

  it('включает группу RegistrationMarks только при явном includeMarksInSvg=true', () => {
    const svg = generateStickerCutSvg({
      pageWidthMm: 210,
      pageHeightMm: 297,
      layout: dummyLayout,
      shape: 'circle',
      registrationMarks: true,
      includeMarksInSvg: true,
    });

    expect(svg).toContain('<g id="RegistrationMarks" stroke="#000000" stroke-width="0.25" fill="none">');
    const marks = getRegistrationMarksPositions(210, 297, 8);
    expect(marks).toHaveLength(4);
    expect(marks[0]).toEqual({ cx: 8, cy: 8 });
    expect(marks[1]).toEqual({ cx: 202, cy: 8 });
    expect(marks[2]).toEqual({ cx: 8, cy: 289 });
    expect(marks[3]).toEqual({ cx: 202, cy: 289 });
  });

  it('генерирует чистый отдельный калибровочный шаблон реперов generateRegistrationTemplateSvg', () => {
    const templateSvg = generateRegistrationTemplateSvg(210, 297, 8);
    expect(templateSvg).toContain('width="210mm"');
    expect(templateSvg).toContain('height="297mm"');
    expect(templateSvg).toContain('<g id="RegistrationMarks"');
    expect(templateSvg).not.toContain('CutContour');
  });
});
