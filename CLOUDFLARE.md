# CELBEG.MN → Cloudflare руу шилжүүлэх заавар

Шилжүүлэлтийн хугацаанд сайт Netlify дээр ажилласаар байна — зочдод тасалдал гарахгүй.
Алхам бүрийн дараа Claude-д дэлгэцийн зураг илгээж шалгуулж болно.

---

## 1-р алхам — Pages төсөл үүсгэх (5 минут)

1. Cloudflare → зүүн цэс **Compute → Workers & Pages** → **Create** товч
2. **Pages** табыг сонгоно → **Import an existing Git repository**
   (GitHub холбогдоогүй бол **Connect GitHub** → `Orsh1kh/celbeg` репод эрх өгнө)
3. Репо: **Orsh1kh/celbeg** → **Begin setup**
4. Тохиргоо:
   | Талбар | Утга |
   |---|---|
   | Project name | `celbeg` |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | `sh scripts/build.sh` |
   | Build output directory | `dist` |
5. **Save and Deploy** → 1–2 минутын дараа `https://celbeg.pages.dev` гэх мэт хаяг гарна.
6. Тэр хаягийг Claude-д өгнө → header, файлууд зөв эсэхийг шалгана.

> Хэрэв **Pages** таб олдохгүй бол дэлгэцийн зургийг Claude-д илгээнэ үү.

---

## 2-р алхам — celbeg.mn домэйныг Cloudflare-д нэмэх

1. Cloudflare → **Domains → Onboard a domain** → `celbeg.mn` → **Free** багц
2. Cloudflare одоогийн DNS бичлэгүүдийг автоматаар уншина. Одоо байгаа нь:
   - `celbeg.mn` → A `52.74.6.109`, `13.215.239.219` (Netlify)
   - `www.celbeg.mn` → мөн адил
   Эдгээрийг одоохондоо **хэвээр үлдээнэ** (3-р алхам хүртэл сайт Netlify-ээс ажиллана).
3. Cloudflare 2 nameserver өгнө (жш: `xxx.ns.cloudflare.com`).
4. **celbeg.mn домэйноо худалдаж авсан газар** (.mn бүртгэгч)-ийн хяналтын самбар руу орж
   nameserver-ийг одоогийн `dns1–4.p06.nsone.net` (Netlify)-ээс Cloudflare-ийн 2 nameserver болгож солино.
5. 1–48 цагийн дотор Cloudflare "**Active**" болно (email-ээр мэдэгдэнэ).

**SSL/TLS** → Overview → горимыг **Full** болгоно.

---

## 3-р алхам — Домэйныг Pages-тэй холбох (domain Active болсны дараа)

1. **Workers & Pages → celbeg → Custom domains → Set up a custom domain**
2. `celbeg.mn` нэмнэ → Cloudflare DNS бичлэгийг өөрөө солино
3. Дахин `www.celbeg.mn` нэмнэ
4. 5–10 минутын дараа https://celbeg.mn Cloudflare-ээс ачаална.

---

## 4-р алхам — info@celbeg.mn email (үнэгүй)

Одоо celbeg.mn-д email бичлэг (MX) байхгүй тул `info@celbeg.mn` руу илгээсэн захидал **хүрэхгүй** байна.

1. Cloudflare → celbeg.mn → **Email → Email Routing** → **Enable**
2. **Destination address**: өөрийн Gmail → Gmail-д ирсэн баталгаажуулах линк дээр дарна
3. **Routing rules → Create address**: `info` → таны Gmail
4. Өөр хаягаас `info@celbeg.mn` руу туршилтын захидал илгээж шалгана.

---

## 5-р алхам — Цэвэрлэгээ (бүх зүйл ажилласны дараа)

1. Netlify → celbeg.mn төсөл → **Project configuration → Delete project**
   (эсвэл Build settings → **Stop builds**). Ингэснээр GitHub push хийхэд Netlify дахин build хийхгүй.
2. Claude-д хэлбэл `netlify.toml`-ийг репоос устгана.

---

## ⚠️ Cloudflare дээр асаахгүй байх тохиргоо (асаахын өмнө Claude-д хэлэх)

| Тохиргоо | Яагаад |
|---|---|
| **Rocket Loader** | JS-ийн ачаалах дарааллыг өөрчилж сайтыг эвдэж болно |
| **Web Analytics (автомат скрипт)** | Хамгаалалтын CSP header блоклоно — асаавал CSP-д нэмэх хэрэгтэй |
| **Always Use HTTPS** | Асаалттай байхад асуудалгүй ✅ |
