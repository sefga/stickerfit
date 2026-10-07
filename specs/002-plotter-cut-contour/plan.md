# Implementation Plan: Выбор формы стикера и генерация векторного контура плоттерной резки (1:1 SVG)

**Branch**: `002-plotter-cut-contour` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-plotter-cut-contour/spec.md`

## Summary

Добавление поддержки форм стикеров (Прямоугольник, Круг, Скругленный прямоугольник) в StickerFit, генерация масштабируемого 1:1 SVG файла траекторий резки для контурных плоттеров, согласованные оптические метки совмещения в PDF и SVG, и маскирование печати с вылетом под обрез (Bleed).

## Technical Context

**Language/Version**: TypeScript 5.5, ES2022  
**Primary Dependencies**: Vite, pdf-lib, Canvas 2D API  
**Testing**: Vitest  
**Target Platform**: Современные веб-браузеры (Chrome, Firefox, Safari, Edge)  
**Project Type**: Client-Side Single Page Application (SPA)  
**Performance Goals**: Генерация SVG контуров реза < 50 мс, 60 FPS Live Preview  
**Constraints**: 100% Client-Side Privacy (изображения не покидают браузер), нулевой вес внешних библиотек для генерации SVG  

## Project Structure

### Documentation (this feature)

```text
specs/002-plotter-cut-contour/
├── plan.md              # Этот файл
├── research.md          # Исследование стандартов плоттеров и меток
├── data-model.md        # Модели данных и валидация
├── quickstart.md        # Краткое руководство пользователя
├── contracts/           # Контракты интерфейсов
│   └── cut-contour.contract.ts
└── tasks.md             # Задачи реализации
```

### Source Code

```text
src/
├── state.ts                    # Добавление stickerShape, cornerRadiusMm, registrationMarks
├── layout/layoutEngine.ts      # Поддержка геометрии ячеек
├── export/
│   ├── svgCutGenerator.ts      # Новый модуль генерации SVG контуров резки
│   ├── svgCutGenerator.test.ts # Тесты генератора SVG
│   └── pngGenerator.ts         # Маскирование по форме с довылетом Bleed
├── pdf/
│   ├── pdfGenerator.ts         # Отрисовка меток совмещения и маскирование
│   └── cutMarks.ts             # Векторные метки реза
├── preview/
│   └── previewRenderer.ts      # SVG предпросмотр с контурами реза и масками
├── ui/
│   └── controls.ts             # Селектор формы, поле диаметра, радиуса, кнопки экспорта
├── i18n.ts                     # Локализация на русский и английский
index.html                      # Разметка новых контролов в сайдбаре и тулбаре
```
