// ═══════════════════════════════════════════════════════════
// npm сангуудаас браузерт шууд ачаалагдах файлуудыг js/vendor/ руу хуулна.
// Хувилбар нь package.json-д тогтоогдсон. Шинэчлэх: npm i <pkg>@<ver> → npm run vendor
// ═══════════════════════════════════════════════════════════
import { copyFileSync, mkdirSync } from 'node:fs';

const FILES = {
  'node_modules/@supabase/supabase-js/dist/umd/supabase.js': 'js/vendor/supabase.js',
  'node_modules/@capacitor/core/dist/capacitor.js':          'js/vendor/capacitor.js',
  'node_modules/@capacitor/app/dist/plugin.js':              'js/vendor/capacitor-app.js',
  'node_modules/@capacitor/share/dist/plugin.js':            'js/vendor/capacitor-share.js',
};

mkdirSync('js/vendor', { recursive: true });
for (const [src, dst] of Object.entries(FILES)) {
  copyFileSync(src, dst);
  console.log(`${src} → ${dst}`);
}
