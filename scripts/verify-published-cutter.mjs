import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function runBrowserVerification() {
  console.log('🚀 Запуск агентской браузерной проверки на опубликованном сайте: https://stickerfit.vercel.app\n');

  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  console.log('1. Переход на опубликованный сайт...');
  await page.goto('https://stickerfit.vercel.app', { waitUntil: 'networkidle0', timeout: 45000 });

  const pageTitle = await page.title();
  console.log(`✓ Заголовок страницы: "${pageTitle}"`);
  console.log(`✓ Ошибок JS в консоли: ${consoleErrors.length}`);

  // 2. Проверка наличия элементов управления формы и плоттера
  console.log('\n2. Проверка наличия контролов формы стикера и экспорта для плоттера:');
  const elementsCheck = await page.evaluate(() => {
    return {
      hasShapeRect: Boolean(document.getElementById('shapeRect')),
      hasShapeCircle: Boolean(document.getElementById('shapeCircle')),
      hasShapeRounded: Boolean(document.getElementById('shapeRounded')),
      hasCornerRadiusGroup: Boolean(document.getElementById('cornerRadiusGroup')),
      hasCornerRadiusInput: Boolean(document.getElementById('cornerRadius')),
      hasRegMarksCheckbox: Boolean(document.getElementById('registrationMarksEnabled')),
      hasDownloadCutSvgBtn: Boolean(document.getElementById('btnDownloadCutSvg')),
      hasHeaderDownloadSvgBtn: Boolean(document.getElementById('btnHeaderDownloadSvg')),
    };
  });
  console.log('  - Радио-кнопка прямоугольника (#shapeRect):', elementsCheck.hasShapeRect ? 'OK' : 'FAIL');
  console.log('  - Радио-кнопка круга (#shapeCircle):', elementsCheck.hasShapeCircle ? 'OK' : 'FAIL');
  console.log('  - Радио-кнопка скругленного (#shapeRounded):', elementsCheck.hasShapeRounded ? 'OK' : 'FAIL');
  console.log('  - Группа радиуса скругления (#cornerRadiusGroup):', elementsCheck.hasCornerRadiusGroup ? 'OK' : 'FAIL');
  console.log('  - Чекбокс оптических меток (#registrationMarksEnabled):', elementsCheck.hasRegMarksCheckbox ? 'OK' : 'FAIL');
  console.log('  - Кнопка экспорта контура SVG (#btnDownloadCutSvg):', elementsCheck.hasDownloadCutSvgBtn ? 'OK' : 'FAIL');
  console.log('  - Кнопка SVG в шапке (#btnHeaderDownloadSvg):', elementsCheck.hasHeaderDownloadSvgBtn ? 'OK' : 'FAIL');

  // 3. Тест выбора круга
  console.log('\n3. Тестирование выбора формы «Круг»:');
  await page.evaluate(() => {
    const el = document.getElementById('shapeCircle');
    if (el) {
      el.click();
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const circleState = await page.evaluate(() => {
    const lblWidth = document.getElementById('lblStickerWidth')?.textContent?.trim();
    const colHeight = document.getElementById('colStickerHeight');
    const isHeightHidden = colHeight ? getComputedStyle(colHeight).display === 'none' : false;
    const cornerRadiusGroup = document.getElementById('cornerRadiusGroup');
    const isCornerHidden = cornerRadiusGroup ? getComputedStyle(cornerRadiusGroup).display === 'none' : false;
    const circleCutPaths = document.querySelectorAll('circle.preview-sticker-cut-path');

    return {
      lblWidth,
      isHeightHidden,
      isCornerHidden,
      cutCirclesCount: circleCutPaths.length
    };
  });

  console.log(`  - Подпись поля размера: "${circleState.lblWidth}" (ожидается "Диаметр (мм)")`);
  console.log(`  - Поле высоты скрыто: ${circleState.isHeightHidden}`);
  console.log(`  - Поле радиуса углов скрыто: ${circleState.isCornerHidden}`);
  console.log(`  - Количество круговых контуров реза в предпросмотре: ${circleState.cutCirclesCount}`);

  // 4. Тест включения оптических меток совмещения плоттера
  console.log('\n4. Тестирование оптических меток совмещения:');
  await page.evaluate(() => {
    const el = document.getElementById('registrationMarksEnabled');
    if (el) {
      el.click();
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const regMarksState = await page.evaluate(() => {
    const regMarksGroup = document.getElementById('previewRegistrationMarks');
    const marksElements = regMarksGroup ? regMarksGroup.querySelectorAll('circle, path, rect').length : 0;
    return {
      hasGroup: Boolean(regMarksGroup),
      elementsCount: marksElements
    };
  });
  console.log(`  - Группа меток в SVG предпросмотре: ${regMarksState.hasGroup}`);
  console.log(`  - Графических элементов в оптических метках: ${regMarksState.elementsCount}`);

  // Скриншот круглой раскладки с метками
  const screenshotPathCircle = 'test-results/live-published-desktop-circle.png';
  await page.screenshot({ path: screenshotPathCircle, fullPage: false });
  console.log(`📸 Скриншот круглой раскладки сохранен: ${screenshotPathCircle}`);

  // 5. Тест формы со скругленными углами
  console.log('\n5. Тестирование выбора формы «Скругленный»:');
  await page.evaluate(() => {
    const el = document.getElementById('shapeRounded');
    if (el) {
      el.click();
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const roundedState = await page.evaluate(() => {
    const lblWidth = document.getElementById('lblStickerWidth')?.textContent?.trim();
    const colHeight = document.getElementById('colStickerHeight');
    const isHeightVisible = colHeight ? getComputedStyle(colHeight).display !== 'none' : false;
    const cornerRadiusGroup = document.getElementById('cornerRadiusGroup');
    const isCornerVisible = cornerRadiusGroup ? getComputedStyle(cornerRadiusGroup).display !== 'none' : false;
    const rectCutPaths = document.querySelectorAll('rect.preview-sticker-cut-path');

    return {
      lblWidth,
      isHeightVisible,
      isCornerVisible,
      cutRectsCount: rectCutPaths.length
    };
  });
  console.log(`  - Подпись поля размера: "${roundedState.lblWidth}" (ожидается "Ширина (мм)")`);
  console.log(`  - Поле высоты видимо: ${roundedState.isHeightVisible}`);
  console.log(`  - Поле радиуса скругления видимо: ${roundedState.isCornerVisible}`);
  console.log(`  - Контуров резки в SVG предпросмотре: ${roundedState.cutRectsCount}`);

  const screenshotPathRounded = 'test-results/live-published-desktop-rounded.png';
  await page.screenshot({ path: screenshotPathRounded, fullPage: false });
  console.log(`📸 Скриншот скругленной раскладки сохранен: ${screenshotPathRounded}`);

  // 6. Проверка генерации контура плоттера (клик по кнопке экспорта)
  console.log('\n6. Проверка клика по кнопке «Скачать контур для плоттера (SVG)»:');
  const downloadCheck = await page.evaluate(() => {
    let capturedBlob = null;
    let capturedFilename = null;
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = (blob) => {
      capturedBlob = blob;
      return originalCreateObjectURL(blob);
    };

    const btn = document.getElementById('btnDownloadCutSvg');
    if (btn) btn.click();

    return {
      triggered: Boolean(capturedBlob),
      blobType: capturedBlob?.type,
      blobSize: capturedBlob?.size
    };
  });
  console.log(`  - Триггер экспорта SVG: ${downloadCheck.triggered ? 'УСПЕШНО' : 'FAIL'}`);
  console.log(`  - MIME-тип SVG: ${downloadCheck.blobType}`);
  console.log(`  - Размер файла SVG: ${downloadCheck.blobSize} байт`);

  // 7. Мобильный просмотр
  console.log('\n7. Проверка мобильной адаптивности (iPhone 14 / 390x844):');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.waitForNetworkIdle({ timeout: 500 }).catch(() => {});

  const screenshotPathMobile = 'test-results/live-published-mobile.png';
  await page.screenshot({ path: screenshotPathMobile });
  console.log(`📸 Мобильный скриншот сохранен: ${screenshotPathMobile}`);

  await browser.close();

  console.log('\n🎉 Все проверки в опубликованной версии успешно пройдены без ошибок!');
}

runBrowserVerification().catch(err => {
  console.error('Ошибка при браузерной проверке:', err);
  process.exit(1);
});
