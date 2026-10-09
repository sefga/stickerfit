import { describe, it, expect, vi } from 'vitest';
import { generateStickerSheetPng } from './pngGenerator';
import { calculateLayout } from '../layout/layoutEngine';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../units/mm';

describe('PNG Export Generator (300 DPI Lossless)', () => {
  it('Рассчитывает типографские размеры холста 300 DPI (2480 × 3508 px для A4) и корректно отрисовывает стикеры', async () => {
    const layout = calculateLayout({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      gapX: 2,
      gapY: 2,
      allowRotation: false,
    });

    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 1,
      strokeStyle: '',
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((cb: (blob: Blob) => void) => {
        const dummyBlob = new Blob(['png-bytes'], { type: 'image/png' });
        cb(dummyBlob);
      }),
    };

    // Мокаем document.createElement('canvas')
    const originalDocument = globalThis.document;
    globalThis.document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return originalDocument?.createElement?.(tag);
      }),
    } as any;

    try {
      const blob = await generateStickerSheetPng({
        pageWidthMm: A4_WIDTH_MM,
        pageHeightMm: A4_HEIGHT_MM,
        layout,
        cutMarks: { enabled: true, lengthMm: 3, offsetMm: 1, lineWidthPt: 0.2 },
        dpi: 300,
      });

      expect(blob).toBeDefined();
      expect(blob.type).toBe('image/png');

      // Проверяем типографские размеры A4 при 300 DPI
      expect(mockCanvas.width).toBe(2480);
      expect(mockCanvas.height).toBe(3508);

      // Фон листа залит белым цветом
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 2480, 3508);

      // Отрисованы плейсхолдеры для всех позиций стикеров
      expect(mockCtx.strokeRect).toHaveBeenCalledTimes(layout.positions.length);

      // Метки реза отрисованы через stroke
      expect(mockCtx.stroke).toHaveBeenCalled();
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('Корректно рассчитывает габариты холста для 150 DPI (черновик) и 600 DPI (Ultra HD)', async () => {
    const layout = calculateLayout({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      gapX: 2,
      gapY: 2,
      allowRotation: false,
    });

    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 1,
      strokeStyle: '',
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((cb: (blob: Blob) => void) => {
        cb(new Blob(['png-bytes'], { type: 'image/png' }));
      }),
    };

    const originalDocument = globalThis.document;
    globalThis.document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return originalDocument?.createElement?.(tag);
      }),
    } as any;

    try {
      // 150 DPI
      await generateStickerSheetPng({
        pageWidthMm: A4_WIDTH_MM,
        pageHeightMm: A4_HEIGHT_MM,
        layout,
        dpi: 150,
      });
      expect(mockCanvas.width).toBe(1240);
      expect(mockCanvas.height).toBe(1754);

      // 600 DPI
      await generateStickerSheetPng({
        pageWidthMm: A4_WIDTH_MM,
        pageHeightMm: A4_HEIGHT_MM,
        layout,
        dpi: 600,
      });
      expect(mockCanvas.width).toBe(4961);
      expect(mockCanvas.height).toBe(7016);
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('Корректно отрисовывает цветной вылет под обрез (bleedMm > 0, bleedColor)', async () => {
    const layout = calculateLayout({
      pageWidthMm: A4_WIDTH_MM,
      pageHeightMm: A4_HEIGHT_MM,
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      margins: { top: 5, bottom: 5, left: 5, right: 5 },
      gapX: 2,
      gapY: 2,
      allowRotation: false,
      bleedMm: 1,
    });

    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 1,
      strokeStyle: '',
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((cb: (blob: Blob) => void) => {
        cb(new Blob(['png-bytes'], { type: 'image/png' }));
      }),
    };

    const originalDocument = globalThis.document;
    globalThis.document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return originalDocument?.createElement?.(tag);
      }),
    } as any;

    try {
      const blob = await generateStickerSheetPng({
        pageWidthMm: A4_WIDTH_MM,
        pageHeightMm: A4_HEIGHT_MM,
        layout,
        bleedMm: 1,
        bleedColor: '#3B82F6',
        stickerShape: 'rect',
      });

      expect(blob).toBeDefined();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    } finally {
      globalThis.document = originalDocument;
    }
  });
});
