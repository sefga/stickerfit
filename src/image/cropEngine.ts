import { createEdgeFillPath, EdgeFillGeometry } from './edgeBackground';

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}

export type SizingMode = 'fill' | 'fit';

export interface CroppedResult {
  dataUrl: string;
  bytes: Uint8Array;
  mimeType: string;
  pixelWidth: number;
  pixelHeight: number;
  /** Маска светлой каймы в координатах готовой наклейки (мм). */
  edgeFillPath?: string;
}

/**
 * Нормализация координат кадрирования под целевое соотношение сторон стикера.
 * Если сохраненное кадрирование не совпадает с новым aspect ratio, область
 * пропорционально адаптируется от центра, предотвращая сплющивание исходного изображения.
 */
export function normalizeCropRect(
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  targetAspectRatio: number
): { x: number; y: number; width: number; height: number } {
  if (targetAspectRatio <= 0 || cropW <= 0 || cropH <= 0) {
    return { x: cropX, y: cropY, width: Math.max(1, cropW), height: Math.max(1, cropH) };
  }

  const currentRatio = cropW / cropH;
  // Допускаем погрешность до 1% для исключения микро-округлений
  if (Math.abs(currentRatio - targetAspectRatio) / targetAspectRatio <= 0.01) {
    return { x: cropX, y: cropY, width: cropW, height: cropH };
  }

  if (currentRatio > targetAspectRatio) {
    // Область шире целевой -> уменьшаем ширину от центра
    const targetW = Math.max(1, Math.round(cropH * targetAspectRatio));
    const newX = Math.max(0, Math.round(cropX + (cropW - targetW) / 2));
    return { x: newX, y: cropY, width: targetW, height: cropH };
  } else {
    // Область выше целевой -> уменьшаем высоту от центра
    const targetH = Math.max(1, Math.round(cropW / targetAspectRatio));
    const newY = Math.max(0, Math.round(cropY + (cropH - targetH) / 2));
    return { x: cropX, y: newY, width: cropW, height: targetH };
  }
}

/**
 * Отрисовка и нарезка изображения в максимальном исходном разрешении
 * с учетом координат Cropper.js и режима размещения (Fill / Fit)
 */
