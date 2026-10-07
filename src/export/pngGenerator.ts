import { LayoutResult } from '../layout/layoutEngine';
import { CutMarksConfig, DEFAULT_CUT_MARKS_CONFIG, generateCutMarks } from '../pdf/cutMarks';
import { StickerShape } from '../state';
import { getRegistrationMarksPositions } from './svgCutGenerator';
import { t } from '../i18n';

export interface PngExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  layout: LayoutResult;
  imageElement?: HTMLImageElement | null;
  imageDataUrl?: string | null;
  cutMarks?: CutMarksConfig;
  bleedMm?: number;
  dpi?: number;
  stickerShape?: StickerShape;
  cornerRadiusMm?: number;
  registrationMarks?: boolean;
}

/**
 * Программная генерация растрового листа стикеров в формате PNG без потери качества (300 DPI).
 */
export async function generateStickerSheetPng(options: PngExportOptions): Promise<Blob> {
  const {
    pageWidthMm,
    pageHeightMm,
    layout,
    imageElement,
    imageDataUrl,
    cutMarks = DEFAULT_CUT_MARKS_CONFIG,
    bleedMm = 0,
    dpi = 300,
    stickerShape = 'rect',
    cornerRadiusMm = 3,
    registrationMarks = false,
  } = options;

  const dpmm = dpi / 25.4; // Пикселей на миллиметр при заданном DPI
  const canvasWidth = Math.max(10, Math.round(pageWidthMm * dpmm));
  const canvasHeight = Math.max(10, Math.round(pageHeightMm * dpmm));

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Не удалось инициализировать 2D-контекст Canvas для экспорта PNG.');
  }

  // 1. Белый фон листа (бумага)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Включаем высокое качество сглаживания при масштабировании растра
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 2. Подготовка изображения стикера (если загружено)
  let imgToDraw: CanvasImageSource | null = imageElement || null;
  if (!imgToDraw && imageDataUrl) {
    imgToDraw = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = imageDataUrl;
    });
  }

  // 3. Отрисовка каждого экземпляра наклейки
  for (const pos of layout.positions) {
    // Учитываем вылет под обрез (Bleed)
    const artXMm = pos.xMm - bleedMm;
    const artYMm = pos.yMm - bleedMm;
    const artWMm = pos.widthMm + bleedMm * 2;
    const artHMm = pos.heightMm + bleedMm * 2;

    const px = Math.round(artXMm * dpmm);
    const py = Math.round(artYMm * dpmm);
    const pw = Math.round(artWMm * dpmm);
    const ph = Math.round(artHMm * dpmm);

    if (imgToDraw) {
      if (stickerShape === 'circle') {
        ctx.save();
        ctx.beginPath();
        const radius = Math.min(pw, ph) / 2;
        ctx.arc(px + pw / 2, py + ph / 2, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgToDraw, px, py, pw, ph);
        ctx.restore();
      } else if (stickerShape === 'rounded') {
        ctx.save();
        ctx.beginPath();
        const rPx = Math.min(pw / 2, ph / 2, Math.max(0, (cornerRadiusMm + bleedMm) * dpmm));
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(px, py, pw, ph, rPx);
        } else {
          ctx.rect(px, py, pw, ph);
        }
        ctx.clip();
        ctx.drawImage(imgToDraw, px, py, pw, ph);
        ctx.restore();
      } else {
        ctx.drawImage(imgToDraw, px, py, pw, ph);
      }
    } else {
      // Отрисовка аккуратного плейсхолдера для пустого стикера
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1, Math.round(0.3 * dpmm));

      if (stickerShape === 'circle') {
        const radius = Math.min(pw, ph) / 2;
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + ph / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (stickerShape === 'rounded') {
        const rPx = Math.min(pw / 2, ph / 2, Math.max(0, (cornerRadiusMm + bleedMm) * dpmm));
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(px, py, pw, ph, rPx);
        } else {
          ctx.rect(px, py, pw, ph);
        }
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeRect(px, py, pw, ph);
      }

      // Номер стикера и размеры
      ctx.fillStyle = '#64748b';
      ctx.font = `600 ${Math.round(3.2 * dpmm)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = t('previewStickerPlaceholder', {
        idx: pos.index + 1,
        w: Math.round(pos.widthMm),
        h: Math.round(pos.heightMm),
      });
      ctx.fillText(label, px + pw / 2, py + ph / 2);
    }
  }

  // 4. Оптические метки совмещения плоттера (Registration Marks)
  if (registrationMarks) {
    const markPositions = getRegistrationMarksPositions(pageWidthMm, pageHeightMm, 8);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, Math.round(0.25 * (dpi / 25.4)));
    const armPx = Math.round(4 * dpmm);
    const targetRPx = Math.round(1.5 * dpmm);

    for (const mark of markPositions) {
      const cxPx = Math.round(mark.cx * dpmm);
      const cyPx = Math.round(mark.cy * dpmm);

      ctx.beginPath();
      ctx.moveTo(cxPx - armPx, cyPx);
      ctx.lineTo(cxPx + armPx, cyPx);
      ctx.moveTo(cxPx, cyPx - armPx);
      ctx.lineTo(cxPx, cyPx + armPx);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cxPx, cyPx, targetRPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tl = markPositions[0];
    ctx.fillStyle = '#000000';
    ctx.fillRect(
      Math.round((tl.cx - 1.5) * dpmm),
      Math.round((tl.cy - 1.5) * dpmm),
      Math.round(3 * dpmm),
      Math.round(3 * dpmm)
    );
  }

  // 5. Векторные метки реза (Cut marks)
  if (cutMarks.enabled && layout.positions.length > 0) {
    const lines = generateCutMarks(layout.positions, cutMarks);
    ctx.strokeStyle = '#1e293b';
    const markLineWidth = Math.max(1, Math.round(cutMarks.lineWidthPt * (dpi / 72)));
    ctx.lineWidth = markLineWidth;
    ctx.beginPath();
    for (const line of lines) {
      ctx.moveTo(Math.round(line.x1Mm * dpmm), Math.round(line.y1Mm * dpmm));
      ctx.lineTo(Math.round(line.x2Mm * dpmm), Math.round(line.y2Mm * dpmm));
    }
    ctx.stroke();
  }

  // 5. Преобразование холста в PNG Blob без потерь сжатия
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Не удалось создать PNG Blob из холста.'));
      }
    }, 'image/png');
  });
}

/**
 * Скачивание PNG Blob в браузере
 */
export function downloadPngBlob(blob: Blob, fileName: string = 'stickers-a4.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
