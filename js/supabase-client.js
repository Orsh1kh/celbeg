// ═══════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ───────────────────────────────────────────────────────────
// 1. supabase.com дээр төсөл үүсгэнэ
// 2. Settings → API-с URL болон anon key-г хуулж доор оруулна
// 3. supabase/schema.sql-г SQL Editor-т нэг удаа ажиллуулна
// 4. Authentication → Providers → Phone → Twilio нэмнэ
// 5. Storage → Buckets → "listing-images" (public) шалгана
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

// ───────────────────────────────────────────────────────────
// ADMIN PHONES — 8 оронтой (+976 гүй) утасны дугаарууд.
// Эдгээр дугаараар нэвтэрсэн бүртгэлд is_admin=true оноогдоно.
// ───────────────────────────────────────────────────────────
const ADMIN_PHONES = [
  // '99112233',
];

// ───────────────────────────────────────────────────────────
// DEMO_MODE — Supabase тохируулаагүй үед автоматаар demo-д
// шилжинэ. Бодит production дээр false болно.
// ───────────────────────────────────────────────────────────
const DEMO_MODE =
  !SUPABASE_URL ||
  SUPABASE_URL.includes('YOUR_PROJECT') ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_ANON_KEY.includes('YOUR_ANON');

const sb = DEMO_MODE
  ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (DEMO_MODE) {
  console.warn(
    '%c[CELBEG.MN] DEMO горим идэвхтэй байна.',
    'color:#f80;font-weight:bold',
    '\nProduction-д гаргахын тулд js/supabase-client.js доторх ',
    'SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_PHONES-ыг тохируулна уу.'
  );
}

// ═══════════════════════════════════════════════════════════
// DEMO DATA — Supabase холбоогүй үед dropdown, зарын жишээ
// ═══════════════════════════════════════════════════════════
const DEMO_LISTINGS = [
  { id:'d1', title:'Тоормосны дэвсгэр (4ш)', price:45000, category:'Тоормос', car_make:'Toyota', car_model:'Camry', year_from:2018, year_to:2023, part_type:'original', shop_name:'Авто Плюс', location:'УБ, Сүхбаатар', images:[], created_at: new Date(Date.now()-3600000).toISOString(), is_vip:false, view_count:23, description:'Оригинал тоормосны дэвсгэр. Япон гарал. Шинэ бараа.' },
  { id:'d2', title:'Радиатор', price:180000, category:'Хөдөлгүүр', car_make:'Hyundai', car_model:'Tucson', year_from:2016, year_to:2021, part_type:'substitute', shop_name:'КарМастер', location:'УБ, Баянзүрх', images:[], created_at: new Date(Date.now()-7200000).toISOString(), is_vip:true, view_count:87, description:'Солих радиатор. Туршсан, бүрэн ажиллагаатай.' },
  { id:'d3', title:'Аккумулятор 60Ah', price:120000, category:'Цахилгаан', car_make:'Nissan', car_model:'X-Trail', year_from:2014, year_to:2020, part_type:'substitute', shop_name:'Нарийн Сэлбэг', location:'УБ, Хан-Уул', images:[], created_at: new Date(Date.now()-10800000).toISOString(), is_vip:false, view_count:41, description:'60Ah аккумулятор. Нэг жилийн баталгаа.' },
  { id:'d4', title:'Тоормосны диск', price:95000, category:'Тоормос', car_make:'BMW', car_model:'3 Series', year_from:2015, year_to:2022, part_type:'original', shop_name:'БМВ Сэлбэг', location:'УБ, Чингэлтэй', images:[], created_at: new Date(Date.now()-14400000).toISOString(), is_vip:true, view_count:134, description:'Оригинал BMW тоормосны диск. Германаас авчирсан.' },
  { id:'d5', title:'Дасгалжуулагч (амортизатор)', price:75000, category:'Тулгуур', car_make:'Lexus', car_model:'RX 350', year_from:2010, year_to:2015, part_type:'substitute', shop_name:'Авто Плюс', location:'УБ, Сүхбаатар', images:[], created_at: new Date(Date.now()-18000000).toISOString(), is_vip:false, view_count:19, description:'Урд амортизатор. Японы брэнд. 2ш байна.' },
  { id:'d6', title:'Мастил насос', price:55000, category:'Хөдөлгүүр', car_make:'Kia', car_model:'Sportage', year_from:2017, year_to:2023, part_type:'substitute', shop_name:'КарМастер', location:'УБ, Баянзүрх', images:[], created_at: new Date(Date.now()-21600000).toISOString(), is_vip:false, view_count:11, description:'Мастил насос. Шинэ. Баталгаатай.' },
  { id:'d7', title:'Хаалганы бариул (гадна)', price:18000, category:'Гадна', car_make:'Toyota', car_model:'Prius', year_from:2016, year_to:2020, part_type:'substitute', shop_name:'Нарийн Сэлбэг', location:'УБ, Хан-Уул', images:[], created_at: new Date(Date.now()-25200000).toISOString(), is_vip:false, view_count:7, description:'Хаалганы гадна бариул. Өнгөтэй сонголт байна.' },
  { id:'d8', title:'Дугуй 215/65 R17', price:220000, category:'Дугуй & Диск', car_make:'Бусад', car_model:'', year_from:2000, year_to:2024, part_type:'substitute', shop_name:'ДугуйТун', location:'УБ, Сонгинохайрхан', images:[], created_at: new Date(Date.now()-28800000).toISOString(), is_vip:false, view_count:56, description:'4ш дугуй. 2022 оны. 80% зузаантай.' },
];
