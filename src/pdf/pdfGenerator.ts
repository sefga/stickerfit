import { PDFDocument, rgb } from 'pdf-lib';
import { mmToPoints } from '../units/mm';
import { LayoutResult } from '../layout/layoutEngine';
import { CutMarksConfig, DEFAULT_CUT_MARKS_CONFIG, drawCutMarksOnPdf, generateCutMarks } from './cutMarks';
import { StickerShape } from '../state';
import { getRegistrationMarksPositions } from '../export/svgCutGenerator';
import { getBleedOuterSvgPath, hexToRgb01, normalizeHexColor } from '../layout/bleedGeometry';

export interface PdfExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  layout: LayoutResult;
  imageBytes?: Uint8Array;
  imageMimeType?: string;
  cutMarks?: CutMarksConfig;
  bleedMm?: number; // 0, 1, 2, 3 мм
  bleedColor?: string;
  stickerShape?: StickerShape;
  cornerRadiusMm?: number;
  registrationMarks?: boolean;
}

/**
 * Преобразование растрового изображения стикера в маскированный PNG с альфа-каналом по форме (круг/скругление).
 * Маскирование выполняется строго по контуру реза готовой наклейки (без растяжения на вылет).
 */
async function createMaskedStickerPng(
  imageBytes: Uint8Array,
  imageMimeType: string | undefined,
  shape: StickerShape,
  cornerRadiusMm: number,
  stickerWidthMm: number,
  stickerHeightMm: number
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return { bytes: imageBytes, mimeType: imageMimeType || 'image/png' };
  }

  return new Promise((resolve) => {
    try {
      const blob = new Blob([imageBytes as any], { type: imageMimeType || 'image/png' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        const naturalW = img.naturalWidth || 500;
        const naturalH = img.naturalHeight || 500;

        const canvasW = naturalW;
        const canvasH = naturalH;

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          resolve({ bytes: imageBytes, mimeType: imageMimeType || 'image/png' });
          return;
        }

        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.save();

        if (shape === 'circle') {
          ctx.beginPath();
          const radius = Math.min(canvasW, canvasH) / 2;
          ctx.arc(canvasW / 2, canvasH / 2, radius, 0, Math.PI * 2);
          ctx.clip();
        } else if (shape === 'rounded') {
          ctx.beginPath();
          const maxR = Math.min(stickerWidthMm / 2, stickerHeightMm / 2);
          const clampedR = Math.min(Math.max(0, cornerRadiusMm), maxR);
          const rPx = Math.min(canvasW / 2, canvasH / 2, Math.max(0, clampedR * (canvasW / stickerWidthMm)));
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(0, 0, canvasW, canvasH, rPx);
          } else {
            ctx.rect(0, 0, canvasW, canvasH);
          }
          ctx.clip();
        }

        ctx.drawImage(img, 0, 0, canvasW, canvasH);
        ctx.restore();

        canvas.toBlob(async (pngBlob) => {
          if (!pngBlob) {
            resolve({ bytes: imageBytes, mimeType: imageMimeType || 'image/png' });
            return;
          }
          const arrayBuf = await pngBlob.arrayBuffer();
          resolve({ bytes: new Uint8Array(arrayBuf), mimeType: 'image/png' });
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ bytes: imageBytes, mimeType: imageMimeType || 'image/png' });
      };

      img.src = url;
    } catch {
      resolve({ bytes: imageBytes, mimeType: imageMimeType || 'image/png' });
    }
  });
}

/**
 * Программная генерация PDF с точными физическими размерами в миллиметрах (1:1 MediaBox).
 */
