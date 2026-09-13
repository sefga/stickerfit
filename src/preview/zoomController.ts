/**
 * Интерактивный контроллер приближения (Zoom) и панорамирования (Pan) раскладки стикеров.
 * Поддерживает:
 * - ПК: колесико мыши (wheel zoom), зажатие и перетаскивание (drag pan), двойной клик (reset/zoom).
 * - Смартфоны: двухпальцевый жест Pinch-to-Zoom, однопальцевое перетаскивание при приближении, двойной тап.
 * - Кнопки управления: [+], [-], процент масштаба, [Сброс / Fit].
 */
export class ZoomController {
  private viewport: HTMLElement;
  private content: HTMLElement;
  private badgeEl: HTMLElement | null = null;

  public scale: number = 1.0;
  public panX: number = 0;
  public panY: number = 0;

  private minScale: number = 0.5;
  private maxScale: number = 4.0;

  private isDragging: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private initialPanX: number = 0;
  private initialPanY: number = 0;

  // Для pinch-to-zoom на мобильных
  private initialPinchDistance: number = 0;
  private initialPinchScale: number = 1.0;
  private lastTapTime: number = 0;

  constructor(viewport: HTMLElement, content: HTMLElement) {
    this.viewport = viewport;
    this.content = content;

    this.initEvents();
  }

  public setBadgeElement(badge: HTMLElement | null) {
    this.badgeEl = badge;
    this.updateBadge();
  }

  private updateTransform(animate: boolean = false) {
    this.content.style.transition = animate ? 'transform 0.18s cubic-bezier(0.2, 0.9, 0.4, 1)' : 'none';
    this.content.style.transformOrigin = 'center center';
    this.content.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;

    if (this.viewport) {
      if (this.scale > 1.05) {
        this.viewport.style.cursor = this.isDragging ? 'grabbing' : 'grab';
      } else {
        this.viewport.style.cursor = 'default';
      }
    }

    this.updateBadge();
  }

  private updateBadge() {
    if (this.badgeEl) {
      this.badgeEl.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  public zoomIn(delta: number = 0.25) {
    this.setScale(this.scale + delta, true);
  }

  public zoomOut(delta: number = 0.25) {
    this.setScale(this.scale - delta, true);
  }

  public resetZoom(animate: boolean = true) {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform(animate);
  }

  public setScale(newScale: number, animate: boolean = false) {
    const clamped = Math.min(this.maxScale, Math.max(this.minScale, newScale));
    this.scale = Math.round(clamped * 100) / 100;
    if (this.scale <= 1.02 && this.scale >= 0.98) {
      this.scale = 1.0;
      this.panX = 0;
      this.panY = 0;
    }
    this.updateTransform(animate);
  }

  private initEvents() {
    // 1. Десктоп: Масштабирование колесиком мыши (Wheel)
    this.viewport.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        // Если прокрутка над областью листа или зажат Ctrl / Cmd
        if (e.ctrlKey || e.metaKey || this.viewport.contains(e.target as Node)) {
          e.preventDefault();
          const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
          const targetScale = this.scale * zoomFactor;
          this.setScale(targetScale, false);
        }
      },
      { passive: false }
    );

    // 2. Десктоп: Перетаскивание зажатой мышью (Mouse Drag)
    this.viewport.addEventListener('mousedown', (e: MouseEvent) => {
      // Игнорируем клики по тулбару и интерактивным элементам
      if ((e.target as HTMLElement)?.closest?.('.zoom-toolbar')) return;
      if (e.button !== 0) return; // только левая кнопка

      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.initialPanX = this.panX;
      this.initialPanY = this.panY;
      this.updateTransform(false);
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.panX = this.initialPanX + dx;
      this.panY = this.initialPanY + dy;
      this.updateTransform(false);
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.updateTransform(false);
      }
    });

    // Двойной клик на десктопе: переключение между 100% и 175%
    this.viewport.addEventListener('dblclick', (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.zoom-toolbar')) return;
      if (this.scale > 1.05) {
        this.resetZoom(true);
      } else {
        this.setScale(1.75, true);
      }
    });

    // 3. Сенсорные экраны / Смартфоны (Touch Events)
    this.viewport.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if ((e.target as HTMLElement)?.closest?.('.zoom-toolbar')) return;

        if (e.touches.length === 2) {
          // Старт жеста Pinch двумя пальцами
          e.preventDefault();
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          this.initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          this.initialPinchScale = this.scale;
        } else if (e.touches.length === 1) {
          // Двойной тап для быстрого приближения/сброса
          const now = Date.now();
          if (now - this.lastTapTime < 300) {
            e.preventDefault();
            if (this.scale > 1.05) {
              this.resetZoom(true);
            } else {
              this.setScale(1.8, true);
            }
            this.lastTapTime = 0;
            return;
          }
          this.lastTapTime = now;

          // Однопальцевое перетаскивание (только если лист приближен)
          if (this.scale > 1.05) {
            this.isDragging = true;
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            this.initialPanX = this.panX;
            this.initialPanY = this.panY;
          }
        }
      },
      { passive: false }
    );

    this.viewport.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (e.touches.length === 2 && this.initialPinchDistance > 0) {
          e.preventDefault();
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          const ratio = currentDistance / this.initialPinchDistance;
          this.setScale(this.initialPinchScale * ratio, false);
        } else if (e.touches.length === 1 && this.isDragging && this.scale > 1.05) {
          e.preventDefault();
          const dx = e.touches[0].clientX - this.startX;
          const dy = e.touches[0].clientY - this.startY;
          this.panX = this.initialPanX + dx;
          this.panY = this.initialPanY + dy;
          this.updateTransform(false);
        }
      },
      { passive: false }
    );

    this.viewport.addEventListener('touchend', (e: TouchEvent) => {
      if (e.touches.length < 2) {
        this.initialPinchDistance = 0;
      }
      if (e.touches.length === 0) {
        this.isDragging = false;
      }
    });

    this.viewport.addEventListener('touchcancel', () => {
      this.isDragging = false;
      this.initialPinchDistance = 0;
    });
  }
}
