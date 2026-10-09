import { describe, it, expect } from 'vitest';
import { parseUrlSettings } from './urlParams';

describe('parseUrlSettings (Smart Deeplinks for ChatGPT & Web)', () => {
  it('возвращает пустой объект для пустой или некорректной строки', () => {
    expect(parseUrlSettings('')).toEqual({});
    expect(parseUrlSettings('?')).toEqual({});
    expect(parseUrlSettings('   ')).toEqual({});
  });

  it('корректно парсит основные размеры стикера (width, height)', () => {
    const res = parseUrlSettings('?width=60&height=40');
    expect(res.stickerWidthMm).toBe(60);
    expect(res.stickerHeightMm).toBe(40);
  });

  it('поддерживает короткие алиасы w и h, а также запятые в качестве десятичного разделителя', () => {
    const res = parseUrlSettings('?w=52,5&h=85,0');
    expect(res.stickerWidthMm).toBe(52.5);
    expect(res.stickerHeightMm).toBe(85);
  });

  it('ограничивает размеры наклейки допустимыми границами (5 .. 297 мм)', () => {
    const resTooSmall = parseUrlSettings('?width=1&height=2');
    expect(resTooSmall.stickerWidthMm).toBe(5);
    expect(resTooSmall.stickerHeightMm).toBe(5);

    const resTooLarge = parseUrlSettings('?width=500&height=400');
    expect(resTooLarge.stickerWidthMm).toBe(297);
    expect(resTooLarge.stickerHeightMm).toBe(297);
  });

  it('распознает ориентацию страницы (portrait, landscape, l, p)', () => {
    expect(parseUrlSettings('?orientation=landscape').pageOrientation).toBe('landscape');
    expect(parseUrlSettings('?orient=portrait').pageOrientation).toBe('portrait');
    expect(parseUrlSettings('?o=l').pageOrientation).toBe('landscape');
    expect(parseUrlSettings('?o=p').pageOrientation).toBe('portrait');
  });

  it('парсит общий зазор между наклейками (gap / g)', () => {
    const res = parseUrlSettings('?gap=2.5');
    expect(res.gapX).toBe(2.5);
    expect(res.gapY).toBe(2.5);
    expect(res.linkGaps).toBe(true);

    const resShort = parseUrlSettings('?g=0');
    expect(resShort.gapX).toBe(0);
    expect(resShort.gapY).toBe(0);
    expect(resShort.linkGaps).toBe(true);
  });

  it('парсит раздельные зазоры gapX и gapY', () => {
    const res = parseUrlSettings('?gapX=4&gapY=2');
    expect(res.gapX).toBe(4);
    expect(res.gapY).toBe(2);
    expect(res.linkGaps).toBe(false);
  });

  it('парсит единое поле страницы (margin / m)', () => {
    const res = parseUrlSettings('?margin=8');
    expect(res.margins).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    expect(res.linkMargins).toBe(true);
  });

  it('парсит раздельные поля страницы (marginTop, marginBottom, etc.)', () => {
    const res = parseUrlSettings('?margin=5&marginTop=10&marginBottom=12');
    expect(res.margins).toEqual({ top: 10, bottom: 12, left: 5, right: 5 });
    expect(res.linkMargins).toBe(false);
  });

  it('парсит количество копий (число или auto)', () => {
    expect(parseUrlSettings('?copies=15').requestedCopies).toBe(15);
    expect(parseUrlSettings('?c=auto').requestedCopies).toBe('AUTO');
    expect(parseUrlSettings('?count=max').requestedCopies).toBe('AUTO');
  });

  it('парсит флаг поворота на 90° (rotation / rot)', () => {
    expect(parseUrlSettings('?rotation=false').allowRotation).toBe(false);
    expect(parseUrlSettings('?rot=0').allowRotation).toBe(false);
    expect(parseUrlSettings('?allowRotation=true').allowRotation).toBe(true);
    expect(parseUrlSettings('?rotation=1').allowRotation).toBe(true);
  });

  it('парсит режим заполнения изображения (sizingMode: fill / fit)', () => {
    expect(parseUrlSettings('?sizing=fit').sizingMode).toBe('fit');
    expect(parseUrlSettings('?mode=fill').sizingMode).toBe('fill');
    expect(parseUrlSettings('?sizingMode=contain').sizingMode).toBe('fit');
  });

  it('парсит вылет под обрез (bleed: 0..3 мм)', () => {
    expect(parseUrlSettings('?bleed=2').bleedMm).toBe(2);
    expect(parseUrlSettings('?bleedMm=5').bleedMm).toBe(3); // clamp max 3
  });

  it('устойчив к мусорным и нечисловым значениям', () => {
    const res = parseUrlSettings('?width=abc&height=null&margin=undefined&gap=--');
    expect(res.stickerWidthMm).toBeUndefined();
    expect(res.stickerHeightMm).toBeUndefined();
    expect(res.margins).toBeUndefined();
    expect(res.gapX).toBeUndefined();
  });

  it('полный комплексный URL от ChatGPT', () => {
    const url = '?width=70&height=45&gap=3&margin=8&orientation=landscape&copies=24&rot=1';
    const res = parseUrlSettings(url);

    expect(res).toEqual({
      stickerWidthMm: 70,
      stickerHeightMm: 45,
      gapX: 3,
      gapY: 3,
      linkGaps: true,
      margins: { top: 8, bottom: 8, left: 8, right: 8 },
      linkMargins: true,
      pageOrientation: 'landscape',
      requestedCopies: 24,
      allowRotation: true,
    });
  });

  it('парсинг параметров bleed и bleedColor', () => {
    const url = '?bleed=2&bleedColor=3b82f6';
    const res = parseUrlSettings(url);
    expect(res.bleedMm).toBe(2);
    expect(res.bleedColor).toBe('#3b82f6');
  });
});
