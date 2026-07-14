// ═══════════════════════════════════════════════════════════
// DATA MANAGER — Categories & Car Marks
// ───────────────────────────────────────────────────────────
// • Supabase холбоотой үед бодит DB-с уншиж, localStorage-д cache
// • DEMO_MODE-д зөвхөн localStorage дээр ажиллана
// ═══════════════════════════════════════════════════════════

const DEFAULT_CATEGORIES = [
  { id:'cat-1', name:'Хөдөлгүүр',      icon:'⚙️',  order:1 },
  { id:'cat-2', name:'Тоормос',         icon:'🔴',  order:2 },
  { id:'cat-3', name:'Тулгуур',         icon:'🔧',  order:3 },
  { id:'cat-4', name:'Цахилгаан',       icon:'⚡',  order:4 },
  { id:'cat-5', name:'Гадна',           icon:'🚗',  order:5 },
  { id:'cat-6', name:'Дугуй & Диск',   icon:'🛞',  order:6 },
  { id:'cat-7', name:'Дотор',           icon:'💺',  order:7 },
  { id:'cat-8', name:'Агаарын систем', icon:'❄️',  order:8 },
];

const DEFAULT_MARKS = [
  'Acura','Audi','Baic','BAW','Bentley','Bestune','BMW','BYD',
  'Cadillac','Changan','Chery','Chevrolet','Daewoo','Daihatsu',
  'Dodge','Dongfeng','Fiat','Ford','Foton','GAC','Geely','GMC',
  'GWM Tank','Haval','Honda','Huawei','Hummer','Hyundai',
  'Infiniti','Isuzu','Jaguar','Jeep','Jetour','Kaiyi','Kia',
  'Lada','Land Rover','Lexus','Li Auto','Lincoln','Lynk & Co',
  'Mazda','Mercedes-Benz','MG','MINI','Mitsubishi','Nissan',
  'Opel','Porsche','Renault','Samsung','SsangYong','Subaru',
  'Suzuki','Tesla','Toyota','UAZ','Volkswagen','Volvo','Wuling',
  'Бусад'
];

// ── Sync read (from localStorage cache) ─────────────────────
function getCategories() {
  try {
    const raw = localStorage.getItem('cb_categories');
    return raw ? JSON.parse(raw) : [...DEFAULT_CATEGORIES];
  } catch { return [...DEFAULT_CATEGORIES]; }
}

function getMarks() {
  try {
    const raw = localStorage.getItem('cb_marks');
    return raw ? JSON.parse(raw) : [...DEFAULT_MARKS];
  } catch { return [...DEFAULT_MARKS]; }
}

// ── Write (cache + Supabase sync) ───────────────────────────
function saveCategories(cats) {
  localStorage.setItem('cb_categories', JSON.stringify(cats));
  _syncCategoriesToSupabase(cats);
}

function saveMarks(marks) {
  localStorage.setItem('cb_marks', JSON.stringify(marks));
  _syncMarksToSupabase(marks);
}

// ── Supabase sync (no-op in demo mode) ──────────────────────
async function _syncCategoriesToSupabase(cats) {
  if (DEMO_MODE || !sb) return;
  try {
    const rows = cats.map(c => ({
      id: c.id, name: c.name, icon: c.icon, order: c.order
    }));
    const { error } = await sb.from('categories').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) { console.warn('Category sync failed:', e.message); }
}

async function _syncMarksToSupabase(marks) {
  if (DEMO_MODE || !sb) return;
  try {
    const rows = marks.map((name, i) => ({ id: 'mark-' + i, name }));
    const { error } = await sb.from('car_marks').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) { console.warn('Mark sync failed:', e.message); }
}

// ── Init defaults if not yet cached ─────────────────────────
function initDataDefaults() {
  if (!localStorage.getItem('cb_categories')) {
    localStorage.setItem('cb_categories', JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem('cb_marks')) {
    localStorage.setItem('cb_marks', JSON.stringify(DEFAULT_MARKS));
  }
}

// ── Async load from Supabase (call after page init) ─────────
async function loadDataFromSupabase() {
  if (DEMO_MODE || !sb) return false;
  let refreshed = false;
  try {
    const { data: cats, error: catErr } = await sb
      .from('categories').select('*').order('order', { ascending: true });
    if (catErr) throw catErr;
    if (cats && cats.length) {
      localStorage.setItem('cb_categories', JSON.stringify(cats));
      refreshed = true;
    }
  } catch (e) { console.warn('Category load failed:', e.message); }

  try {
    const { data: marks, error: markErr } = await sb
      .from('car_marks').select('name').order('name', { ascending: true });
    if (markErr) throw markErr;
    if (marks && marks.length) {
      // Бусад-ыг сүүлд байрлуулна
      const names = marks.map(m => m.name).filter(n => n !== 'Бусад');
      if (marks.some(m => m.name === 'Бусад')) names.push('Бусад');
      localStorage.setItem('cb_marks', JSON.stringify(names));
      refreshed = true;
    }
  } catch (e) { console.warn('Mark load failed:', e.message); }

  return refreshed;
}

// ═══════════════════════════════════════════════════════════
// POPULATE ALL DROPDOWNS + DYNAMIC UI ELEMENTS
// Call this after any change to categories or marks
// ═══════════════════════════════════════════════════════════
function populateAllDropdowns() {
  const cats  = getCategories().sort((a,b) => a.order - b.order);
  const marks = getMarks();

  // ── Category selects ──────────────────────────────────────
  document.querySelectorAll('[data-dropdown="category"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Бүгд ангилал</option>' +
      cats.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
    if (cur) sel.value = cur;
  });

  // ── Post form category (has required placeholder) ────────
  document.querySelectorAll('[data-dropdown="category-req"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Сонгоно уу</option>' +
      cats.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
    if (cur) sel.value = cur;
  });

  // ── Mark selects ──────────────────────────────────────────
  document.querySelectorAll('[data-dropdown="mark"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Бүгд марк</option>' +
      marks.map(m => `<option value="${m}">${m}</option>`).join('');
    if (cur) sel.value = cur;
  });

  // ── Mark selects (required) ───────────────────────────────
  document.querySelectorAll('[data-dropdown="mark-req"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Сонгоно уу</option>' +
      marks.map(m => `<option value="${m}">${m}</option>`).join('');
    if (cur) sel.value = cur;
  });

  // ── Category nav bar ──────────────────────────────────────
  const catNav = document.getElementById('cat-nav-inner');
  if (catNav) {
    catNav.innerHTML =
      `<button class="cat-nav-btn active" data-cat="" onclick="selectCatNav(this,'')">Бүгд</button>` +
      cats.map(c =>
        `<button class="cat-nav-btn" data-cat="${c.name}" onclick="selectCatNav(this,'${c.name}')">${c.icon} ${c.name}</button>`
      ).join('');
  }

  // ── Category grid (home page) ────────────────────────────
  const catGrid = document.getElementById('home-cat-grid');
  if (catGrid) {
    catGrid.innerHTML = cats.map(c =>
      `<div class="cat-card" onclick="goSearchCat('${c.name}')">
        <div class="cat-icon">${c.icon}</div>
        <div class="cat-name">${c.name}</div>
      </div>`
    ).join('');
  }
}
