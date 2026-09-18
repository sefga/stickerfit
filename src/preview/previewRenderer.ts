import { LayoutResult } from '../layout/layoutEngine';
import { CutMarksConfig, generateCutMarks } from '../pdf/cutMarks';
import { Margins } from '../layout/layoutEngine';
import { SizingMode } from '../image/cropEngine';
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

  // Определение стилей, фильтров и переиспользуемых элементов
  let imageDef = '';
  if (imageUrl) {
    imageDef = `
      <g id="stickerArtSource">
        <image href="${imageUrl}" x="0" y="0" width="${stickerW}" height="${stickerH}" preserveAspectRatio="${par}" />
        <rect x="0" y="0" width="${stickerW}" height="${stickerH}" fill="none" stroke="#3b82f6" stroke-width="0.15" opacity="0.6" />
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

  // 4. Отрисовка каждого стикера через легковесные ссылки <use> (мгновенный рендер без лагов DOM)
  const maxRenderPositions = 300;
  const visiblePositions = layout.positions.slice(0, maxRenderPositions);

  visiblePositions.forEach((pos, idx) => {
    const { xMm, yMm, widthMm, heightMm } = pos;

    // Зона Bleed (если включен)
    if (bleedMm > 0) {
      const bX = xMm - bleedMm;
      const bY = yMm - bleedMm;
      const bW = widthMm + bleedMm * 2;
      const bH = heightMm + bleedMm * 2;
      svgParts.push(
        `<rect x="${bX}" y="${bY}" width="${bW}" height="${bH}" ` +
        `fill="#fef3c7" fill-opacity="0.6" stroke="#f59e0b" stroke-width="0.15" stroke-dasharray="0.8,0.8" />`
      );
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
      svgParts.push(
        `<g${shadowAttr}>` +
        `<rect x="${xMm}" y="${yMm}" width="${widthMm}" height="${heightMm}" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.3" rx="0.5" />` +
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

  // 5. Векторные метки реза (Cut marks)
  if (cutMarksConfig.enabled && layout.positions.length > 0) {
    const marks = generateCutMarks(layout.positions, cutMarksConfig);
    for (const mark of marks) {
      svgParts.push(
        `<line x1="${mark.x1Mm}" y1="${mark.y1Mm}" x2="${mark.x2Mm}" y2="${mark.y2Mm}" ` +
        `stroke="#1e293b" stroke-width="${cutMarksConfig.lineWidthPt * 0.352778}" />`
      );
    }
  }

  // 6. Закрывающий тег SVG
  svgParts.push(`</svg>`);

  return svgParts.join('\n');
}
