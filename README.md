# CELBEG.MN

Монголын авто сэлбэгийн онлайн зах зээл. Static HTML/CSS/JS + Supabase.

## Production дээр гаргах алхмууд

### 1. Supabase project үүсгэх

1. https://supabase.com/dashboard → **New project**
2. Region: **Northeast Asia (Seoul)** (Монголоос хамгийн ойр)
3. Database password-ыг найдвартай газар хадгал

### 2. Schema ажиллуулах

1. Supabase Dashboard → **SQL Editor** → **+ New query**
2. `supabase/schema.sql` файлын агуулгыг бүхэлд нь хуулж paste
3. **Run** дарна
4. `profiles`, `listings`, `categories`, `car_marks` table үүссэн эсэхийг Table Editor-с шалгана

### 3. Phone Auth (Twilio) тохируулах

1. https://www.twilio.com/ дээр бүртгүүлж Account SID, Auth Token, Twilio phone number авна
2. Supabase Dashboard → **Authentication → Providers → Phone**
3. **Enable Phone provider**
4. SMS provider: **Twilio** сонгож credential оруулна
5. Message template-д Монгол хэлээр тохируулж болно:
   ```
   Celbeg.mn — Таны OTP код: {{ .Code }}
   ```

### 4. Storage bucket

`schema.sql` дотор `listing-images` bucket-ыг public-ээр үүсгэдэг. Дараах зүйлийг шалгана:
- Dashboard → **Storage** → `listing-images` харагдаж байгаа эсэх
- **Public bucket** болсон эсэх (баруун талын Settings)

### 5. API credentials-ыг код руу оруулах

`js/supabase-client.js`-г нээж:

```js
const SUPABASE_URL      = 'https://XXXXXXXX.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';

const ADMIN_PHONES = [
  '99112233',   // Өөрийн утасны дугаар
];
```

- **URL & anon key** — Dashboard → Settings → API
- **ADMIN_PHONES** — 8 оронтой (+976 гүй) дугаарууд. Эдгээр дугаараар нэвтэрсэн бүртгэлд автоматаар `is_admin=true` онооно

### 6. Netlify руу deploy хийх

1. https://app.netlify.com/ → **Add new site → Import from Git**
2. Repository сонгож import
3. `netlify.toml` автоматаар уншигдаж, `publish = "."` болно
4. Deploy амжилттай болмогц:
   - Site settings → **Domain management** → `celbeg.mn` custom domain нэмнэ
   - DNS-ийн A record эсвэл CNAME-ыг Netlify-н өгсөн утга руу заана
   - HTTPS автоматаар үүснэ

### 7. Эхний туршилт

1. Site нээгээд утсаараа бүртгүүлнэ
2. Console-д `DEMO горим` warning гарахгүй байх ёстой
3. Зар нийтэлж, зураг оруулж, admin panel-с ангилал нэмэх
4. Өөр browser эсвэл incognito-с нэвтрэн зар харагдаж байгаа эсэхийг шалга

## Development (local)

```bash
# Ямар нэг static server хангалттай
python -m http.server 8000
# эсвэл
npx serve
```

`SUPABASE_URL`-г placeholder-оор үлдээвэл автоматаар **DEMO горим**-д ажиллана — DB хэрэггүй.

## Дараагийн алхмууд (P1)

- Зар засах (edit) функц
- Report/гомдол систем
- Хадгалсан зар (favorites)
- Дэлгүүрийн профайл хуудас
- VIP төлбөр — QPay/SocialPay
- Мессеж/чат
- Үйлчилгээний нөхцөл, Нууцлалын бодлого

## Файлын бүтэц

```
celbeg-main/
├── index.html              — SPA-ийн үндсэн файл
├── css/style.css
├── img/
├── js/
│   ├── supabase-client.js  — Supabase config + demo data
│   ├── auth.js             — Phone OTP нэвтрэлт
│   ├── data-manager.js     — Ангилал, марк
│   ├── listings.js         — Зарын CRUD
│   ├── upload.js           — Зургийн upload
│   ├── admin.js            — Админ панел
│   └── main.js             — UI, navigation
├── supabase/
│   └── schema.sql          — DB migration
├── netlify.toml
├── robots.txt
└── sitemap.xml
```
