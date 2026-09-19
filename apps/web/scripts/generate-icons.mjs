// Rasterizes public/icon.svg into:
//   - PNG app icons: public/flag-{192,512}.png (manifest fallback + Chrome install)
//   - iOS splash startup images: public/splash/*.png (16 device presets)
//
// Splash strategy: solid light-mode background (#fafafa) with the flag
// centered at ~24% of the shortest edge. Dark-mode splash is out of scope
// for MVP — iOS falls back to the light one, which is acceptable.
//
// Sizes below are portrait CSS-px × device-pixel-ratio. When updating,
// keep in sync with the <link rel="apple-touch-startup-image"> tags in
// apps/web/src/app/layout.tsx — the pairing is by media query.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const splashDir = path.join(publicDir, 'splash');
const iconSvg = path.join(publicDir, 'icon.svg');

// Matches manifest.ts background_color (light) — keep in sync.
const BG = { r: 250, g: 250, b: 250, alpha: 1 };

const APP_ICONS = [
  { size: 192, out: 'flag-192.png' },
  { size: 512, out: 'flag-512.png' },
];

// name → CSS px width/height + device pixel ratio. Native output is w*dpr × h*dpr.
const SPLASH_DEVICES = [
  { name: 'iphone-15-pro-max', w: 430, h: 932, dpr: 3 },
  { name: 'iphone-15-pro', w: 393, h: 852, dpr: 3 },
  { name: 'iphone-15-plus', w: 428, h: 926, dpr: 3 },
  { name: 'iphone-15', w: 390, h: 844, dpr: 3 },
  { name: 'iphone-13-mini', w: 375, h: 812, dpr: 3 },
  { name: 'iphone-11-pro-max', w: 414, h: 896, dpr: 3 },
  { name: 'iphone-11', w: 414, h: 896, dpr: 2 },
  { name: 'iphone-8-plus', w: 414, h: 736, dpr: 3 },
  { name: 'iphone-8', w: 375, h: 667, dpr: 2 },
  { name: 'iphone-se', w: 320, h: 568, dpr: 2 },
  { name: 'ipad-pro-12', w: 1024, h: 1366, dpr: 2 },
  { name: 'ipad-pro-11', w: 834, h: 1194, dpr: 2 },
  { name: 'ipad-air-10-5', w: 810, h: 1080, dpr: 2 },
  { name: 'ipad-mini', w: 744, h: 1133, dpr: 2 },
  { name: 'ipad-9-7', w: 768, h: 1024, dpr: 2 },
];

async function makeAppIcons() {
  for (const { size, out } of APP_ICONS) {
    await sharp(iconSvg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, out));
    console.log(`  ${out} (${size}×${size})`);
  }
}

async function makeSplashes() {
  await mkdir(splashDir, { recursive: true });
  for (const { name, w, h, dpr } of SPLASH_DEVICES) {
    const outW = w * dpr;
    const outH = h * dpr;
    // Flag occupies ~24% of the shorter edge → visually similar to native app
    // launch screens (icon-sized logo on empty backdrop).
    const iconSize = Math.round(Math.min(outW, outH) * 0.24);
    const iconBuf = await sharp(iconSvg, { density: 512 })
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();
    await sharp({
      create: { width: outW, height: outH, channels: 4, background: BG },
    })
      .composite([{ input: iconBuf, gravity: 'center' }])
      .png()
      .toFile(path.join(splashDir, `${name}.png`));
    console.log(`  splash/${name}.png (${outW}×${outH})`);
  }
}

console.log('Generating app icons…');
await makeAppIcons();
console.log('Generating iOS splash images…');
await makeSplashes();
console.log('✓ done');
