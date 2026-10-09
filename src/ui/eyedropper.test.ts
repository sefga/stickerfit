import { describe, it, expect, vi } from 'vitest';
import { samplePixelFromCanvas } from './eyedropper';

describe('Eyedropper Module', () => {
  it('корректно извлекает RGB цвет непрозрачного пикселя и преобразует в HEX', () => {
    const mockCtx = {
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray([59, 130, 246, 255]), // #3B82F6
      }),
    };
    const mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn().mockReturnValue(mockCtx),
    } as unknown as HTMLCanvasElement;

    const res = samplePixelFromCanvas(mockCanvas, 10, 20);
    expect(res.r).toBe(59);
    expect(res.g).toBe(130);
    expect(res.b).toBe(246);
    expect(res.a).toBe(255);
    expect(res.hex).toBe('#3B82F6');
    expect(res.isTransparent).toBe(false);
  });

  it('определяет прозрачный пиксель (alpha < 25)', () => {
    const mockCtx = {
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray([255, 0, 0, 0]), // полностью прозрачный
      }),
    };
    const mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn().mockReturnValue(mockCtx),
    } as unknown as HTMLCanvasElement;

    const res = samplePixelFromCanvas(mockCanvas, 5, 5);
    expect(res.isTransparent).toBe(true);
  });

  it('ограничивает координаты границами Canvas', () => {
    const mockCtx = {
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray([0, 0, 0, 255]),
      }),
    };
    const mockCanvas = {
      width: 50,
      height: 50,
      getContext: vi.fn().mockReturnValue(mockCtx),
    } as unknown as HTMLCanvasElement;

    samplePixelFromCanvas(mockCanvas, 200, -50);
    expect(mockCtx.getImageData).toHaveBeenCalledWith(49, 0, 1, 1);
  });
});
