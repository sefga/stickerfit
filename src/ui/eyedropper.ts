import { normalizeHexColor } from '../layout/bleedGeometry';
import { t } from '../i18n';

export interface EyedropperPixelInfo {
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
  isTransparent: boolean;
}

/**
 * Извлечение цвета пикселя из Canvas по нормализованным координатам
 */
export function samplePixelFromCanvas(
  canvas: HTMLCanvasElement,
  pixelX: number,
  pixelY: number
): EyedropperPixelInfo {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const clampedX = Math.max(0, Math.min(canvas.width - 1, Math.floor(pixelX)));
  const clampedY = Math.max(0, Math.min(canvas.height - 1, Math.floor(pixelY)));

  if (!ctx) {
    return { r: 255, g: 255, b: 255, a: 255, hex: '#FFFFFF', isTransparent: false };
  }

  const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
  const r = pixel[0];
  const g = pixel[1];
  const b = pixel[2];
  const a = pixel[3];

  const hexR = r.toString(16).padStart(2, '0');
  const hexG = g.toString(16).padStart(2, '0');
  const hexB = b.toString(16).padStart(2, '0');
  const hex = normalizeHexColor(`#${hexR}${hexG}${hexB}`);

  // Пиксель считается прозрачным, если альфа-канал менее 25 (менее ~10% непрозрачности)
  const isTransparent = a < 25;

  return {
    r,
    g,
    b,
    a,
    hex,
    isTransparent,
  };
}

export interface EyedropperSessionOptions {
  sourceImage: HTMLImageElement | HTMLCanvasElement;
  initialColor?: string;
  onSelect: (hexColor: string) => void;
  onCancel?: () => void;
  onWarning?: (message: string) => void;
}

/**
 * Класс интерактивной пипетки с визуальной лупой 8x и перекрестием
 */
export class EyedropperModal {
  private overlay: HTMLElement | null = null;
  private offscreenCanvas: HTMLCanvasElement;
  private magnifierCanvas: HTMLCanvasElement | null = null;
  private previewColorBox: HTMLElement | null = null;
  private previewHexText: HTMLElement | null = null;
  private warningToast: HTMLElement | null = null;
  private options: EyedropperSessionOptions;
  private active = false;

  constructor(options: EyedropperSessionOptions) {
    this.options = options;
    this.offscreenCanvas = document.createElement('canvas');
    this.prepareOffscreenCanvas();
  }

