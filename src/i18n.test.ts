import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import {
  setLanguage,
  getLanguage,
  t,
  onLanguageChange,
  applyTranslations,
  STORAGE_LANG_KEY,
} from './i18n';

describe('i18n module', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Мокируем localStorage для среды Node.js
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        for (const key in mockStorage) delete mockStorage[key];
      },
    };

    setLanguage('ru');
  });

  afterAll(() => {
    delete (globalThis as any).localStorage;
  });

  it('должен возвращать русский текст по умолчанию для ru локали', () => {
    setLanguage('ru');
    expect(t('appTitle')).toBe('Раскладка наклеек A4');
    expect(t('btnSelectImage')).toBe('Выбрать изображение');
    expect(t('lblWidth')).toBe('Ширина (мм)');
  });

  it('должен возвращать английский текст после переключения на en', () => {
    setLanguage('en');
    expect(t('appTitle')).toBe('A4 Sticker Sheet Maker');
    expect(t('btnSelectImage')).toBe('Choose Image');
    expect(t('lblWidth')).toBe('Width (mm)');
  });

  it('должен корректно интерполировать параметры в шаблоне строки', () => {
    setLanguage('ru');
    const badgeRu = t('itemsBadge', { count: 12 });
    expect(badgeRu).toBe('12 шт.');

    setLanguage('en');
    const badgeEn = t('itemsBadge', { count: 12 });
    expect(badgeEn).toBe('12 pcs');

    const rec = t('recBestRotated', { rot: 15, orig: 10 });
    expect(rec).toContain('15 pcs');
    expect(rec).toContain('10 pcs');
  });

  it('должен оповещать слушателей при смене языка', () => {
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);

    setLanguage('en');
    expect(listener).toHaveBeenCalledWith('en');
    expect(getLanguage()).toBe('en');

    unsubscribe();
    setLanguage('ru');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('должен сохранять выбранный язык в localStorage', () => {
    setLanguage('en');
    expect((globalThis as any).localStorage.getItem(STORAGE_LANG_KEY)).toBe('en');

    setLanguage('ru');
    expect((globalThis as any).localStorage.getItem(STORAGE_LANG_KEY)).toBe('ru');
  });

  it('applyTranslations должен корректно обновлять элементы DOM по data-i18n', () => {
    // Создаем минимальный мок DOM-элемента для проверки applyTranslations в Node
    const items = [
      {
        attr: 'appTitle',
        textContent: 'Старый заголовок',
        innerHTML: 'Старый заголовок',
        getAttribute: (name: string) => (name === 'data-i18n' ? 'appTitle' : null),
      },
      {
        attr: 'placeholderCopies',
        placeholder: 'old',
        getAttribute: (name: string) => (name === 'data-i18n-placeholder' ? 'placeholderCopies' : null),
      },
      {
        attr: 'cropBtnResetTitle',
        title: 'old',
        getAttribute: (name: string) => (name === 'data-i18n-title' ? 'cropBtnResetTitle' : null),
      },
    ];

    const fakeRoot = {
      querySelectorAll: (sel: string) => {
        if (sel === '[data-i18n]') return [items[0]];
        if (sel === '[data-i18n-placeholder]') return [items[1]];
        if (sel === '[data-i18n-title]') return [items[2]];
        return [];
      },
    };

    setLanguage('en');
    applyTranslations(fakeRoot as any);

    expect(items[0].textContent).toBe('A4 Sticker Sheet Maker');
    expect(items[1].placeholder).toBe('AUTO or number');
    expect(items[2].title).toBe('Reset crop');
  });

  it('должен содержать корректные переводы для всех ключей Bleed в обеих локалях', () => {
    setLanguage('ru');
    expect(t('lblBleedColor')).toBe('Цвет вылета');
    expect(t('lblBleedEyedropper')).toBe('Пипетка');
    expect(t('warnBleedEffectiveGap', { effectiveGap: 4, gap: 2 })).toContain('4 мм');
    expect(t('bleedCapacityDiff', { count: 20 })).toContain('20 шт.');

    setLanguage('en');
    expect(t('lblBleedColor')).toBe('Bleed color');
    expect(t('lblBleedEyedropper')).toBe('Eyedropper');
    expect(t('warnBleedEffectiveGap', { effectiveGap: 4, gap: 2 })).toContain('4 mm');
    expect(t('bleedCapacityDiff', { count: 20 })).toContain('20 pcs');
  });
});

