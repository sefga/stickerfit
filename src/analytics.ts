/**
 * StickerFit Analytics Module
 * Ультра-легковесный модуль продуктовой аналитики для Vercel Web Analytics и внешних систем.
 * 
 * Особенности:
 * - 0 Кб сторонних тяжелых библиотек
 * - 0 ms задержки UI потока (неблокирующая фоновая отправка)
 * - 0 cookies (полная конфиденциальность и отсутствие навязчивых баннеров)
 * - Безопасная очередь: если скрипт заблокирован AdBlock, ничего не падает и не ломается
 */

import { inject, track } from '@vercel/analytics';

declare global {
  interface Window {
    ym?: (...args: any[]) => void;
  }
}

/**
 * Инициализация Vercel Web Analytics
 */
export function initAnalytics(): void {
  try {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isVercel = hostname.endsWith('.vercel.app') || hostname === 'localhost' || hostname === '127.0.0.1';
      if (isVercel) {
        inject({
          mode: 'auto',
        });
      }
    }
  } catch {
    // Изолировано: аналитика не должна прерывать работу UI
  }
}

export type AnalyticsEvent =
  | {
      name: 'sticker_uploaded';
      data?: {
        format?: string;
        sizeBytes?: number;
      };
    }
  | {
      name: 'pdf_downloaded';
      data: {
        widthMm: number;
        heightMm: number;
        copies: number;
        bleedMm?: number;
        orientation?: string;
        paperFormat?: string;
        unit?: string;
        shape?: string;
        type?: string;
      };
    }
  | {
      name: 'print_initiated';
      data?: {
        copies: number;
      };
    }
  | {
      name: 'calibration_downloaded';
    };

/**
 * Отправка события в систему аналитики
 */
export function trackEvent(event: AnalyticsEvent): void {
  try {
    // 1. Отправка в Vercel Web Analytics через официальный SDK
    track(event.name, 'data' in event ? event.data : undefined);

    // 2. Отправка в Яндекс.Метрику (если в будущем подключен счетчик)
    if (typeof window !== 'undefined' && typeof window.ym === 'function') {
      (window as any).ym?.('reachGoal', event.name, 'data' in event ? event.data : undefined);
    }
  } catch {
    // Изолировано: аналитика никогда не должна прерывать работу UI
  }
}
