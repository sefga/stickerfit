import { LayoutResult } from '../../../src/layout/layoutEngine';

export type StickerShape = 'rect' | 'circle' | 'rounded';

export interface SvgCutContourOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  layout: LayoutResult;
  shape: StickerShape;
  cornerRadiusMm?: number;
  registrationMarks?: boolean;
}

export interface CutGeneratorContract {
  generateStickerCutSvg(options: SvgCutContourOptions): string;
  downloadCutSvgBlob(svgContent: string, fileName?: string): void;
}
