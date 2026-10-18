// ═══════════════════════════════════════════════════════════
// Апп-ын икон, нээгдэх дэлгэцийг img/*.svg-ээс үүсгэнэ (Android + iOS).
// Лого солигдвол: img/icon-512.svg, img/icon-maskable.svg-ийг шинэчлээд `npm run icons`
// ═══════════════════════════════════════════════════════════
import sharp from 'sharp';
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ICON      = 'img/icon-512.svg';       // бөөрөнхий булантай (splash дээр)
const MASKABLE  = 'img/icon-maskable.svg';  // дүүрэн дэвсгэртэй (апп-ын икон)
const BRAND_BG  = '#c0392b';
const SPLASH_BG = '#0f0f0f';
const RES       = 'android/app/src/main/res';

const svg = (file, size) => sharp(file, { density: 512 }).resize(size, size);
const circleMask = size => Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);

// ── Android: launcher (legacy, round, adaptive foreground) ──
const DENSITY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, f] of Object.entries(DENSITY)) {
  const dir = join(RES, `mipmap-${d}`);
  const s = Math.round(48 * f);
  await svg(ICON, s).png().toFile(join(dir, 'ic_launcher.png'));
  await svg(MASKABLE, s).composite([{ input: circleMask(s), blend: 'dest-in' }]).png().toFile(join(dir, 'ic_launcher_round.png'));
  await svg(MASKABLE, Math.round(108 * f)).png().toFile(join(dir, 'ic_launcher_foreground.png'));
}
writeFileSync(join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND_BG}</color>\n</resources>\n`);

// ── iOS: 1024 икон (ил тод байж болохгүй) ───────────────────
await svg(MASKABLE, 1024).flatten({ background: BRAND_BG }).png()
  .toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

// ── Splash: бараан дэвсгэр дээр голд нь лого ────────────────
async function splash(file) {
  const { width, height } = await sharp(file).metadata();
  const logo = Math.round(Math.min(width, height) * 0.28);
  const buf = await svg(ICON, logo).png().toBuffer();
  const out = await sharp({ create: { width, height, channels: 4, background: SPLASH_BG } })
    .composite([{ input: buf, gravity: 'center' }]).png().toBuffer();
  writeFileSync(file, out);
}
const splashes = readdirSync(RES)
  .filter(d => d.startsWith('drawable'))
  .map(d => join(RES, d, 'splash.png'))
  .filter(existsSync);
const iosSplash = 'ios/App/App/Assets.xcassets/Splash.imageset';
for (const f of readdirSync(iosSplash).filter(f => f.endsWith('.png'))) splashes.push(join(iosSplash, f));
for (const f of splashes) await splash(f);

console.log(`Икон: Android ${Object.keys(DENSITY).length * 3} + iOS 1, splash: ${splashes.length}`);
