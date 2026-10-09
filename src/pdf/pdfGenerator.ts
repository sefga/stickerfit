import {
  PDFDocument, rgb,
} from 'pdf-lib';
import { mmToPoints } from '../units/mm';
import { LayoutResult } from '../layout/layoutEngine';
import { CutMarksConfig, DEFAULT_CUT_MARKS_CONFIG, drawCutMarksOnPdf, generateCutMarks } from './cutMarks';
import { StickerShape } from '../state';
import { getRegistrationMarksPositions } from '../export/svgCutGenerator';
import { getBleedOuterSvgPath, getStickerContourSvgPath, normalizeHexColor } from '../layout/bleedGeometry';

export interface PdfExportOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  layout: LayoutResult;
  imageBytes?: Uint8Array;
  imageMimeType?: string;
  edgeFillPath?: string;
  cutMarks?: CutMarksConfig;
  bleedMm?: number; // 0, 1, 2, 3 мм
  bleedColor?: string;
  stickerShape?: StickerShape;
  cornerRadiusMm?: number;
  registrationMarks?: boolean;
  includeCutContour?: boolean;
}

/**
 * Преобразование растрового изображения стикера в маскированный PNG с запеченным вылетом (Bleed).
 * При bleedMm > 0 вылет и краевой фон рисуются прямо на Canvas. В PDF не выводятся векторные пути вылета,
 * что гарантирует отсутствие лишних линий реза в плоттерных программах (Easy Cut Studio).
 */
