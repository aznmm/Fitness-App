// Renders public/icon.svg to the PNG sizes the PWA manifest and iOS need, plus
// an iOS Home Screen icon for each colour in src/data/accents.json
// (apple-touch-icon-<colour>.png), picked when the app is added in that colour.
// Usage: npm run icons   (requires Playwright's Chromium)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const pub = path.join(__dirname, '..', 'public');
const svg = fs.readFileSync(path.join(pub, 'icon.svg'), 'utf8');
// Maskable icons need a full-bleed background and content inside the 80% safe zone.
const bg = svg.match(/<rect width="512"[^>]*\/>/)[0];
const maskable = svg
  .replace(bg, `${bg.replace('rx="112"', 'rx="0"')}<g transform="translate(51.2 51.2) scale(0.8)">`)
  .replace('</svg>', '</g></svg>');

const accents = require('../src/data/accents.json');
const recolour = (source, [main, partner]) =>
  source.replace(/(<stop offset="0" stop-color=")[^"]+/, `$1${partner}`).replace(/(<stop offset="1" stop-color=")[^"]+/, `$1${main}`);

const targets = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['apple-touch-icon.png', 180, svg.replace('rx="112"', 'rx="0"')],
  ['icon-maskable-512.png', 512, maskable],
  ...Object.entries(accents)
    .filter(([id]) => id !== 'blue')
    .map(([id, a]) => [`apple-touch-icon-${id}.png`, 180, recolour(svg.replace('rx="112"', 'rx="0"'), a.dark)]),
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, size, source] of targets) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${source.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.screenshot({ path: path.join(pub, file), omitBackground: true });
    console.log('wrote', file);
  }
  await browser.close();
})();
