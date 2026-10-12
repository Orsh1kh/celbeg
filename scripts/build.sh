#!/bin/sh
# ═══════════════════════════════════════════════════════════
# Cloudflare Pages build: зөвхөн сайтад хэрэгтэй файлуудыг dist/ руу хуулна.
# supabase/*.sql, README, .claude/ зэрэг дотоод файл нийтэд гарахгүй.
#   Build command:          sh scripts/build.sh
#   Build output directory: dist
# Сайтад шинэ файл/хавтас нэмбэл доорх жагсаалтад нэмнэ үү.
# ═══════════════════════════════════════════════════════════
set -e
rm -rf dist
mkdir dist
cp -R index.html css js img manifest.json sw.js robots.txt sitemap.xml _headers dist/
echo "dist/ бэлэн: $(find dist -type f | wc -l) файл"
