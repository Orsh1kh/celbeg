// ═══════════════════════════════════════════════════════════
// Build: зөвхөн сайтад хэрэгтэй файлуудыг dist/ руу хуулна.
// • Cloudflare Pages:  Build command `node scripts/build.mjs`, output `dist`
// • Capacitor апп:     webDir = dist  (npm run sync)
// supabase/*.sql, README, .claude/ зэрэг дотоод файл нийтэд/апп-д орохгүй.
// Сайтад шинэ файл/хавтас нэмбэл доорх жагсаалтад нэмнэ үү.
// ═══════════════════════════════════════════════════════════
import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const INCLUDE = ['index.html', 'css', 'js', 'img', 'manifest.json', 'sw.js', 'robots.txt', 'sitemap.xml', '_headers'];

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const p of INCLUDE) cpSync(p, join('dist', p), { recursive: true });

const count = dir => readdirSync(dir).reduce((n, f) => {
  const p = join(dir, f);
  return n + (statSync(p).isDirectory() ? count(p) : 1);
}, 0);
console.log(`dist/ бэлэн: ${count('dist')} файл`);
