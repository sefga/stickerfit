import { LayoutResult } from '../layout/layoutEngine';
import { CutMarksConfig, generateCutMarks } from '../pdf/cutMarks';
import { Margins } from '../layout/layoutEngine';
import { SizingMode } from '../image/cropEngine';
import { StickerShape } from '../state';
import { getRegistrationMarksPositions } from '../export/svgCutGenerator';
import { getBleedDifferenceSvgPath, normalizeHexColor } from '../layout/bleedGeometry';
import { t } from '../i18n';

export interface PreviewOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  margins: Margins;
  layout: LayoutResult;
  imageUrl?: string | null;
  sizingMode?: SizingMode;
  cutMarksConfig: CutMarksConfig;
  bleedMm?: number;
  bleedColor?: string;
  stickerShape?: StickerShape;
  cornerRadiusMm?: number;
  registrationMarks?: boolean;
}

/**
 * Генерация разметки SVG для точного физического отображения листа A4 на экране.
 * Использует viewBox в физических миллиметрах (viewBox="0 0 pageWidthMm pageHeightMm").
 */
export function renderPreviewSvg(options: PreviewOptions): string {
  const {
    pageWidthMm,
    pageHeightMm,
    margins,
    layout,
    imageUrl,
    sizingMode = 'fill',
    cutMarksConfig,
    bleedMm = 0,
    bleedColor = '#FFFFFF',
    stickerShape = 'rect',
    cornerRadiusMm = 3,
    registrationMarks = false,
  } = options;

  const svgParts: string[] = [];

  // 1. Корневой тег SVG
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${pageWidthMm} ${pageHeightMm}" ` +
    `width="100%" height="100%" ` +
    `class="sheet-svg" ` +
    `preserveAspectRatio="xMidYMid meet">`
  );

  const firstPos = layout.positions.length > 0 ? layout.positions[0] : null;
  const stickerW = firstPos ? firstPos.widthMm : 50;
  const stickerH = firstPos ? firstPos.heightMm : 50;
  const par = sizingMode === 'fit' ? 'xMidYMid meet' : 'xMidYMid slice';
  const shouldApplyShadow = layout.positions.length <= 40;

  const clampedRadius = Math.max(0, Math.min(cornerRadiusMm, Math.min(stickerW, stickerH) / 2));

  // Определение клип-пути для формы стикера
  let clipGeometry = '';
  let strokeContour = '';

  if (stickerShape === 'circle') {
    const d = Math.min(stickerW, stickerH);
    const r = d / 2;
    clipGeometry = `<circle cx="${stickerW / 2}" cy="${stickerH / 2}" r="${r}" />`;
    strokeContour = `<circle cx="${stickerW / 2}" cy="${stickerH / 2}" r="${r}" fill="none" stroke="#ef4444" stroke-width="0.2" stroke-dasharray="1.2,0.8" />`;
  } else if (stickerShape === 'rounded') {
    clipGeometry = `<rect x="0" y="0" width="${stickerW}" height="${stickerH}" rx="${clampedRadius}" ry="${clampedRadius}" />`;
    strokeContour = `<rect x="0" y="0" width="${stickerW}" height="${stickerH}" rx="${clampedRadius}" ry="${clampedRadius}" fill="none" stroke="#ef4444" stroke-width="0.2" stroke-dasharray="1.2,0.8" />`;
  } else {
    clipGeometry = `<rect x="0" y="0" width="${stickerW}" height="${stickerH}" />`;
    strokeContour = `<rect x="0" y="0" width="${stickerW}" height="${stickerH}" fill="none" stroke="#ef4444" stroke-width="0.2" stroke-dasharray="1.2,0.8" />`;
  }

  // Определение стилей, фильтров и переиспользуемых элементов
  let imageDef = '';
  if (imageUrl) {
    imageDef = `
      <clipPath id="stickerShapeClip">
        ${clipGeometry}
      </clipPath>
      <g id="stickerArtSource">
        <g clip-path="url(#stickerShapeClip)">
          <image href="${imageUrl}" x="0" y="0" width="${stickerW}" height="${stickerH}" preserveAspectRatio="${par}" />
        </g>
        ${strokeContour}
      </g>
    `;
  }

  svgParts.push(`
    <defs>
      <pattern id="diagonalHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#e2e8f0" stroke-width="0.8" />
      </pattern>
      <filter id="stickerShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="0.3" stdDeviation="0.4" flood-color="#000000" flood-opacity="0.12" />
      </filter>
      ${imageDef}
    </defs>
  `);

  // 2. Фон листа (белая бумага)
  svgParts.push(
    `<rect x="0" y="0" width="${pageWidthMm}" height="${pageHeightMm}" fill="#ffffff" />`
  );

  // 3. Зона полей листа (Margins area) - пунктирная рамка
  const usableW = Math.max(0, pageWidthMm - margins.left - margins.right);
  const usableH = Math.max(0, pageHeightMm - margins.top - margins.bottom);
  if (usableW > 0 && usableH > 0) {
    svgParts.push(
      `<rect x="${margins.left}" y="${margins.top}" width="${usableW}" height="${usableH}" ` +
      `fill="none" stroke="#cbd5e1" stroke-width="0.25" stroke-dasharray="1.5,1.5" />`
    );
  }

  // 4. Оптические метки совмещения плоттера (если включены)
  if (registrationMarks) {
    const marks = getRegistrationMarksPositions(pageWidthMm, pageHeightMm, 8);
    svgParts.push(`<g id="previewRegistrationMarks" stroke="#000000" stroke-width="0.25" fill="none">`);
    for (const m of marks) {
      svgParts.push(`  <line x1="${m.cx - 4}" y1="${m.cy}" x2="${m.cx + 4}" y2="${m.cy}" />`);
      svgParts.push(`  <line x1="${m.cx}" y1="${m.cy - 4}" x2="${m.cx}" y2="${m.cy + 4}" />`);
      svgParts.push(`  <circle cx="${m.cx}" cy="${m.cy}" r="1.5" />`);
    }
    const tl = marks[0];
    svgParts.push(`  <rect x="${tl.cx - 1.5}" y="${tl.cy - 1.5}" width="3" height="3" fill="#000000" stroke="none" />`);
    svgParts.push(`</g>`);
  }

  // 5. Отрисовка каждого стикера через легковесные ссылки <use>
  const maxRenderPositions = 300;
  const visiblePositions = layout.positions.slice(0, maxRenderPositions);

  visiblePositions.forEach((pos, idx) => {
    const { xMm, yMm, widthMm, heightMm } = pos;

    // FR-008: Внешний цветной вылет под обрез реальным цветом bleedColor
    if (bleedMm > 0) {
      const color = normalizeHexColor(bleedColor);
      const bleedPath = getBleedDifferenceSvgPath({
        xMm,
        yMm,
        widthMm,
        heightMm,
        bleedMm,
        shape: stickerShape,
        cornerRadiusMm: clampedRadius,
      });

      if (bleedPath) {
        svgParts.push(
          `<path d="${bleedPath}" fill="${color}" fill-rule="evenodd" stroke="#cbd5e1" stroke-width="0.12" />`
        );
      }
    }

    // Если загружено изображение
    if (imageUrl) {
      if (shouldApplyShadow) {
        svgParts.push(
          `<use href="#stickerArtSource" x="${xMm}" y="${yMm}" filter="url(#stickerShadow)" />`
        );
      } else {
        svgParts.push(
          `<use href="#stickerArtSource" x="${xMm}" y="${yMm}" />`
        );
      }
    } else {
      // Плейсхолдер стикера (когда изображение еще не загружено)
      const shadowAttr = shouldApplyShadow ? ' filter="url(#stickerShadow)"' : '';
      let placeholderShape = '';
      if (stickerShape === 'circle') {
        const d = Math.min(widthMm, heightMm);
        placeholderShape = `<circle cx="${xMm + widthMm / 2}" cy="${yMm + heightMm / 2}" r="${d / 2}" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.3" />`;
      } else if (stickerShape === 'rounded') {
        placeholderShape = `<rect x="${xMm}" y="${yMm}" width="${widthMm}" height="${heightMm}" rx="${clampedRadius}" ry="${clampedRadius}" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.3" />`;
      } else {
        placeholderShape = `<rect x="${xMm}" y="${yMm}" width="${widthMm}" height="${heightMm}" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.3" rx="0.5" />`;
      }

      svgParts.push(
        `<g${shadowAttr}>` +
        placeholderShape +
        `<text x="${xMm + widthMm / 2}" y="${yMm + heightMm / 2 + 1.5}" ` +
        `font-family="system-ui, -apple-system, sans-serif" font-size="3" fill="#64748b" text-anchor="middle" font-weight="500">` +
        `${t('previewStickerPlaceholder', { idx: idx + 1, w: Math.round(widthMm), h: Math.round(heightMm) })}</text>` +
        `</g>`
      );
    }
  });

  if (layout.positions.length > maxRenderPositions) {
    svgParts.push(`
      <g>
        <rect x="15" y="${pageHeightMm - 14}" width="${pageWidthMm - 30}" height="8" rx="2" fill="#0f172a" fill-opacity="0.85" />
        <text x="${pageWidthMm / 2}" y="${pageHeightMm - 9}" font-family="system-ui, sans-serif" font-size="2.8" fill="#ffffff" text-anchor="middle" font-weight="600">
          Показаны первые ${maxRenderPositions} из ${layout.positions.length} стикеров (для плавной работы интерфейса)
        </text>
      </g>
    `);
  }

  // 6. Векторные метки реза (Cut marks)
  if (cutMarksConfig.enabled && layout.positions.length > 0) {
    const marks = generateCutMarks(layout.positions, cutMarksConfig);
    for (const mark of marks) {
      svgParts.push(
        `<line x1="${mark.x1Mm}" y1="${mark.y1Mm}" x2="${mark.x2Mm}" y2="${mark.y2Mm}" ` +
        `stroke="#1e293b" stroke-width="${cutMarksConfig.lineWidthPt * 0.352778}" />`
      );
    }
  }

  // 7. Закрывающий тег SVG
  svgParts.push(`</svg>`);

  return svgParts.join('\n');
}