export async function generateStickerSheetPdf(options: PdfExportOptions): Promise<Uint8Array> {
  const {
    pageWidthMm,
    pageHeightMm,
    layout,
    imageBytes,
    imageMimeType,
    cutMarks = DEFAULT_CUT_MARKS_CONFIG,
    bleedMm = 0,
    bleedColor = '#FFFFFF',
    stickerShape = 'rect',
    cornerRadiusMm = 3,
    registrationMarks = false,
  } = options;

  const pdfDoc = await PDFDocument.create();

  // Физический размер страницы в типографских пунктах (pt = mm * 72 / 25.4)
  const pageWidthPt = mmToPoints(pageWidthMm);
  const pageHeightPt = mmToPoints(pageHeightMm);

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // Если передано изображение, декодируем и встраиваем его в PDF ровно ОДИН раз
  let embeddedImage: any = null;
  if (imageBytes && imageBytes.length > 0) {
    let finalBytes = imageBytes;
    let finalMime = imageMimeType;

    if (stickerShape === 'circle' || stickerShape === 'rounded') {
      const firstPos = layout.positions[0] || { widthMm: 50, heightMm: 50 };
      const masked = await createMaskedStickerPng(
        imageBytes,
        imageMimeType,
        stickerShape,
        cornerRadiusMm,
        firstPos.widthMm,
        firstPos.heightMm
      );
      finalBytes = masked.bytes;
      finalMime = masked.mimeType;
    }

    const isJpeg = finalMime?.includes('jpeg') || finalMime?.includes('jpg');
    if (isJpeg) {
      embeddedImage = await pdfDoc.embedJpg(finalBytes);
    } else {
      embeddedImage = await pdfDoc.embedPng(finalBytes);
    }
  }

  const rgbColor = hexToRgb01(normalizeHexColor(bleedColor));
  const pdfBleedColor = rgb(rgbColor.r, rgbColor.g, rgbColor.b);
  const ptPerMm = 72 / 25.4;

  // Отрисовка каждого стикера из рассчитанной сетки layoutEngine
  for (const pos of layout.positions) {
    // FR-005, FR-008: Отрисовка внешнего цветного вылета под обрез (если bleedMm > 0, монолитная подложка)
    if (bleedMm > 0) {
      const clampedRadius = Math.max(0, Math.min(cornerRadiusMm, Math.min(pos.widthMm, pos.heightMm) / 2));
      const bleedPath = getBleedOuterSvgPath({
        xMm: pos.xMm,
        yMm: pos.yMm,
        widthMm: pos.widthMm,
        heightMm: pos.heightMm,
        bleedMm,
        shape: stickerShape,
        cornerRadiusMm: clampedRadius,
      });

      if (bleedPath) {
        page.drawSvgPath(bleedPath, {
          x: 0,
          y: pageHeightPt,
          scale: ptPerMm,
          color: pdfBleedColor,
        });
      }
    }

    // FR-001, FR-004: Изображение наклейки выводится строго по контуру реза 1:1 без растяжения
    const xPt = mmToPoints(pos.xMm);
    const yPt = pageHeightPt - mmToPoints(pos.yMm + pos.heightMm);
    const wPt = mmToPoints(pos.widthMm);
    const hPt = mmToPoints(pos.heightMm);

    if (embeddedImage) {
      page.drawImage(embeddedImage, {
        x: xPt,
        y: yPt,
        width: wPt,
        height: hPt,
      });
    }
  }

  // Векторные метки реза (рисуются поверх изображений строго по Trim Box)
  if (cutMarks.enabled && layout.positions.length > 0) {
    const lines = generateCutMarks(layout.positions, cutMarks);
    drawCutMarksOnPdf(page, lines, pageHeightPt, cutMarks.lineWidthPt);
  }

  // Оптические метки совмещения плоттера (Registration Marks)
  if (registrationMarks) {
    const markPositions = getRegistrationMarksPositions(pageWidthMm, pageHeightMm, 8);
    const armPt = mmToPoints(4);
    const targetRPt = mmToPoints(1.5);
    const strokeBlack = rgb(0, 0, 0);

    for (const mark of markPositions) {
      const cxPt = mmToPoints(mark.cx);
      const cyPt = pageHeightPt - mmToPoints(mark.cy);

      // Горизонтальная линия
      page.drawLine({
        start: { x: cxPt - armPt, y: cyPt },
        end: { x: cxPt + armPt, y: cyPt },
        thickness: 0.5,
        color: strokeBlack,
      });

      // Вертикальная линия
      page.drawLine({
        start: { x: cxPt, y: cyPt - armPt },
        end: { x: cxPt, y: cyPt + armPt },
        thickness: 0.5,
        color: strokeBlack,
      });

      // Прицельный круг
      page.drawCircle({
        x: cxPt,
        y: cyPt,
        size: targetRPt,
        borderWidth: 0.5,
        borderColor: strokeBlack,
      });
    }

    // Маркер ориентации верха страницы (квадрат 3х3 мм в верхнем левом углу)
    const tl = markPositions[0];
    const tlCxPt = mmToPoints(tl.cx);
    const tlCyPt = pageHeightPt - mmToPoints(tl.cy);
    const sqHalfPt = mmToPoints(1.5);
    page.drawRectangle({
      x: tlCxPt - sqHalfPt,
      y: tlCyPt - sqHalfPt,
      width: sqHalfPt * 2,
      height: sqHalfPt * 2,
      color: strokeBlack,
    });
  }

  return await pdfDoc.save();
}

/**
 * Вспомогательная функция для скачивания PDF в браузере
 */
export function downloadPdfBlob(pdfBytes: Uint8Array, fileName: string = 'stickers-a4.pdf') {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Вспомогательная функция для открытия PDF в отдельной вкладке / вызова печати
 */
export function openPdfForPrint(pdfBytes: Uint8Array) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.focus();
  }
}