  private prepareOffscreenCanvas() {
    const src = this.options.sourceImage;
    const w = 'naturalWidth' in src ? src.naturalWidth || src.width : src.width;
    const h = 'naturalHeight' in src ? src.naturalHeight || src.height : src.height;

    this.offscreenCanvas.width = Math.max(1, w);
    this.offscreenCanvas.height = Math.max(1, h);

    const ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }
  }

  public open(): void {
    if (this.active) return;
    this.active = true;

    // Создаем DOM оверлея
    this.overlay = document.createElement('div');
    this.overlay.className = 'eyedropper-modal-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', t('eyedropperModalTitle'));

    this.overlay.innerHTML = `
      <div class="eyedropper-modal-content">
        <div class="eyedropper-modal-header">
          <div class="eyedropper-modal-title">
            <span>🔍</span> ${t('eyedropperModalTitle')}
          </div>
          <button type="button" class="eyedropper-close-btn" aria-label="${t('btnCancel')}">&times;</button>
        </div>

        <div class="eyedropper-modal-instruction">
          ${t('eyedropperInstruction')}
        </div>

        <div class="eyedropper-viewport-wrapper">
          <canvas class="eyedropper-display-canvas"></canvas>
          <div class="eyedropper-magnifier" style="display: none;">
            <canvas class="eyedropper-loupe-canvas" width="112" height="112"></canvas>
            <div class="eyedropper-crosshair"></div>
            <div class="eyedropper-loupe-badge">
              <span class="eyedropper-loupe-color-sample"></span>
              <span class="eyedropper-loupe-hex">#FFFFFF</span>
            </div>
          </div>
        </div>

        <div class="eyedropper-toast" style="display: none;"></div>

        <div class="eyedropper-modal-actions">
          <div class="eyedropper-current-sample">
            <span class="eyedropper-sample-box" style="background-color: ${this.options.initialColor || '#FFFFFF'};"></span>
            <span class="eyedropper-sample-hex">${this.options.initialColor || '#FFFFFF'}</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm eyedropper-cancel-btn">${t('btnCancel')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    const displayCanvas = this.overlay.querySelector('.eyedropper-display-canvas') as HTMLCanvasElement;
    this.magnifierCanvas = this.overlay.querySelector('.eyedropper-loupe-canvas') as HTMLCanvasElement;
    this.previewColorBox = this.overlay.querySelector('.eyedropper-sample-box') as HTMLElement;
    this.previewHexText = this.overlay.querySelector('.eyedropper-sample-hex') as HTMLElement;
    this.warningToast = this.overlay.querySelector('.eyedropper-toast') as HTMLElement;

    const magnifier = this.overlay.querySelector('.eyedropper-magnifier') as HTMLElement;
    const loupeColorSample = this.overlay.querySelector('.eyedropper-loupe-color-sample') as HTMLElement;
    const loupeHex = this.overlay.querySelector('.eyedropper-loupe-hex') as HTMLElement;

    // Отрисовка изображения на интерактивном displayCanvas
    displayCanvas.width = this.offscreenCanvas.width;
    displayCanvas.height = this.offscreenCanvas.height;
    const dispCtx = displayCanvas.getContext('2d');
    if (dispCtx) {
      dispCtx.drawImage(this.offscreenCanvas, 0, 0);
    }

    const updateMagnifier = (clientX: number, clientY: number) => {
      const rect = displayCanvas.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
        magnifier.style.display = 'none';
        return;
      }

      magnifier.style.display = 'block';

      // Позиционируем лупу со смещением, чтобы не перекрывать курсор/палец
      const wrapperRect = displayCanvas.parentElement!.getBoundingClientRect();
      let loupeLeft = clientX - wrapperRect.left + 20;
      let loupeTop = clientY - wrapperRect.top - 130;

      if (loupeLeft + 120 > wrapperRect.width) {
        loupeLeft = clientX - wrapperRect.left - 140;
      }
      if (loupeTop < 0) {
        loupeTop = clientY - wrapperRect.top + 30;
      }

      magnifier.style.left = `${Math.max(0, loupeLeft)}px`;
      magnifier.style.top = `${Math.max(0, loupeTop)}px`;

      // Расчет координат в исходном растре
      const imgX = (relX / rect.width) * displayCanvas.width;
      const imgY = (relY / rect.height) * displayCanvas.height;
      const pixelInfo = samplePixelFromCanvas(this.offscreenCanvas, imgX, imgY);

      if (this.previewColorBox) {
        this.previewColorBox.style.backgroundColor = pixelInfo.hex;
      }
      if (this.previewHexText) {
        this.previewHexText.textContent = pixelInfo.hex;
      }
      if (loupeColorSample) {
        loupeColorSample.style.backgroundColor = pixelInfo.hex;
      }
      if (loupeHex) {
        loupeHex.textContent = pixelInfo.hex;
      }

      // Отрисовка увеличенного фрагмента 14x14 пикселей в лупу (масштаб 8x)
      if (this.magnifierCanvas) {
        const mCtx = this.magnifierCanvas.getContext('2d');
        if (mCtx) {
          mCtx.imageSmoothingEnabled = false;
          mCtx.clearRect(0, 0, 112, 112);
          const sampleSize = 14;
          const sx = Math.max(0, Math.min(this.offscreenCanvas.width - sampleSize, imgX - sampleSize / 2));
          const sy = Math.max(0, Math.min(this.offscreenCanvas.height - sampleSize, imgY - sampleSize / 2));
          mCtx.drawImage(this.offscreenCanvas, sx, sy, sampleSize, sampleSize, 0, 0, 112, 112);
        }
      }
    };

    const handlePointerAction = (clientX: number, clientY: number) => {
      const rect = displayCanvas.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
        return;
      }

      const imgX = (relX / rect.width) * displayCanvas.width;
      const imgY = (relY / rect.height) * displayCanvas.height;
      const pixelInfo = samplePixelFromCanvas(this.offscreenCanvas, imgX, imgY);

      if (pixelInfo.isTransparent) {
        this.showToast(t('eyedropperTransparentWarning'));
        if (this.options.onWarning) {
          this.options.onWarning(t('eyedropperTransparentWarning'));
        }
        return;
      }

      // Успешный выбор непрозрачного цвета
      this.options.onSelect(pixelInfo.hex);
      this.close();
    };

    // Слушатели мыши
    displayCanvas.addEventListener('mousemove', (e) => {
      updateMagnifier(e.clientX, e.clientY);
    });

    displayCanvas.addEventListener('mouseleave', () => {
      magnifier.style.display = 'none';
    });

    displayCanvas.addEventListener('click', (e) => {
      handlePointerAction(e.clientX, e.clientY);
    });

    // Слушатели сенсорного ввода (Touch)
    displayCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateMagnifier(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    displayCanvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateMagnifier(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    displayCanvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        handlePointerAction(touch.clientX, touch.clientY);
      }
    });

    // Кнопки отмены и закрытия
    const closeBtn = this.overlay.querySelector('.eyedropper-close-btn');
    const cancelBtn = this.overlay.querySelector('.eyedropper-cancel-btn');

    closeBtn?.addEventListener('click', () => this.cancel());
    cancelBtn?.addEventListener('click', () => this.cancel());

    // Клик по оверлею вне контента закрывает модалку с отменой
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.cancel();
      }
    });

    // Закрытие по Escape
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.active) {
        window.removeEventListener('keydown', keyHandler);
        this.cancel();
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  private showToast(message: string) {
    if (!this.warningToast) return;
    this.warningToast.textContent = message;
    this.warningToast.style.display = 'block';
    setTimeout(() => {
      if (this.warningToast) {
        this.warningToast.style.display = 'none';
      }
    }, 3000);
  }

  public cancel(): void {
    if (this.options.onCancel) {
      this.options.onCancel();
    }
    this.close();
  }

  public close(): void {
    if (!this.active) return;
    this.active = false;
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.overlay = null;
  }
}
