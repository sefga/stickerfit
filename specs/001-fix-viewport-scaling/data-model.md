# Data Model & State Entities: Исправление масштабирования фото во Viewport

## 1. Сущности состояния

### ArtworkRenderRequest
- `imageSrc`: string (источник изображения)
- `cropData`: CropData | null
- `sizingMode`: 'fill' | 'fit'
- `aspectRatio`: number (целевое соотношение сторон stickerWidthMm / stickerHeightMm)
- `sheetRotation`: 0 | 90

### CroppedArtworkResult
- `dataUrl`: string (Blob URL или Data URL для быстрого отображения)
- `bytes`: Uint8Array (сырые байты для PDF)
- `mimeType`: string
- `pixelWidth`: number
- `pixelHeight`: number
- `naturalRatio`: number (фактическое соотношение сторон растра)

### SVGPreviewOptions
- `pageWidthMm`: number
- `pageHeightMm`: number
- `margins`: Margins
- `layout`: LayoutResult
- `imageUrl`: string | null
- `sizingMode`: 'fill' | 'fit'
- `cutMarksConfig`: CutMarksConfig
- `bleedMm`: number