async function createMaskedStickerPng(
  imageBytes: Uint8Array,
  imageMimeType: string | undefined,
  shape: StickerShape,
  cornerRadiusMm: number,
  stickerWidthMm: number,
  stickerHeightMm: number,
  bleedMm: number = 0,
  bleedColor: string = '#FFFFFF',
  edgeFillPath?: string
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

        const scaleX = naturalW / stickerWidthMm;
        const scaleY = naturalH / stickerHeightMm;

        let canvasW = naturalW;
        let canvasH = naturalH;
        let offsetX = 0;
        let offsetY = 0;

        if (bleedMm > 0) {
          const bleedPxX = Math.round(bleedMm * scaleX);
          const bleedPxY = Math.round(bleedMm * scaleY);
          canvasW = naturalW + 2 * bleedPxX;
          canvasH = naturalH + 2 * bleedPxY;
          offsetX = bleedPxX;
          offsetY = bleedPxY;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          resolve({ bytes: imageBytes, mimeType: imageMimeType || 'image/png' });
          return;
        }

        ctx.clearRect(0, 0, canvasW, canvasH);

        // 1. Отрисовка фонового вылета цветом bleedColor
        if (bleedMm > 0) {
          const colorHex = normalizeHexColor(bleedColor);
          ctx.fillStyle = colorHex;
          ctx.beginPath();

          if (shape === 'circle') {
            const radius = Math.min(canvasW, canvasH) / 2;
            ctx.arc(canvasW / 2, canvasH / 2, radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (shape === 'rounded') {
            const maxR = Math.min(stickerWidthMm / 2, stickerHeightMm / 2);
            const clampedR = Math.min(Math.max(0, cornerRadiusMm), maxR);
            const rPx = Math.min(canvasW / 2, canvasH / 2, (clampedR + bleedMm) * scaleX);
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(0, 0, canvasW, canvasH, rPx);
            } else {
              ctx.rect(0, 0, canvasW, canvasH);
            }
            ctx.fill();
          } else {
            // shape === 'rect'
            ctx.fillRect(0, 0, canvasW, canvasH);
          }
        }

        // 2. Отрисовка изображения наклейки по центру со скруглением/маскированием 1:1
        ctx.save();
        ctx.beginPath();
        if (shape === 'circle') {
          const radius = Math.min(naturalW, naturalH) / 2;
          ctx.arc(offsetX + naturalW / 2, offsetY + naturalH / 2, radius, 0, Math.PI * 2);
          ctx.clip();
        } else if (shape === 'rounded') {
          const maxR = Math.min(stickerWidthMm / 2, stickerHeightMm / 2);
          const clampedR = Math.min(Math.max(0, cornerRadiusMm), maxR);
          const rPx = Math.min(naturalW / 2, naturalH / 2, clampedR * scaleX);
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(offsetX, offsetY, naturalW, naturalH, rPx);
          } else {
            ctx.rect(offsetX, offsetY, naturalW, naturalH);
          }
          ctx.clip();
        } else if (bleedMm > 0) {
          ctx.rect(offsetX, offsetY, naturalW, naturalH);
          ctx.clip();
        }

        ctx.drawImage(img, offsetX, offsetY, naturalW, naturalH);
        ctx.restore();

        // 3. Краевой фон (edgeFillPath), если включена очистка каймы
        if (bleedMm > 0 && edgeFillPath && typeof Path2D !== 'undefined') {
          ctx.save();
          ctx.translate(offsetX, offsetY);
          ctx.scale(scaleX, scaleY);
          const clampedRadius = Math.max(0, Math.min(cornerRadiusMm, Math.min(stickerWidthMm, stickerHeightMm) / 2));
          const outerPath = getBleedOuterSvgPath({
            xMm: 0,
            yMm: 0,
            widthMm: stickerWidthMm,
            heightMm: stickerHeightMm,
            bleedMm,
            shape,
            cornerRadiusMm: clampedRadius,
          });
          ctx.clip(new Path2D(outerPath));
          ctx.fillStyle = normalizeHexColor(bleedColor);
          ctx.fill(new Path2D(edgeFillPath));
          ctx.restore();
        }

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
    edgeFillPath,
    cutMarks = DEFAULT_CUT_MARKS_CONFIG,
    bleedMm = 0,
    bleedColor = '#FFFFFF',
    stickerShape = 'rect',
    cornerRadiusMm = 3,
    registrationMarks = false,
    includeCutContour = true,
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

    if (bleedMm > 0 || stickerShape === 'circle' || stickerShape === 'rounded') {
      const firstPos = layout.positions[0] || { widthMm: 50, heightMm: 50 };
      const masked = await createMaskedStickerPng(
        imageBytes,
        imageMimeType,
        stickerShape,
        cornerRadiusMm,
        firstPos.widthMm,
        firstPos.heightMm,
        bleedMm,
        bleedColor,
        edgeFillPath
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

  const ptPerMm = 72 / 25.4;

  // Отрисовка каждого стикера из рассчитанной сетки layoutEngine
  for (const pos of layout.positions) {
    // 1. Векторный контур реза 1:1 строго по форме готовой наклейки (CutContour для Easy Cut Studio / плоттеров)
    // Рисуется ПОД растровым изображением (underlay z-order), чтобы принтер печатал чистое изображение с вылетом без видимой красной линии
    if (includeCutContour) {
      const clampedRadius = Math.max(0, Math.min(cornerRadiusMm, Math.min(pos.widthMm, pos.heightMm) / 2));
      const contourPath = getStickerContourSvgPath({
        xMm: pos.xMm,
        yMm: pos.yMm,
        widthMm: pos.widthMm,
        heightMm: pos.heightMm,
        shape: stickerShape,
        cornerRadiusMm: clampedRadius,
      });

      page.drawSvgPath(contourPath, {
        x: 0,
        y: pageHeightPt,
        scale: ptPerMm,
        borderColor: rgb(1, 0, 0),
        borderWidth: mmToPoints(0.1),
      });
    }

    // 2. Отрисовка растрового изображения (с запеченным вылетом или без) поверх векторного контура реза
    if (embeddedImage) {
      const xMm = bleedMm > 0 ? pos.xMm - bleedMm : pos.xMm;
      const yMm = bleedMm > 0 ? pos.yMm - bleedMm : pos.yMm;
      const wMm = bleedMm > 0 ? pos.widthMm + 2 * bleedMm : pos.widthMm;
      const hMm = bleedMm > 0 ? pos.heightMm + 2 * bleedMm : pos.heightMm;

      const xPt = mmToPoints(xMm);
      const yPt = pageHeightPt - mmToPoints(yMm + hMm);
      const wPt = mmToPoints(wMm);
      const hPt = mmToPoints(hMm);

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
