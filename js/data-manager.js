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
  { id:'cat-7', name:'Салон',           icon:'💺',  order:7 },
  { id:'cat-8', name:'Агаарын систем', icon:'❄️',  order:8 },
];

// ── Vehicle body-type ангилал (хатуу тодорхойлсон, DB-с уншдаггүй) ──
const VEHICLE_CATEGORIES = [
  { id:'vc-1', name:'Суудлын машин',   icon:'🚗', order:1 },
  { id:'vc-2', name:'SUV / Джийп',      icon:'🚙', order:2 },
  { id:'vc-3', name:'Пикап',            icon:'🛻', order:3 },
  { id:'vc-4', name:'Микроавтобус',    icon:'🚐', order:4 },
  { id:'vc-5', name:'Ачааны машин',    icon:'🚛', order:5 },
  { id:'vc-6', name:'Автобус',          icon:'🚌', order:6 },
  { id:'vc-7', name:'Хүнд механизм',   icon:'🚜', order:7 },
  { id:'vc-8', name:'Мотоцикл',         icon:'🏍️', order:8 },
  { id:'vc-9', name:'Дугуй / Бусад',   icon:'🚲', order:9 },
];

function getVehicleCategories() {
  return [...VEHICLE_CATEGORIES];
}

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
// Sub-categories (parent_id set)
// ═══════════════════════════════════════════════════════════
function getMainCategories() {
  return getCategories()
    .filter(c => !c.parent_id)
    .sort((a,b) => (a.order || 0) - (b.order || 0));
}

function getSubcategoriesFor(parentName) {
  const parent = getCategories().find(c => c.name === parentName && !c.parent_id);
  if (!parent) return [];
  return getCategories()
    .filter(c => c.parent_id === parent.id)
    .sort((a,b) => (a.order || 0) - (b.order || 0));
}

// ═══════════════════════════════════════════════════════════
// POPULATE ALL DROPDOWNS + DYNAMIC UI ELEMENTS
// Call this after any change to categories or marks
// ═══════════════════════════════════════════════════════════
function populateAllDropdowns() {
  const cats  = getMainCategories();
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

  // ── Location select (post form) ───────────────────────────
  if (typeof LOCATIONS !== 'undefined') {
    document.querySelectorAll('[data-dropdown="location"]').forEach(sel => {
      const cur = sel.value;
      sel.innerHTML = '<option value="">Сонгоно уу</option>' +
        LOCATIONS.map(l => `<option value="${l.label}">${l.label}</option>`).join('');
      if (cur) sel.value = cur;
    });
  }

  // ── Mark checkboxes (search sidebar, multi-select) ────────
  const markWrap = document.getElementById('f-makes-wrap');
  if (markWrap) {
    const prev = new Set(Array.from(markWrap.querySelectorAll('input:checked')).map(i => i.value));
    markWrap.innerHTML = marks.map(m => `
      <label class="filter-check-item">
        <input type="checkbox" name="f-make-cb" value="${m}"${prev.has(m) ? ' checked' : ''} onchange="onFilterCheckboxChange()">
        <span class="check-label">${m}</span>
      </label>`).join('');
  }

  // ── Location checkboxes (search sidebar) ──────────────────
  const locWrap = document.getElementById('f-locations-wrap');
  if (locWrap && typeof LOCATIONS !== 'undefined') {
    const prev = new Set(Array.from(locWrap.querySelectorAll('input:checked')).map(i => i.value));
    locWrap.innerHTML = LOCATIONS.map(l => `
      <label class="filter-check-item">
        <input type="checkbox" name="f-loc-cb" value="${l.key}"${prev.has(l.key) ? ' checked' : ''} onchange="onFilterCheckboxChange()">
        <span class="check-label">${l.label}</span>
      </label>`).join('');
  }

  // ── Category nav bar + grid (listing_type-с хамаарна) ───
  populateCategoryNavAndGrid();

  // ── Vehicle body-type select on post form ─────────────────
  const vBody = document.getElementById('v-body-type');
  if (vBody) {
    const cur = vBody.value;
    vBody.innerHTML = '<option value="">Сонгоно уу</option>' +
      VEHICLE_CATEGORIES.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
    if (cur) vBody.value = cur;
  }
}

function populateCategoryNavAndGrid() {
  const isVehicle = (typeof _listingTypeNav !== 'undefined' && _listingTypeNav === 'vehicle');
  const source = isVehicle
    ? getVehicleCategories()
    : getMainCategories();

  const catNav = document.getElementById('cat-nav-inner');
  if (catNav) {
    catNav.innerHTML =
      `<button class="cat-nav-btn active" data-cat="" onclick="selectCatNav(this,'')">Бүгд</button>` +
      source.map(c =>
        `<button class="cat-nav-btn" data-cat="${c.name}" onclick="selectCatNav(this,'${c.name}')">${c.icon} ${c.name}</button>`
      ).join('');
  }

  const catGrid = document.getElementById('home-cat-grid');
  if (catGrid) {
    catGrid.innerHTML = source.map(c =>
      `<div class="cat-card" onclick="goSearchCat('${c.name}')">
        <div class="cat-icon">${c.icon}</div>
        <div class="cat-name">${c.name}</div>
      </div>`
    ).join('');
  }

  // Also swap the search sidebar category dropdown
  document.querySelectorAll('[data-dropdown="category"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Бүгд ангилал</option>' +
      source.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
    if (cur && source.some(s => s.name === cur)) sel.value = cur;
    else sel.value = '';
  });
}