export async function renderCroppedArtwork(
  sourceImage: HTMLImageElement,
  cropData: CropData | null,
  sizingMode: SizingMode,
  aspectRatio: number, // targetWidth / targetHeight
  originalMimeType: string,
  sheetRotation: 0 | 90 = 0,
  edgeFillGeometry?: EdgeFillGeometry
): Promise<CroppedResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Не удалось инициализировать 2D-контекст Canvas.');
  }

  const srcW = sourceImage.naturalWidth;
  const srcH = sourceImage.naturalHeight;

  // Если cropData не задан, используем дефолтное заполнение по соотношению сторон
  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;
  let rotate = 0;

  if (cropData) {
    let normalized = {
      x: Math.round(cropData.x),
      y: Math.round(cropData.y),
      width: Math.round(cropData.width),
      height: Math.round(cropData.height),
    };

    if (sizingMode === 'fill' && aspectRatio > 0) {
      normalized = normalizeCropRect(normalized.x, normalized.y, normalized.width, normalized.height, aspectRatio);
    }

    cropX = normalized.x;
    cropY = normalized.y;
    cropW = normalized.width;
    cropH = normalized.height;
    rotate = cropData.rotate || 0;
  } else {
    // Автоматический crop по центру с нужным aspect ratio
    if (sizingMode === 'fill' && aspectRatio > 0) {
      const srcRatio = srcW / srcH;
      if (srcRatio > aspectRatio) {
        // Исходник шире -> обрезаем по бокам
        cropH = srcH;
        cropW = Math.round(srcH * aspectRatio);
        cropX = Math.round((srcW - cropW) / 2);
        cropY = 0;
      } else {
        // Исходник выше -> обрезаем сверху/снизу
        cropW = srcW;
        cropH = Math.round(srcW / aspectRatio);
        cropX = 0;
        cropY = Math.round((srcH - cropH) / 2);
      }
    }
  }

  // Защита от нулевых или отрицательных размеров
  cropW = Math.max(1, cropW);
  cropH = Math.max(1, cropH);

  if (sizingMode === 'fit' && aspectRatio > 0) {
    // В режиме Fit всё кадрированное изображение помещается внутри холста с целевым соотношением сторон
    let outW: number;
    let outH: number;
    const currentCropRatio = cropW / cropH;

    if (currentCropRatio > aspectRatio) {
      outW = cropW;
      outH = Math.round(cropW / aspectRatio);
    } else {
      outH = cropH;
      outW = Math.round(cropH * aspectRatio);
    }

    canvas.width = outW;
    canvas.height = outH;

    ctx.clearRect(0, 0, outW, outH);

    // Центрируем внутри выходного холста
    const destX = Math.round((outW - cropW) / 2);
    const destY = Math.round((outH - cropH) / 2);

    drawRotatedImage(ctx, sourceImage, cropX, cropY, cropW, cropH, destX, destY, cropW, cropH, rotate);

    const finalCanvas = sheetRotation === 90 ? applySheetRotation(canvas) : canvas;
    const edgeFillPath = edgeFillGeometry ? getCanvasEdgeFillPath(finalCanvas, edgeFillGeometry) : undefined;
    const mimeType = 'image/png'; // PNG для сохранения прозрачных полей Fit
    const blob = await canvasToBlob(finalCanvas, mimeType);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    let dataUrl: string;
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        dataUrl = URL.createObjectURL(blob);
      } catch {
        dataUrl = finalCanvas.toDataURL(mimeType);
      }
    } else {
      dataUrl = finalCanvas.toDataURL(mimeType);
    }

    return {
      dataUrl,
      bytes,
      mimeType,
      pixelWidth: finalCanvas.width,
      pixelHeight: finalCanvas.height,
      edgeFillPath,
    };
  } else {
    // Режим Crop / Fill: холст равен точно размеру кадрированной области
    canvas.width = cropW;
    canvas.height = cropH;
    ctx.clearRect(0, 0, cropW, cropH);

    drawRotatedImage(ctx, sourceImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH, rotate);

    const finalCanvas = sheetRotation === 90 ? applySheetRotation(canvas) : canvas;
    const edgeFillPath = edgeFillGeometry ? getCanvasEdgeFillPath(finalCanvas, edgeFillGeometry) : undefined;

    // Сохраняем исходный формат или PNG
    const mimeType = !edgeFillPath && (originalMimeType.includes('jpeg') || originalMimeType.includes('jpg'))
      ? 'image/jpeg'
      : 'image/png';

    const quality = mimeType === 'image/jpeg' ? 0.98 : undefined;
    const blob = await canvasToBlob(finalCanvas, mimeType, quality);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    let dataUrl: string;
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        dataUrl = URL.createObjectURL(blob);
      } catch {
        dataUrl = finalCanvas.toDataURL(mimeType, quality);
      }
    } else {
      dataUrl = finalCanvas.toDataURL(mimeType, quality);
    }

    return {
      dataUrl,
      bytes,
      mimeType,
      pixelWidth: finalCanvas.width,
      pixelHeight: finalCanvas.height,
      edgeFillPath,
    };
  }
}

/** Строит независимую от цвета маску один раз после кадрирования и поворота. */
function getCanvasEdgeFillPath(canvas: HTMLCanvasElement, geometry: EdgeFillGeometry): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось прочитать изображение для исправления светлой каймы.');
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return createEdgeFillPath(pixels.data, canvas.width, canvas.height, geometry);
}

/**
 * Вспомогательная функция поворота холста на 90° по часовой стрелке
 */
function applySheetRotation(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = sourceCanvas.height;
  rotCanvas.height = sourceCanvas.width;
  const rotCtx = rotCanvas.getContext('2d');
  if (rotCtx) {
    rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    rotCtx.rotate((90 * Math.PI) / 180);
    rotCtx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  }
  return rotCanvas;
}

/**
 * Отрисовка с возможным поворотом вокруг центра
 */
function drawRotatedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  rotate: number
) {
  if (rotate === 0) {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }

  ctx.save();
  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

/**
 * Преобразование HTMLCanvasElement в Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          try {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mimeType }));
          } catch {
            reject(new Error('Не удалось сформировать Blob из Canvas.'));
          }
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * Преобразование HTMLCanvasElement в Uint8Array без лишних конверсий
 */
export async function canvasToUint8Array(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}
