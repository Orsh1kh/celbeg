// ═══════════════════════════════════════════════════════════
// CELBEG.MN — Main App
// ═══════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────
let _homePage   = 0;
let _searchPage = 0;
let _searchFilters = {};
let _currentListing = null;
let _currentListingImages = [];
let _currentShopId = null;
let _homeTotalCount   = 0;
let _searchTotalCount = 0;
let _listingTypeNav   = 'part';  // 'part' | 'vehicle'
let _favoriteIds      = new Set();

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
// opts.fromHistory: "Буцах/Урагшлах" товчоос ирсэн бол URL-д дахин бичихгүй
// opts.edit: зар засахаар нээж байна (startEditListing)
// opts.replace: history-д шинэ мөр нэмэхгүй, одоогийнхыг солино
function showPage(id, opts = {}) {
  if (!ROUTE_PAGES.has(id)) id = 'home';
  if (id === 'post' && !opts.fromHistory && !opts.edit) _editListingId = null;
  // Зар нээлттэй байхад өөр хуудас руу шилжвэл зарыг нууна.
  // History-д зарын мөр үлдэх тул "Буцах" дарахад зар дахин нээгдэнэ.
  if (!opts.fromHistory && isDetailOpen()) _hideDetail();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  closeMobileNav();
  if (!opts.fromHistory) _routePageShown(id, opts.replace);

  if (id === 'home')    initHomePage();
  if (id === 'search')  initSearchPage();
  if (id === 'profile') initProfilePage();
  if (id === 'post')    initPostPage();
  if (id === 'admin')   initAdminPage();
  if (id === 'shop')    initShopPage();
  if (id === 'shops')   initShopsPage();
}

// ── Mobile nav ─────────────────────────────────────────────
function toggleMobileNav() {
  const open = document.getElementById('mobile-nav').classList.toggle('open');
  document.getElementById('mobile-overlay').classList.toggle('open', open);
  open ? routeOverlayOpened('nav') : routeOverlayClosed('nav');
}
function closeMobileNav() {
  const wasOpen = _isOpen('mobile-nav');
  document.getElementById('mobile-nav').classList.remove('open');
  document.getElementById('mobile-overlay').classList.remove('open');
  if (wasOpen) routeOverlayClosed('nav');
}

// ═══════════════════════════════════════════════════════════
// ROUTER — хуудас бүр, зар бүр өөрийн URL-тай.
// Утасны "Буцах" товч эхлээд нээлттэй цонхыг хааж, дараа нь өмнөх хуудас руу буцна.
//   /                   → нүүр
//   /?p=search          → хуудас
//   /?p=shop&id=<uuid>  → дэлгүүр
//   /?p=post&id=<uuid>  → зар засах
//   ...&zar=<id>        → зарын дэлгэрэнгүй (энэ линкийг хуваалцаж болно)
// history.state = { p, id, zar, ov: [нээлттэй цонхнууд], pushed }
//   pushed=false нь сайтад орж ирсэн анхны мөр — түүнээс цааш back хийхгүй.
// ═══════════════════════════════════════════════════════════
const ROUTE_PAGES = new Set(['home','search','post','shops','shop','profile','admin','terms','privacy']);
const ROUTE_ID_RE = /^[A-Za-z0-9-]{1,64}$/;
const BASE_TITLE  = document.title;

// "Буцах" товчоор хаагдах цонхнууд
const ROUTE_OVERLAYS = {
  nav:      { isOpen: () => _isOpen('mobile-nav'),     close: () => closeMobileNav() },
  auth:     { isOpen: () => _isOpen('modal-auth'),     close: () => closeAuthModal() },
  report:   { isOpen: () => _isOpen('modal-report'),   close: () => closeReportModal() },
  review:   { isOpen: () => _isOpen('modal-review'),   close: () => closeReviewModal() },
  lightbox: { isOpen: () => _isOpen('modal-lightbox'), close: () => closeLightbox() },
};
function _isOpen(id) { return !!document.getElementById(id)?.classList.contains('open'); }
function isDetailOpen() { return _isOpen('modal-detail'); }

function _routeUrl(st) {
  const q = new URLSearchParams();
  if (st.p && st.p !== 'home') q.set('p', st.p);
  if ((st.p === 'shop' || st.p === 'post') && st.id) q.set('id', st.id);
  if (st.zar) q.set('zar', st.zar);
  const s = q.toString();
  return location.pathname + (s ? '?' + s : '');
}
function _routeWrite(st, replace) {
  history[replace ? 'replaceState' : 'pushState'](st, '', _routeUrl(st));
}

function parseRouteUrl() {
  const q = new URLSearchParams(location.search);
  // Хуучин ?action=post (manifest shortcut) хэлбэрийг дэмжинэ
  const legacy = { post: 'post', shops: 'shops', search: 'search', profile: 'profile' }[q.get('action')];
  let p = legacy || q.get('p') || 'home';
  if (!ROUTE_PAGES.has(p)) p = 'home';
  const id  = q.get('id'),  zar = q.get('zar');
  const st = {
    p,
    id:  (p === 'shop' || p === 'post') && ROUTE_ID_RE.test(id || '') ? id : undefined,
    zar: ROUTE_ID_RE.test(zar || '') ? zar : undefined,
    ov: [], pushed: false,
  };
  if (st.p === 'shop' && !st.id) st.p = 'home';
  return st;
}

// ── History үйлдлийг дараалуулна ─────────────────────────
// history.back() асинхрон: дараагийн push-ийг popstate ирсний дараа хийнэ,
// эс бөгөөс шинэ мөр буруу байранд орно.
const _routeQueue = [];
let _routing = false;           // popstate-оос UI шинэчилж байх үед history-д бичихгүй
let _routeWaitingBack = false;
let _routeBackTimer = null;

function _routeEnqueue(op) {
  if (_routing) return;
  _routeQueue.push(op);
  _routeFlush();
}
function _routeFlush() {
  while (_routeQueue.length && !_routeWaitingBack) {
    const op = _routeQueue.shift();
    if (op(history.state || {}) === 'back') {
      _routeWaitingBack = true;
      history.back();
      _routeBackTimer = setTimeout(_routeBackDone, 1000);   // popstate ирэхгүй бол гацахгүй
    }
  }
}
function _routeBackDone() {
  clearTimeout(_routeBackTimer);
  _routeWaitingBack = false;
  _routeFlush();
}

window.addEventListener('popstate', e => {
  if (_routeWaitingBack) { _routeBackDone(); return; }   // өөрсдийн хийсэн back — UI аль хэдийн шинэчлэгдсэн
  _routing = true;
  try { applyRoute(e.state || parseRouteUrl()); }
  finally { _routing = false; }
});

// Хэрэглэгч Буцах/Урагшлах дарахад URL-д тааруулж UI-г шинэчилнэ
function applyRoute(st) {
  const keep = new Set(st.ov || []);
  for (const [name, o] of Object.entries(ROUTE_OVERLAYS)) {
    if (!keep.has(name) && o.isOpen()) o.close();
  }
  if (!st.zar && isDetailOpen()) _hideDetail();
  const page = ROUTE_PAGES.has(st.p) ? st.p : 'home';
  const cur  = document.querySelector('.page.active')?.id.replace('page-', '');
  const want = st.id || null;
  if (page !== cur
      || (page === 'shop' && want !== _currentShopId)
      || (page === 'post' && want !== _editListingId)) {
    if (page === 'shop') _currentShopId = want;
    if (page === 'post') _editListingId = want;
    showPage(page, { fromHistory: true });
  }
  if (st.zar && (!isDetailOpen() || String(_currentListing?.id) !== String(st.zar))) {
    openDetail(st.zar, { fromHistory: true });
  }
}

function routeOverlayOpened(name) {
  _routeEnqueue(st => {
    const ov = st.ov || [];
    if (ov[ov.length - 1] === name) return;
    _routeWrite({ ...st, ov: [...ov, name], pushed: true });
  });
}
function routeOverlayClosed(name) {
  _routeEnqueue(st => {
    const ov = st.ov || [];
    if (ov[ov.length - 1] === name) return 'back';
    if (ov.includes(name)) _routeWrite({ ...st, ov: ov.filter(n => n !== name) }, true);
  });
}

function _routePageShown(id, replace = false) {
  const pid  = id === 'shop' ? _currentShopId : id === 'post' ? _editListingId : null;
  const next = { p: id, id: pid || undefined, ov: [], pushed: true };
  _routeEnqueue(st => {
    if ((st.p || 'home') === next.p && st.id === next.id && !st.zar && !(st.ov || []).length) return;
    if (replace) next.pushed = !!st.pushed;
    _routeWrite(next, replace);
  });
}
function _routeDetailOpened(id) {
  _routeEnqueue(st => {
    if (String(st.zar) === String(id)) return;
    // Нэг зараас нөгөө рүү шилжвэл мөрийг сольж бичнэ (pushed хэвээр)
    _routeWrite({ p: st.p || 'home', id: st.id, zar: String(id), ov: [], pushed: st.zar ? !!st.pushed : true }, !!st.zar);
  });
}
function _routeDetailClosed() {
  _routeEnqueue(st => {
    if (!st.zar) return;
    if (st.pushed) return 'back';
    _routeWrite({ ...st, zar: undefined }, true);   // линкээр шууд орж ирсэн — сайтаас гаргахгүй
  });
}

// Хуудас ачаалахад URL-ыг уншиж тохирох хуудас/зарыг нээнэ
function routeInit() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const st = parseRouteUrl();
  _routeWrite(st, true);
  if (st.p === 'shop') _currentShopId = st.id;
  if (st.p === 'post') _editListingId = st.id || null;
  showPage(st.p, { fromHistory: true });
  if (st.zar) openDetail(st.zar, { fromHistory: true });
}

// ── Listing type nav (Part / Vehicle) ─────────────────────
function selectListingTypeNav(t) {
  _listingTypeNav = t;
  document.querySelectorAll('.type-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lt === t)
  );
  // Category nav + grid + sidebar dropdown-г source-оор нь сольж бөглөнө
  populateCategoryNavAndGrid();
  if (_searchFilters.category) delete _searchFilters.category;
  const priceMin = document.getElementById('f-price-min');
  const priceMax = document.getElementById('f-price-max');
  if (priceMin) priceMin.value = '';
  if (priceMax) priceMax.value = '';
  syncSearchTypeUI();
  syncTypeTexts();
  // Солигдсоныг анзаарагдахуйц зөөлөн шилжилт
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('main')?.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  }
  // Home page-т байвал шинэчилнэ, эсрэг тохиолдолд Search руу
  const activePage = document.querySelector('.page.active')?.id;
  if (activePage === 'page-home')       initHomePage();
  else if (activePage === 'page-search') { _searchPage = 0; loadSearchResults(true); }
  else showPage('home');
}

// Сэлбэг / Машин сонголтод тааруулж өнгө (CSS: html[data-mode]), нүүрний гарчиг,
// хайлтын бичвэрийг солино. Машин хэсэг цэнхэр, сэлбэг улаан.
const TYPE_TEXTS = {
  part: {
    title: 'АВТО СЭЛБЭГИЙН <span>ЗАХ</span>',
    sub:   'Монголын хамгийн том авто сэлбэгийн зах зээл',
    kw:    'Сэлбэгийн нэр...',
    head:  'Сэлбэг хайх...',
  },
  vehicle: {
    title: 'АВТО МАШИНЫ <span>ЗАХ</span>',
    sub:   'Шинэ, хуучин машинаа хялбар зарж, худалдан аваарай',
    kw:    'Түлхүүр үг...',
    head:  'Машин хайх...',
  },
};
function syncTypeTexts() {
  const t = TYPE_TEXTS[_listingTypeNav] || TYPE_TEXTS.part;
  document.documentElement.dataset.mode = _listingTypeNav === 'vehicle' ? 'vehicle' : 'part';
  fillHeroVehicleOptions();
  document.getElementById('hero-title').innerHTML = t.title;
  document.getElementById('hero-sub').textContent = t.sub;
  document.getElementById('hero-keyword').placeholder = t.kw;
  document.getElementById('header-search-input').placeholder = t.head;
}

// Машины нүүр хайлт: "Он (хэдээс)", "Үнэ (хүртэл)" сонголтууд
const HERO_VEHICLE_PRICES = [10, 15, 20, 30, 40, 50, 70, 100, 150, 200].map(m => m * 1000000);
function fillHeroVehicleOptions() {
  const yearSel  = document.getElementById('hero-year');
  const priceSel = document.getElementById('hero-price');
  if (yearSel && yearSel.options.length <= 1) {
    for (let y = new Date().getFullYear(); y >= YEAR_FIRST; y--) yearSel.add(new Option(`${y} оноос хойш`, y));
  }
  if (priceSel && priceSel.options.length <= 1) {
    HERO_VEHICLE_PRICES.forEach(p => priceSel.add(new Option(`${formatPriceShort(p)} хүртэл`, p)));
  }
}

function goSearchCat(cat) {
  _searchFilters = { category: cat };
  _searchPage = 0;
  showPage('search');
  document.getElementById('f-category').value = cat;
  loadSearchResults(true);
}

// ═══════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('cb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-btn').textContent = saved === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cb_theme', next);
  document.getElementById('theme-btn').textContent = next === 'dark' ? '🌙' : '☀️';
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ═══════════════════════════════════════════════════════════
// SCROLL TOP
// ═══════════════════════════════════════════════════════════
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  btn.classList.toggle('visible', window.scrollY > 320);
});

// ═══════════════════════════════════════════════════════════
// AUTH UI
// ═══════════════════════════════════════════════════════════
function openAuthModal(tab) {
  document.getElementById('modal-auth').classList.add('open');
  switchAuthTab(tab || 'login');
  routeOverlayOpened('auth');
}
function closeAuthModal() {
  const wasOpen = _isOpen('modal-auth');
  document.getElementById('modal-auth').classList.remove('open');
  resetAuthForms();
  if (wasOpen) routeOverlayClosed('auth');
}
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-' + tab).classList.add('active');
}
function resetAuthForms() {
  ['login-email','login-password','reg-name','reg-email','reg-password','reg-shop'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('.form-error').forEach(e => { e.textContent=''; e.classList.remove('show'); });
}

// Show/hide shop name field on register
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[name="reg-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const shopWrap = document.getElementById('reg-shop-wrap');
      shopWrap.style.display = radio.value === 'shop' ? 'block' : 'none';
    });
  });
});

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}

// ── Email/password helpers ─────────────────────────────────
function _isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

// ── Submit login ────────────────────────────────────────────
async function submitLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  let valid = true;
  if (!_isEmail(email)) { showFieldError('login-email-err', 'Зөв email оруулна уу'); valid=false; }
  if (!pass || pass.length < 6) { showFieldError('login-password-err', 'Нууц үг 6+ тэмдэгт'); valid=false; }
  if (!valid) return;

  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true; btn.textContent = 'Нэвтэрч байна...';
  try {
    await authLogin(email, pass);
    updateAuthUI(authGetUser());
    await initFavorites();
    closeAuthModal();
    showToast('Амжилттай нэвтэрлээ!', 'success');
  } catch(e) {
    showFieldError('login-password-err', _friendlyAuthError(e.message));
  } finally {
    btn.disabled = false; btn.textContent = 'Нэвтрэх';
  }
}

// ── Submit register ─────────────────────────────────────────
async function submitRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  const userType = document.querySelector('input[name="reg-type"]:checked')?.value || 'buyer';
  const shopName = document.getElementById('reg-shop')?.value.trim() || '';
  let valid = true;
  if (!name)             { showFieldError('reg-name-err',     'Нэр оруулна уу'); valid=false; }
  if (!_isEmail(email))  { showFieldError('reg-email-err',    'Зөв email оруулна уу'); valid=false; }
  if (!pass || pass.length < 6) { showFieldError('reg-password-err', 'Нууц үг 6+ тэмдэгт'); valid=false; }
  const consent = document.getElementById('reg-consent');
  if (consent && !consent.checked) { showFieldError('reg-consent-err', 'Үйлчилгээний нөхцөлийг зөвшөөрнө үү'); valid=false; }
  else showFieldError('reg-consent-err', '');
  if (!valid) return;

  const btn = document.getElementById('reg-submit-btn');
  btn.disabled = true; btn.textContent = 'Бүртгэж байна...';
  try {
    await authRegister(email, pass, name, userType, shopName);
    // Signup session өгөөгүй үед л нэвтрэлт оролдоно (нэр/төрлийг дарж бичихгүйн тулд)
    if (!authGetUser()) { try { await authLogin(email, pass); } catch {} }
    const user = authGetUser();
    if (!user) {
      // Supabase-т "Confirm email" асаалттай байна
      showFieldError('reg-email-err', 'Бүртгэл үүслээ. Email-ээ шалгаж баталгаажуулаад нэвтэрнэ үү.');
      return;
    }
    updateAuthUI(user);
    await initFavorites();
    closeAuthModal();
    showToast('Амжилттай бүртгүүллээ!', 'success');
  } catch(e) {
    showFieldError('reg-email-err', _friendlyAuthError(e.message));
  } finally {
    btn.disabled = false; btn.textContent = 'Бүртгүүлэх';
  }
}

function _friendlyAuthError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email эсвэл нууц үг буруу байна';
  if (m.includes('already registered') || m.includes('already exists')) return 'Энэ email аль хэдийн бүртгэгдсэн';
  if (m.includes('email not confirmed')) return 'Email-ээ баталгаажуулна уу (эсвэл админ email confirm-г идэвхгүй болгосон эсэхийг шалгана)';
  if (m.includes('password')) return 'Нууц үг: ' + msg;
  return msg;
}

// ── Auth UI state ───────────────────────────────────────────
function updateAuthUI(user) {
  const guestBtns = document.getElementById('guest-btns');
  const userBtns  = document.getElementById('user-btns');
  const mobAuth   = document.getElementById('mob-auth-area');
  const mobUser   = document.getElementById('mob-user-area');

  if (user) {
    const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
    const displayName = user.name || user.email || 'Хэрэглэгч';

    guestBtns.style.display = 'none';
    userBtns.style.display  = 'flex';
    document.getElementById('user-avatar-char').textContent  = initial;
    document.getElementById('user-display-name').textContent = displayName;

    mobAuth.style.display = 'none';
    mobUser.style.display = 'block';
    document.getElementById('mob-user-name').textContent = '👤 ' + displayName;

    // Show admin link ONLY for admin users
    const adminHeaderLink = document.getElementById('admin-header-link');
    const mobAdminLink    = document.getElementById('mob-admin-link');
    if (user.is_admin) {
      if (adminHeaderLink) adminHeaderLink.style.display = 'inline-flex';
      if (mobAdminLink)    mobAdminLink.classList.add('visible');
    } else {
      if (adminHeaderLink) adminHeaderLink.style.display = 'none';
      if (mobAdminLink)    mobAdminLink.classList.remove('visible');
    }
  } else {
    guestBtns.style.display = 'flex';
    userBtns.style.display  = 'none';
    mobAuth.style.display   = 'block';
    mobUser.style.display   = 'none';

    const adminHeaderLink = document.getElementById('admin-header-link');
    const mobAdminLink    = document.getElementById('mob-admin-link');
    if (adminHeaderLink) adminHeaderLink.style.display = 'none';
    if (mobAdminLink)    mobAdminLink.classList.remove('visible');
  }
}

async function doLogout() {
  await authLogout();
  _favoriteIds = new Set();
  updateAuthUI(null);
  showToast('Гарлаа', 'info');
  showPage('home');
}

// ═══════════════════════════════════════════════════════════
// LISTING CARD BUILDER
// ═══════════════════════════════════════════════════════════
function buildListingCard(l) {
  const img = l.images?.[0]
    ? cardImg(l.images[0], l.title)
    : `<div class="card-img-placeholder"><span>📦</span><small>Зураг байхгүй</small></div>`;

  const badgeClass = l.part_type === 'original' ? 'original' : 'substitute';
  const badgeText  = l.part_type === 'original' ? 'Оригинал' : 'Орлуулах';
  const vipTag     = l.is_vip ? '<div class="card-vip-tag">VIP</div>' : '';
  const policy     = policyMeta(l.exchange_policy);
  const policyTag  = policy ? `<div class="card-policy ${l.exchange_policy}">${policy.short}</div>` : '';
  const verified   = l.is_verified ? '<span class="verified-badge" title="Баталгаажсан дэлгүүр"></span>' : '';
  const photoCount = (l.images?.length > 1)
    ? `<div class="card-photo-counter">1 / ${l.images.length}</div>`
    : '';
  const isFav = _favoriteIds.has(l.id);
  const favBtn = `<button class="card-fav-btn${isFav ? ' active' : ''}" onclick="event.stopPropagation();doToggleFavorite('${l.id}', this)" title="Хадгалах" aria-label="Хадгалах">${isFav ? '❤' : '♡'}</button>`;

  const yearTxt = (l.year_from && l.year_to)
    ? (l.year_from === l.year_to ? `${l.year_from}` : `${l.year_from}–${l.year_to}`)
    : (l.year_from ? `${l.year_from}` : '');
  const cond = conditionMeta(l.condition);
  const condBadge = cond ? `<span class="condition-badge ${l.condition}">${cond.short}</span>` : '';
  const isVehicle = l.listing_type === 'vehicle';
  const vehicleTag = isVehicle ? '<div class="card-vehicle-tag">🚗 Машин</div>' : '';
  const carMeta = [l.car_make, l.car_model, yearTxt].filter(Boolean).join(' ');
  const v = l.vehicle;
  const vMeta = (isVehicle && v)
    ? [
        v.fuel_type ? `⛽ ${FILTER_LABELS['f-fuel'][v.fuel_type] || v.fuel_type}` : '',
        v.mileage_km ? `🛣 ${Number(v.mileage_km).toLocaleString('mn-MN')} км` : '',
        v.transmission ? FILTER_LABELS['f-trans'][v.transmission] || '' : '',
      ].filter(Boolean).map(s => `<span>${s}</span>`).join('')
    : '';

  const shopClickable = l.user_id && l.shop_name
    ? `class="card-shop clickable" onclick="event.stopPropagation();openShop('${l.user_id}')"`
    : 'class="card-shop"';

  return `
    <div class="listing-card${l.is_vip ? ' vip-card' : ''}${isVehicle ? ' vehicle-card' : ''}" onclick="openDetail('${l.id}')">
      <div class="card-img">
        ${img}
        ${isVehicle ? vehicleTag : `<div class="card-badge ${badgeClass}">${badgeText}</div>`}
        ${photoCount}
        ${vipTag}
        ${isVehicle ? '' : policyTag}
        ${favBtn}
      </div>
      <div class="card-body">
        <div class="card-price">${formatPriceShort(l.price)}</div>
        <div class="card-title">${escapeHtml(l.title)}</div>
        <div class="card-meta">${escapeHtml(carMeta || l.category || '')}${isVehicle ? '' : condBadge}</div>
        ${vMeta ? `<div class="card-vmeta">${vMeta}</div>` : ''}
        <div class="card-footer">
          <span ${shopClickable}>${isVehicle ? '👤' : '🏪'} ${escapeHtml(l.shop_name || 'Хувь хүн')}${verified}</span>
          <span class="card-date">${formatDate(l.created_at)}</span>
        </div>
      </div>
    </div>`;
}

// ── Condition metadata ───────────────────────────────────
function conditionMeta(cond) {
  const map = {
    new:          { short: '✨ Шинэ',          cls: 'cond_new' },
    used:         { short: '👌 Ашиглагдсан',   cls: 'cond_used' },
    refurbished:  { short: '🔧 Засварласан',   cls: 'cond_refurbished' },
    damaged:      { short: '⚠️ Гэмтэлтэй',     cls: 'cond_damaged' },
  };
  return map[cond] || null;
}

// ── Policy metadata ───────────────────────────────────────
function policyMeta(policy) {
  const map = {
    return_ok:   { short: '🟢 Буцаана',      long: 'Тохирохгүй бол буцаана',  cls: 'policy_return_ok' },
    defect_only: { short: '🟡 Гэмтэлтэй бол', long: 'Гэмтэлтэй бол буцаана',   cls: 'policy_defect_only' },
    no_return:   { short: '🔴 Буцаахгүй',    long: 'Худалдсан, худалдсан',    cls: 'policy_no_return' },
  };
  return map[policy] || null;
}

// ── Expiry helpers ────────────────────────────────────────
function expiryTag(expiresAt) {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '<span class="expiry-tag expired">⏰ Хугацаа дууссан</span>';
  const days = Math.floor(ms / (24*3600*1000));
  const hours = Math.floor(ms / (3600*1000));
  const cls = days >= 3 ? 'ok' : days >= 1 ? 'warning' : 'danger';
  const txt = days >= 1 ? `${days} хоног үлдсэн` : `${hours} цаг үлдсэн`;
  return `<span class="expiry-tag ${cls}">⏱ ${txt}</span>`;
}

function renderGrid(listings, containerId, opts = {}) {
  const el = document.getElementById(containerId);
  if (!listings.length) {
    el.innerHTML = renderEmptyState(opts.emptyType || 'search');
    return;
  }
  el.innerHTML = `<div class="listing-grid">${listings.map(buildListingCard).join('')}</div>`;
}

// ── Skeleton loader ────────────────────────────────────
function renderSkeletons(containerId, count = 8) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const card = `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line price"></div>
        <div class="skeleton skeleton-line title"></div>
        <div class="skeleton skeleton-line meta"></div>
        <div class="skeleton skeleton-line footer"></div>
      </div>
    </div>`;
  el.innerHTML = `<div class="skeleton-grid">${card.repeat(count)}</div>`;
}

// ── Empty state templates ──────────────────────────────
function renderEmptyState(type) {
  const templates = {
    search: {
      icon: '🔍',
      title: 'Зар олдсонгүй',
      msg: 'Таны хайлтад тохирсон зар одоогоор байхгүй байна. Шүүлтээ өөрчилж дахин үзнэ үү.',
      cta: 'Шүүлт цэвэрлэх',
      action: "resetFilters()"
    },
    home: {
      icon: '📦',
      title: 'Одоогоор зар байхгүй',
      msg: 'Эхний зарыг нийтэлж зах зээлээ нээцгээе!',
      cta: '+ Эхний зар нийтлэх',
      action: "showPage('post')"
    },
    myListings: {
      icon: '📭',
      title: 'Та зар нийтлээгүй байна',
      msg: 'Худалдах сэлбэг байгаа бол дэлгэрэнгүй мэдээлэлтэйгээр нийтэлж эхлээрэй.',
      cta: '+ Зар нийтлэх',
      action: "showPage('post')"
    },
    error: {
      icon: '⚠️',
      title: 'Алдаа гарлаа',
      msg: 'Мэдээлэл ачаалахад асуудал үүслээ. Дараа дахин оролдоно уу.',
      cta: 'Дахин ачаалах',
      action: 'location.reload()'
    }
  };
  const t = templates[type] || templates.search;
  return `
    <div class="no-results">
      <div class="no-icon">${t.icon}</div>
      <h3>${t.title}</h3>
      <p>${t.msg}</p>
      ${t.cta ? `<div class="no-cta" onclick="${t.action}">${t.cta}</div>` : ''}
    </div>`;
}

// ── Header search UX ───────────────────────────────────
function toggleHeaderSearchClear() {
  const input = document.getElementById('header-search-input');
  const clear = document.getElementById('header-search-clear');
  if (clear) clear.classList.toggle('visible', input.value.length > 0);
}
function clearHeaderSearch() {
  const input = document.getElementById('header-search-input');
  if (input) { input.value = ''; input.focus(); }
  toggleHeaderSearchClear();
}

// ── Filter count badge ─────────────────────────────────
function updateFilterCountBadge() {
  const badge = document.getElementById('filter-count-badge');
  if (!badge) return;
  const f = getFilters();
  let count = 0;
  ['subcategory','car_model','steering','mileage_max'].forEach(k => { if (f[k]) count++; });
  if (f.year_from || f.year_to)   count++;
  if (f.price_min || f.price_max) count++;
  ['car_makes','locations','part_type','condition','exchange_policy','fuel_type','transmission','drive']
    .forEach(k => { count += (f[k] || []).length; });
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
  const mob = document.getElementById('mobile-filter-count');
  if (mob) {
    mob.textContent = count || '';
    mob.setAttribute('data-count', count);
  }
}

// ═══════════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════════
let _lightboxImages = [];
let _lightboxIdx = 0;

function openLightbox(images, startIdx = 0) {
  if (!images || !images.length) return;
  _lightboxImages = images;
  _lightboxIdx = startIdx;
  renderLightbox();
  document.getElementById('modal-lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
  routeOverlayOpened('lightbox');
}
function closeLightbox() {
  const wasOpen = _isOpen('modal-lightbox');
  document.getElementById('modal-lightbox').classList.remove('open');
  // Зарын цонх ард нь нээлттэй бол хуудсыг гүйлгэхгүй хэвээр үлдээнэ
  document.body.style.overflow = isDetailOpen() ? 'hidden' : '';
  if (wasOpen) routeOverlayClosed('lightbox');
}
function lightboxNav(dir) {
  _lightboxIdx = (_lightboxIdx + dir + _lightboxImages.length) % _lightboxImages.length;
  renderLightbox();
}
function renderLightbox() {
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  const prev = document.getElementById('lightbox-prev');
  const next = document.getElementById('lightbox-next');
  if (!img) return;
  img.src = safeImgUrl(_lightboxImages[_lightboxIdx]);
  counter.textContent = `${_lightboxIdx + 1} / ${_lightboxImages.length}`;
  const many = _lightboxImages.length > 1;
  prev.style.display = many ? 'flex' : 'none';
  next.style.display = many ? 'flex' : 'none';
  counter.style.display = many ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════
async function initHomePage() {
  _homePage = 0;
  await loadHomeListings(true);
  await loadVipListings();
  loadRecentlyViewed();
  updateHeroStats();
}

// ── Hero stats: бодит тоо, зар цөөн бол нууна ───────────
const HERO_STATS_MIN_LISTINGS = 20;
async function updateHeroStats() {
  const box = document.getElementById('hero-stats');
  if (!box) return;
  let listings = 0, shops = 0;
  if (DEMO_MODE || !sb) {
    listings = DEMO_LISTINGS.length;
    shops = new Set(DEMO_LISTINGS.map(l => l.shop_name).filter(Boolean)).size;
  } else {
    try {
      const [l, s] = await Promise.all([
        sb.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'shop'),
      ]);
      listings = l.count || 0;
      shops = s.count || 0;
    } catch { /* тоо гаргаж чадахгүй бол нууцаар үлдээнэ */ }
  }
  if (listings < HERO_STATS_MIN_LISTINGS) { box.style.display = 'none'; return; }
  const fmt = n => Number(n).toLocaleString('mn-MN');
  document.getElementById('stat-listings').textContent = fmt(listings);
  document.getElementById('stat-shops').textContent    = fmt(shops);
  document.getElementById('stat-brands').textContent   = fmt(getMarks().filter(m => m !== 'Бусад').length);
  box.style.display = '';
}

function clearRecentlyViewed() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
  loadRecentlyViewed();
}

async function loadHomeListings(reset = false) {
  if (reset) {
    _homePage = 0;
    renderSkeletons('home-listings-container', 8);
  }
  try {
    const res = await fetchListings({ sort: 'newest', page: _homePage, withCount: reset, listing_type: _listingTypeNav });
    const listings = reset ? res.data : res;
    if (reset && typeof res.count === 'number') _homeTotalCount = res.count;

    const container = document.getElementById('home-listings-container');
    if (reset) {
      renderGrid(listings, 'home-listings-container', { emptyType: 'home' });
    } else {
      const grid = container.querySelector('.listing-grid');
      if (grid) grid.insertAdjacentHTML('beforeend', listings.map(buildListingCard).join(''));
      else renderGrid(listings, 'home-listings-container', { emptyType: 'home' });
    }
    updateLoadMoreButton('home-load-more', _homePage, _homeTotalCount, listings.length);
  } catch(e) {
    document.getElementById('home-listings-container').innerHTML = renderEmptyState('error');
  }
}

function updateLoadMoreButton(wrapId, page, total, gotThisPage) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const shownSoFar = (page + 1) * PAGE_SIZE;
  const remaining  = Math.max(0, total - shownSoFar);
  const hasMore    = gotThisPage >= PAGE_SIZE && (total === 0 || remaining > 0);
  wrap.style.display = hasMore ? 'block' : 'none';
  const btn = wrap.querySelector('.btn-load-more');
  if (btn && total > 0) {
    const label = remaining > 0 ? `+${Math.min(remaining, PAGE_SIZE)} зар харах` : 'Дэлгэрэнгүй харах';
    const suffix = remaining > 0 ? `<span class="lm-count">үлдсэн ${remaining}</span>` : '';
    btn.innerHTML = `${label}${suffix}`;
  }
}

async function loadVipListings() {
  const header = document.getElementById('vip-section-header');
  const grid   = document.getElementById('vip-grid');
  try {
    const vips = await fetchVipListings();
    if (!vips.length) { header.style.display = 'none'; grid.innerHTML = ''; return; }
    header.style.display = 'flex';
    grid.innerHTML = vips.map(buildListingCard).join('');
  } catch(e) { header.style.display = 'none'; grid.innerHTML = ''; }
}

function loadMoreHome() {
  _homePage++;
  loadHomeListings(false);
}

// ═══════════════════════════════════════════════════════════
// SEARCH PAGE
// ═══════════════════════════════════════════════════════════
async function initSearchPage() {
  _searchPage = 0;
  wireFilterAutoApply();
  syncSearchTypeUI();
  _catCountCache = {};
  await loadSearchResults(true);
}

// ── Label maps (chips, active filters) ───────────────────
const FILTER_LABELS = {
  'f-type':      { original: 'Оригинал', substitute: 'Орлуулах' },
  'f-condition': { new: '✨ Шинэ', used: '👌 Хэрэглэсэн', refurbished: '🔧 Засварласан', damaged: '⚠️ Гэмтэлтэй' },
  'f-policy':    { return_ok: '🟢 Буцаана', defect_only: '🟡 Гэмтэлтэй бол', no_return: '🔴 Буцаахгүй' },
  'f-fuel':      { petrol: 'Бензин', hybrid: 'Хайбрид', diesel: 'Дизель', electric: 'Цахилгаан', gas: 'Хий', other: 'Бусад' },
  'f-trans':     { auto: 'Автомат', manual: 'Механик', auto_manual: 'Автомат (+/-)', cvt: 'CVT', other: 'Бусад' },
  'f-drive':     { fwd: 'Урдаа FWD', rwd: 'Хойноо RWD', awd: 'Бүх дугуй AWD', '4wd': '4WD', other: 'Бусад' },
  'f-steering':  { left: 'Зөв хүрд', right: 'Буруу хүрд' },
};

// ── Dual-range sliders (үнэ, он) ─────────────────────────
// Үнэ шугаман биш: бага үнэд нарийн, өндөр үнэд том алхамтай.
// Эхний алхам = доод хязгааргүй, сүүлийн алхам = дээд хязгааргүй.
const PRICE_STEPS = {
  part: [0, 10000, 20000, 30000, 50000, 75000, 100000, 150000, 200000, 300000,
         500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000, 10000000],
  vehicle: [0, 1000000, 3000000, 5000000, 8000000, 10000000, 15000000, 20000000,
            25000000, 30000000, 40000000, 50000000, 60000000, 80000000, 100000000,
            150000000, 200000000, 300000000, 500000000],
};

const YEAR_FIRST = 1990;
const YEAR_STEPS = (() => {
  const last = new Date().getFullYear() + 1;
  const out = [];
  for (let y = YEAR_FIRST; y <= last; y++) out.push(y);
  return out;
})();

const DUAL_SLIDERS = {
  price: {
    inMin: 'f-price-min', inMax: 'f-price-max',
    sMin: 'ps-min', sMax: 'ps-max', fill: 'ps-fill', lMin: 'ps-label-min', lMax: 'ps-label-max',
    steps: () => PRICE_STEPS[_listingTypeNav] || PRICE_STEPS.part,
    labelMin: (v, atEdge) => atEdge ? '0 ₮' : formatPriceShort(v),
    labelMax: (v, atEdge) => atEdge ? 'Хязгааргүй' : formatPriceShort(v),
    toInput: v => formatThousands(v),
  },
  year: {
    inMin: 'f-year-from', inMax: 'f-year-to',
    sMin: 'ys-min', sMax: 'ys-max', fill: 'ys-fill', lMin: 'ys-label-min', lMax: 'ys-label-max',
    steps: () => YEAR_STEPS,
    labelMin: (v, atEdge) => atEdge ? `${v} ба өмнөх` : String(v),
    labelMax: (v) => String(v),
  },
};

// Input-д бичсэн утгаас гулсагчийн байрлалыг тохируулна
function syncDualSlider(key) {
  const c = DUAL_SLIDERS[key];
  const sMin = document.getElementById(c.sMin);
  const sMax = document.getElementById(c.sMax);
  if (!sMin || !sMax) return;
  const steps = c.steps();
  const N = steps.length - 1;
  sMin.max = sMax.max = N;
  const vMin = parseInt(priceDigits(document.getElementById(c.inMin).value)) || 0;
  const vMax = parseInt(priceDigits(document.getElementById(c.inMax).value)) || 0;
  let a = 0, b = N;
  if (vMin > 0) { a = steps.findIndex(s => s >= vMin); if (a < 0) a = N; }
  if (vMax > 0) { b = 0; for (let i = N; i >= 0; i--) { if (steps[i] <= vMax) { b = i; break; } } }
  if (a > b) a = b;
  sMin.value = a;
  sMax.value = b;
  _paintDualSlider(key);
}

// Гулсагч чирэх үед input-уудыг шинэчилнэ
function onDualSliderInput(key, which) {
  const c = DUAL_SLIDERS[key];
  const sMin = document.getElementById(c.sMin);
  const sMax = document.getElementById(c.sMax);
  const steps = c.steps();
  const N = steps.length - 1;
  let a = +sMin.value, b = +sMax.value;
  if (a > b) {
    if (which === 'min') { a = b; sMin.value = a; } else { b = a; sMax.value = b; }
  }
  // Захад байвал шүүлтгүй гэсэн үг
  const out = c.toInput || String;
  document.getElementById(c.inMin).value = a === 0 ? '' : out(steps[a]);
  document.getElementById(c.inMax).value = b === N ? '' : out(steps[b]);
  _paintDualSlider(key);
}

function _paintDualSlider(key) {
  const c = DUAL_SLIDERS[key];
  const sMin = document.getElementById(c.sMin);
  const sMax = document.getElementById(c.sMax);
  const fill = document.getElementById(c.fill);
  const steps = c.steps();
  const N = steps.length - 1;
  const a = +sMin.value, b = +sMax.value;
  fill.style.left  = (a / N * 100) + '%';
  fill.style.right = (100 - b / N * 100) + '%';
  // Хоёр бариул баруун захад давхцвал доод бариулыг дээр нь гаргана
  sMin.style.zIndex = a >= N - 1 ? 5 : 3;
  document.getElementById(c.lMin).textContent = c.labelMin(steps[a], a === 0);
  document.getElementById(c.lMax).textContent = c.labelMax(steps[b], b === N);
}

function syncPriceSlider() { syncDualSlider('price'); }
function syncYearSlider()  { syncDualSlider('year'); }

// ── Part / Vehicle-д тохирох sidebar ─────────────────────
function syncSearchTypeUI() {
  const page = document.getElementById('page-search');
  if (page) page.dataset.lt = _listingTypeNav;
  const yl = document.getElementById('f-year-label');
  if (yl) yl.textContent = _listingTypeNav === 'vehicle' ? 'Үйлдвэрлэсэн он' : 'Таарах он';
  syncPriceSlider();
  syncYearSlider();
}

// ── Chip/select өөрчлөгдөхөд шууд шүүнэ ─────────────────
let _autoApplyTimer = null;
function wireFilterAutoApply() {
  const side = document.getElementById('filter-sidebar');
  if (!side || side.dataset.autoWired) return;
  side.dataset.autoWired = '1';
  attachPriceInput(document.getElementById('f-price-min'));
  attachPriceInput(document.getElementById('f-price-max'));
  // Чирэх үед зөвхөн тоо/шугам шинэчилнэ; суллахад (change) шүүлт ажиллана
  for (const key of Object.keys(DUAL_SLIDERS)) {
    const c = DUAL_SLIDERS[key];
    document.getElementById(c.sMin)?.addEventListener('input', () => onDualSliderInput(key, 'min'));
    document.getElementById(c.sMax)?.addEventListener('input', () => onDualSliderInput(key, 'max'));
  }
  side.addEventListener('change', e => {
    if (e.target.id === 'f-category') return; // onSearchCategoryChange өөрөө шийднэ
    if (e.target.id === 'f-price-min' || e.target.id === 'f-price-max') syncPriceSlider();
    if (e.target.id === 'f-year-from' || e.target.id === 'f-year-to') syncYearSlider();
    clearTimeout(_autoApplyTimer);
    _autoApplyTimer = setTimeout(applyFilters, 250);
  });
}

function getFilters() {
  const isV  = _listingTypeNav === 'vehicle';
  const vals = name => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value).filter(Boolean);
  return {
    category:        document.getElementById('f-category').value,
    subcategory:     document.getElementById('f-subcategory')?.value || '',
    car_makes:       vals('f-make-cb'),
    car_model:       document.getElementById('f-model').value.trim(),
    year_from:       document.getElementById('f-year-from').value,
    year_to:         document.getElementById('f-year-to').value,
    price_min:       priceDigits(document.getElementById('f-price-min').value),
    price_max:       priceDigits(document.getElementById('f-price-max').value),
    part_type:       isV ? [] : vals('f-type'),
    condition:       isV ? [] : vals('f-condition'),
    exchange_policy: isV ? [] : vals('f-policy'),
    fuel_type:       isV ? vals('f-fuel')  : [],
    transmission:    isV ? vals('f-trans') : [],
    drive:           isV ? vals('f-drive') : [],
    steering:        isV ? (document.querySelector('input[name="f-steering"]:checked')?.value || '') : '',
    mileage_max:     isV ? (document.getElementById('f-mileage-max')?.value || '') : '',
    locations:       vals('f-loc-cb'),
    sort:            document.getElementById('sort-select').value,
  };
}

function onFilterCheckboxChange() {
  updateFilterCountBadge();
}

function toggleFilterExpand(wrapId, btn) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const expanded = wrap.classList.toggle('expanded');
  btn.textContent = expanded ? 'Хураах ▴' : 'Бүгдийг харах ▾';
}

// ── Collapsible filter sections ──────────────────────────
function toggleFilterSection(btn) {
  const section = btn.closest('.filter-section');
  if (!section) return;
  if (section.dataset.section === 'essential') return;
  section.classList.toggle('collapsed');
}

// ── Mobile drawer ────────────────────────────────────────
function openMobileFilters() {
  document.getElementById('filter-sidebar')?.classList.add('open');
  document.querySelector('.filter-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileFilters() {
  document.getElementById('filter-sidebar')?.classList.remove('open');
  document.querySelector('.filter-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Active filter chips ──────────────────────────────────
function renderActiveChips() {
  const el = document.getElementById('active-chips');
  if (!el) return;
  const f = getFilters();
  const chips = [];
  const add = (label, kind, value = '') => chips.push({ label, kind, value });
  const fmt = n => Number(n).toLocaleString('mn-MN');

  if (_searchFilters.keyword) add(`"${_searchFilters.keyword}"`, 'keyword');
  if (f.subcategory) add(f.subcategory, 'subcategory');
  f.car_makes.forEach(m => add(m, 'f-make-cb', m));
  f.locations.forEach(k => add(typeof locationLabel === 'function' ? locationLabel(k) : k, 'f-loc-cb', k));
  if (f.car_model) add(`Загвар: ${f.car_model}`, 'model');
  if (f.year_from || f.year_to) add(`Он: ${f.year_from || '…'}–${f.year_to || '…'}`, 'year');
  if (f.price_min || f.price_max) {
    const lo = f.price_min ? formatPriceShort(f.price_min).replace(' ₮', '') : '0';
    const hi = f.price_max ? formatPriceShort(f.price_max) : 'дээш';
    add(`Үнэ: ${lo} – ${hi}`, 'price');
  }
  ['f-type','f-condition','f-policy','f-fuel','f-trans','f-drive'].forEach(name => {
    const key = { 'f-type':'part_type','f-condition':'condition','f-policy':'exchange_policy','f-fuel':'fuel_type','f-trans':'transmission','f-drive':'drive' }[name];
    (f[key] || []).forEach(v => add(FILTER_LABELS[name][v] || v, name, v));
  });
  if (f.steering)    add(FILTER_LABELS['f-steering'][f.steering], 'steering');
  if (f.mileage_max) add(`${fmt(f.mileage_max)} км хүртэл`, 'mileage');

  if (!chips.length) { el.innerHTML = ''; return; }
  el.innerHTML = chips.map(c =>
    `<span class="active-chip"><strong>${escapeHtml(c.label)}</strong><span class="chip-remove" onclick="removeFilter('${c.kind}','${encodeURIComponent(c.value)}')">✕</span></span>`
  ).join('') + `<span class="active-chip chip-clear-all" onclick="resetFilters()">Бүгдийг арилгах</span>`;
}

function removeFilter(kind, enc) {
  const v = decodeURIComponent(enc || '');
  const set = (id, val = '') => { const el = document.getElementById(id); if (el) el.value = val; };
  switch (kind) {
    case 'keyword':     delete _searchFilters.keyword; set('header-search-input'); break;
    case 'category':    set('f-category'); onSearchCategoryChange(); break;
    case 'subcategory': set('f-subcategory'); break;
    case 'model':       set('f-model'); break;
    case 'year':        set('f-year-from'); set('f-year-to'); syncYearSlider(); break;
    case 'price':       set('f-price-min'); set('f-price-max'); syncPriceSlider(); break;
    case 'mileage':     set('f-mileage-max'); break;
    case 'steering': {
      const r = document.querySelector('input[name="f-steering"][value=""]'); if (r) r.checked = true; break;
    }
    default: {
      const cb = document.querySelector(`input[name="${kind}"][value="${CSS.escape(v)}"]`);
      if (cb) cb.checked = false;
    }
  }
  applyFilters();
}

// ── Category quick chips (тоотой) ────────────────────────
let _catCountCache = {};
async function renderCategoryChips() {
  const el = document.getElementById('category-chips');
  if (!el) return;
  const type = _listingTypeNav;
  if (!_catCountCache[type]) _catCountCache[type] = await fetchCategoryCounts(type);
  const counts = _catCountCache[type] || {};
  const source = type === 'vehicle' ? getVehicleCategories() : getMainCategories();
  const cur = document.getElementById('f-category').value;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  el.innerHTML =
    `<button type="button" class="category-chip${!cur ? ' active' : ''}" onclick="selectCategoryChip('')">Бүгд <span class="cc-count">${total}</span></button>` +
    source.map(c => {
      const n = counts[c.name] || 0;
      return `<button type="button" class="category-chip${cur === c.name ? ' active' : ''}" onclick="selectCategoryChip('${c.name.replace(/'/g, "\\'")}')">${c.icon} ${escapeHtml(c.name)} <span class="cc-count">${n}</span></button>`;
    }).join('');
}

function selectCategoryChip(name) {
  document.getElementById('f-category').value = name;
  onSearchCategoryChange();
  applyFilters();
}

// ── Breadcrumb + title ───────────────────────────────────
function renderResultsHeader(count) {
  const typeLabel = _listingTypeNav === 'vehicle' ? 'Авто зар' : 'Сэлбэг';
  const cat = document.getElementById('f-category').value;
  const bc = document.getElementById('results-breadcrumb');
  if (bc) {
    bc.innerHTML = `<a onclick="showPage('home')">Нүүр</a> › <a onclick="selectCategoryChip('')">${typeLabel}</a>` +
      (cat ? ` › ${escapeHtml(cat)}` : '');
  }
  document.getElementById('results-count').innerHTML =
    `<h1 class="results-title">${escapeHtml(cat || typeLabel)}</h1><span class="results-title-count">${Number(count).toLocaleString('mn-MN')} зар</span>`;
}

async function loadSearchResults(reset = false) {
  if (reset) {
    _searchPage = 0;
    renderSkeletons('search-listings-container', 8);
    document.getElementById('results-count').textContent = 'Хайж байна...';
  }
  syncSearchTypeUI();
  refreshModelSuggestions('f');
  updateFilterCountBadge();
  renderActiveChips();
  renderCategoryChips();
  try {
    const filters = { ...getFilters(), ..._searchFilters, page: _searchPage, withCount: reset, listing_type: _listingTypeNav };
    const res = await fetchListings(filters);
    const listings = reset ? res.data : res;
    if (reset && typeof res.count === 'number') _searchTotalCount = res.count;

    const container = document.getElementById('search-listings-container');
    if (reset) {
      renderGrid(listings, 'search-listings-container', { emptyType: 'search' });
      renderResultsHeader(_searchTotalCount || listings.length);
    } else {
      const grid = container.querySelector('.listing-grid');
      if (grid) grid.insertAdjacentHTML('beforeend', listings.map(buildListingCard).join(''));
    }
    updateLoadMoreButton('search-load-more', _searchPage, _searchTotalCount, listings.length);
  } catch(e) {
    console.error('Search failed:', e);
    document.getElementById('search-listings-container').innerHTML = renderEmptyState('error');
  }
}

function applyFilters() {
  // Хайлтын түлхүүр үгийг хадгална, бусад түр шүүлтийг sidebar-аас уншина
  _searchFilters = _searchFilters.keyword ? { keyword: _searchFilters.keyword } : {};
  loadSearchResults(true);
}

// Sidebar-ын бүх шүүлтийг анхны байдалд нь оруулна (хайлт ажиллуулахгүй)
function _clearFilterInputs() {
  ['f-category','f-subcategory','f-model','f-year-from','f-year-to','f-price-min','f-price-max','f-mileage-max']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('f-subcategory-group').style.display = 'none';
  document.querySelectorAll('#filter-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
  const st = document.querySelector('input[name="f-steering"][value=""]'); if (st) st.checked = true;
  document.getElementById('sort-select').value = 'newest';
  syncPriceSlider();
  syncYearSlider();
}

function resetFilters() {
  _clearFilterInputs();
  _searchFilters = {};
  loadSearchResults(true);
}

function loadMoreSearch() {
  _searchPage++;
  loadSearchResults(false);
}

// ── Header search ───────────────────────────────────────────
function doHeaderSearch() {
  const kw = document.getElementById('header-search-input').value.trim();
  _searchFilters = { keyword: kw };
  showPage('search');
  document.getElementById('f-category').value = '';
  loadSearchResults(true);
}

// ── Hero search ─────────────────────────────────────────────
function doHeroSearch() {
  const isV      = _listingTypeNav === 'vehicle';
  const heroMake = document.getElementById('hero-mark').value;
  // Өмнөх хайлтын шүүлт үлдэхгүй — шинэ хайлт цэвэрхэн эхэлнэ
  _clearFilterInputs();
  _searchFilters = {
    car_makes: heroMake ? [heroMake] : [],
    car_model: document.getElementById('hero-model').value.trim(),
    category:  isV ? '' : document.getElementById('hero-cat').value,
    keyword:   isV ? '' : document.getElementById('hero-keyword').value.trim(),
  };
  // Sidebar-т тусгана (идэвхтэй шүүлтийн chip-үүд, гулсагч зөв харагдана)
  if (heroMake) {
    const cb = document.querySelector(`input[name="f-make-cb"][value="${CSS.escape(heroMake)}"]`);
    if (cb) cb.checked = true;
  }
  if (_searchFilters.car_model) document.getElementById('f-model').value    = _searchFilters.car_model;
  if (_searchFilters.category)  document.getElementById('f-category').value = _searchFilters.category;
  if (isV) {
    const year  = document.getElementById('hero-year').value;
    const price = document.getElementById('hero-price').value;
    if (year)  document.getElementById('f-year-from').value = year;
    if (price) document.getElementById('f-price-max').value = formatThousands(price);
    syncYearSlider();
    syncPriceSlider();
  }
  showPage('search');   // initSearchPage нэг удаа хайна
}

// ═══════════════════════════════════════════════════════════
// LISTING DETAIL
// ═══════════════════════════════════════════════════════════
// opts.fromHistory: URL/Буцах товчоос нээгдсэн бол history-д дахин бичихгүй
async function openDetail(id, opts = {}) {
  try {
    const l = await fetchListingById(id);
    if (!l) {
      showToast('Энэ зар устгагдсан эсвэл хугацаа нь дууссан байна', 'info');
      if (opts.fromHistory) _routeDropZar();
      return;
    }
    _currentListing = l;
    incrementView(id);
    addToRecentlyViewed(l);

    // Images
    const mainWrap = document.getElementById('detail-main-img-wrap');
    const thumbsWrap = document.getElementById('detail-thumbs');
    if (l.images?.length) {
      _currentListingImages = l.images.map(safeImgUrl).filter(Boolean);
      mainWrap.innerHTML = `<img src="${escapeHtml(_currentListingImages[0] || '')}" alt="${escapeHtml(l.title)}">`;
      mainWrap.querySelector('img').onclick = () => openLightbox(_currentListingImages, 0);
      thumbsWrap.innerHTML = _currentListingImages.map((url, i) =>
        `<div class="gallery-thumb ${i===0?'active':''}" data-idx="${i}">${cardImg(url, '')}</div>`
      ).join('');
      thumbsWrap.querySelectorAll('.gallery-thumb').forEach(t => {
        t.onclick = () => switchDetailImg(t, _currentListingImages[+t.dataset.idx], +t.dataset.idx);
      });
    } else {
      mainWrap.innerHTML = `<div class="no-photo"><span>📦</span><small>Зураг байхгүй</small></div>`;
      thumbsWrap.innerHTML = '';
      _currentListingImages = [];
    }

    // Badges
    const badgeClass = l.part_type === 'original' ? 'original' : 'substitute';
    const badgeText  = l.part_type === 'original' ? 'Оригинал' : 'Орлуулах';
    const policy     = policyMeta(l.exchange_policy);
    const cond = conditionMeta(l.condition);
    document.getElementById('detail-badges').innerHTML =
      `<span class="detail-badge ${badgeClass}">${badgeText}</span>` +
      `<span class="detail-badge category">${escapeHtml(l.category || '')}${l.subcategory ? ' / ' + escapeHtml(l.subcategory) : ''}</span>` +
      (l.is_vip ? '<span class="detail-badge vip">⭐ VIP</span>' : '') +
      (cond ? `<span class="detail-badge ${cond.cls}">${cond.short}</span>` : '') +
      (policy ? `<span class="detail-badge ${policy.cls}">${policy.short}</span>` : '');

    document.getElementById('detail-price').textContent = formatPrice(l.price);
    document.getElementById('detail-title').textContent = l.title || '';

    // Car info (extended for vehicles)
    const carRows = [
      l.car_make  ? ['Марк', l.car_make] : null,
      l.car_model ? ['Загвар', l.car_model] : null,
      (l.year_from || l.year_to) ? ['Он', l.year_from && l.year_to && l.year_from !== l.year_to ? `${l.year_from}–${l.year_to}` : `${l.year_from || l.year_to}`] : null,
    ].filter(Boolean);
    document.getElementById('detail-car').innerHTML = carRows.map(([k,v]) =>
      `<div class="detail-car-row"><span>${escapeHtml(k)}</span><span>${escapeHtml(v)}</span></div>`
    ).join('');

    // Vehicle-specific extra spec
    if (l.listing_type === 'vehicle') {
      const vd = await fetchVehicleDetails(l.id);
      if (vd) {
        const fuelLabels = { petrol:'Бензин', diesel:'Дизель', hybrid:'Хайбрид', electric:'Цахилгаан', gas:'Хий', other:'Бусад' };
        const transLabels = { auto:'Автомат', manual:'Механик', auto_manual:'Автомат (+/-)', cvt:'CVT', other:'Бусад' };
        const driveLabels = { fwd:'Урдаа (FWD)', rwd:'Хойдоо (RWD)', awd:'Бүх дугуй (AWD)', '4wd':'Full 4WD', other:'Бусад' };
        const extra = [
          vd.imported_year ? ['Орж ирсэн он', vd.imported_year] : null,
          vd.mileage_km ? ['Явсан км', Number(vd.mileage_km).toLocaleString('mn-MN') + ' км'] : null,
          vd.engine_cc ? ['Хөдөлгүүр', vd.engine_cc + 'л'] : null,
          vd.fuel_type ? ['Шатахуун', fuelLabels[vd.fuel_type] || vd.fuel_type] : null,
          vd.transmission ? ['Хурдны хайрцаг', transLabels[vd.transmission] || vd.transmission] : null,
          vd.drive ? ['Хөтлөгч', driveLabels[vd.drive] || vd.drive] : null,
          vd.steering ? ['Хурд', vd.steering === 'left' ? 'Зөв гар' : 'Буруу гар'] : null,
          vd.color ? ['Өнгө', vd.color] : null,
          vd.color_interior ? ['Дотор өнгө', vd.color_interior] : null,
          vd.plate_region ? ['Улсын дугаар', vd.plate_region] : null,
          typeof vd.customs_cleared === 'boolean' ? ['Гаальд орсон', vd.customs_cleared ? 'Тийм' : 'Үгүй'] : null,
        ].filter(Boolean);
        document.getElementById('detail-car').innerHTML += extra.map(([k,v]) =>
          `<div class="detail-car-row"><span>${escapeHtml(k)}</span><span>${escapeHtml(v)}</span></div>`
        ).join('');
      }
    }

    document.getElementById('detail-desc').textContent = l.description || 'Тайлбар байхгүй';

    // Shop
    const shopInitial = (l.shop_name || l.phone || 'Х').charAt(0).toUpperCase();
    const verifiedIcon = l.is_verified ? '<span class="verified-badge" title="Баталгаажсан дэлгүүр"></span>' : '';
    const shopClickHandler = (l.user_id && l.shop_name)
      ? `onclick="openShop('${l.user_id}')" class="detail-shop-info clickable"`
      : 'class="detail-shop-info"';
    document.getElementById('detail-shop').innerHTML = `
      <div class="detail-shop-avatar">${escapeHtml(shopInitial)}</div>
      <div ${shopClickHandler}>
        <div class="detail-shop-name">${escapeHtml(l.shop_name || 'Хувь хүн')}${verifiedIcon}</div>
        <div class="detail-shop-loc">📍 ${escapeHtml(l.location || 'Байршил тодорхойгүй')}</div>
        <div class="detail-shop-rating" id="detail-shop-rating" style="margin-top:4px"></div>
      </div>`;

    // Fetch rating async (background)
    if (l.user_id) {
      fetchProfileRating(l.user_id).then(r => {
        const el = document.getElementById('detail-shop-rating');
        if (!el) return;
        if (r.rating_count > 0) {
          el.innerHTML = `<span class="rating-summary">${renderStars(r.rating_avg, 'sm')}<span class="rating-num">${Number(r.rating_avg).toFixed(1)}</span><span class="rating-count">${r.rating_count}</span></span>`;
        }
      });
    }

    // Actions
    const phone = l.phone ? '+976' + String(l.phone).replace(/\D/g, '').replace(/^976/, '') : '';
    const callBtn = document.getElementById('detail-call-btn');
    const waBtn   = document.getElementById('detail-wa-btn');
    callBtn.href = phone ? `tel:${phone}` : '#';
    waBtn.href   = phone ? `https://wa.me/${phone.replace('+','')}` : '#';
    // Өөрийн зарыг мэдээлэх боломжгүй
    const me = authGetUser();
    const mine = !!(me && l.user_id && me.id === l.user_id);
    document.getElementById('detail-report-btn').style.display = mine ? 'none' : '';
    document.getElementById('detail-edit-btn').style.display   = mine ? '' : 'none';
    // Утасгүй зар дээр ажиллахгүй товч харуулахгүй
    callBtn.style.display = phone ? '' : 'none';
    waBtn.style.display   = phone ? '' : 'none';

    document.getElementById('detail-date').textContent  = formatDate(l.created_at);
    document.getElementById('detail-views').textContent = `👁 ${l.view_count || 0} үзэлт`;

    document.getElementById('modal-detail').classList.add('open');
    document.body.style.overflow = 'hidden';
    document.title = `${l.title || 'Зар'} — CELBEG.MN`;
    if (!opts.fromHistory) _routeDetailOpened(l.id);
  } catch(e) {
    showToast('Зар ачаалахад алдаа гарлаа', 'error');
    if (opts.fromHistory) _routeDropZar();
  }
}

function switchDetailImg(thumb, url, idx) {
  const mainImg = document.querySelector('#detail-main-img-wrap img');
  if (mainImg) {
    mainImg.src = safeImgUrl(url);
    if (typeof idx === 'number') {
      mainImg.onclick = () => openLightbox(_currentListingImages, idx);
    }
  }
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function closeDetail() {
  if (!isDetailOpen()) return;
  _hideDetail();
  _routeDetailClosed();
}

// History-д бичихгүйгээр зарын цонхыг нууна (Буцах товч, хуудас солих үед)
function _hideDetail() {
  document.getElementById('modal-detail').classList.remove('open');
  document.body.style.overflow = '';
  document.title = BASE_TITLE;
  _currentListing = null;
}

// Нээгдэж чадаагүй зарын id-г URL-аас авна
function _routeDropZar() {
  _routeEnqueue(st => { if (st.zar) _routeWrite({ ...st, zar: undefined }, true); });
}

// ── Зарын линк хуваалцах ───────────────────────────────────
// Утсан дээр Messenger/Viber г.м-ээр илгээх цонх нээгдэнэ, компьютер дээр линк хуулна.
async function shareListing() {
  const l = _currentListing;
  if (!l) return;
  const url = `${location.origin}/?zar=${encodeURIComponent(l.id)}`;
  if (navigator.share) {
    try { await navigator.share({ title: l.title, text: `${l.title} — ${formatPrice(l.price)}`, url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }   // хэрэглэгч цуцалсан
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('Линк хуулагдлаа. Messenger, Facebook-т буулгаж (paste) илгээнэ үү', 'success');
  } catch {
    window.prompt('Энэ линкийг хуулж авна уу:', url);
  }
}

// ═══════════════════════════════════════════════════════════
// POST LISTING
// ═══════════════════════════════════════════════════════════
async function initPostPage() {
  document.getElementById('post-form-wrap').style.display = 'block';
  document.getElementById('post-success').style.display   = 'none';
  initUploadZone('upload-zone', 'upload-preview');
  attachDraftAutoSave();
  attachPriceInput(document.getElementById('p-price'), updatePriceHint);

  if (_editListingId) {
    if (_postFormMode !== _editListingId) await _enterEditMode(_editListingId);
    return;
  }
  _leaveEditMode();
  selectListingType(_listingTypeNav || 'part');

  // Хэрэглэгчийн профайл дээрээс утас, дэлгүүрийн нэрийг автомат бөглөнө
  prefillFromProfile();
  // Өмнөх зарын байршлыг санана
  prefillLastLocation();
  // Хадгалсан draft байвал санамж харуулна
  checkForDraft();
  updatePriceHint();
  refreshModelSuggestions('p');
  refreshModelSuggestions('v');

  await refreshQuotaInfo();
}

// ── Pre-fill from profile ────────────────────────────────
function prefillFromProfile() {
  const user = authGetUser();
  if (!user) return;
  const phoneEl = document.getElementById('p-phone');
  const shopEl  = document.getElementById('p-shop');
  if (phoneEl && !phoneEl.value && user.phone) phoneEl.value = user.phone;
  if (shopEl  && !shopEl.value  && user.shop_name) shopEl.value  = user.shop_name;
}

function prefillLastLocation() {
  const locEl = document.getElementById('p-location');
  if (!locEl || locEl.value) return;
  const last = localStorage.getItem('cb_last_location');
  if (last) locEl.value = last;
}

// ── Үнийн талбар: 100000000 → 100,000,000 ─────────────────
// type="text" + inputmode="numeric": бичих явцад мянгатын таслал автоматаар нэмнэ.
// Утгыг уншихдаа priceDigits()-ээр таслалгүй болгоно.
const MAX_PRICE = 2000000000;   // DB багана: integer
function priceDigits(v) { return String(v ?? '').replace(/\D/g, ''); }
function formatThousands(d) { return String(d).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function attachPriceInput(el, onChange) {
  if (!el || el.dataset.priceWired) return;
  el.dataset.priceWired = '1';
  el.addEventListener('input', () => {
    const caret = el.selectionStart ?? el.value.length;
    const digitsBefore = priceDigits(el.value.slice(0, caret)).length;
    const formatted = formatThousands(priceDigits(el.value).replace(/^0+(?=\d)/, '').slice(0, 10));
    if (formatted !== el.value) {
      el.value = formatted;
      // Курсорыг өмнөх цифрийнх нь ард буцааж тавина
      let pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBefore) { if (/\d/.test(formatted[pos])) seen++; pos++; }
      if (document.activeElement === el) el.setSelectionRange(pos, pos);
    }
    onChange?.();
  });
}

// Post form: таслалтай болгож, доор нь "100 сая ₮" гэж үгээр харуулна
function updatePriceHint() {
  const el   = document.getElementById('p-price');
  const hint = document.getElementById('p-price-hint');
  if (!el || !hint) return;
  const d = priceDigits(el.value);
  if (!el.disabled) el.value = d ? formatThousands(d) : '';
  const n = parseInt(d, 10) || 0;
  hint.textContent = !el.disabled && n >= 10000 ? formatPriceShort(n) : '';
}

// ── "Үнэ тохиролцоно" toggle ─────────────────────────────
function toggleNegotiable() {
  const chk = document.getElementById('p-negotiable');
  const priceEl = document.getElementById('p-price');
  priceEl.value = '';
  priceEl.disabled = chk.checked;
  priceEl.placeholder = chk.checked ? 'Үнэ тохиролцоно' : '150,000';
  updatePriceHint();
}

// ═══════════════════════════════════════════════════════════
// MODEL SUGGESTIONS (марк → загвар)
// ═══════════════════════════════════════════════════════════
const MODEL_FIELDS = {
  p:    { make: 'p-make',    model: 'p-model',    list: 'dl-p-model',    chips: 'p-model-chips' },
  v:    { make: 'v-make',    model: 'v-model',    list: 'dl-v-model',    chips: 'v-model-chips' },
  hero: { make: 'hero-mark', model: 'hero-model', list: 'dl-hero-model' },
  f:    {                    model: 'f-model',    list: 'dl-f-model' },   // маркийг checkbox-оос уншина
};
const MODEL_CHIP_LIMIT = 8;

function refreshModelSuggestions(key) {
  const c = MODEL_FIELDS[key];
  if (!c) return;
  const makes = key === 'f'
    ? [...document.querySelectorAll('input[name="f-make-cb"]:checked')].map(i => i.value)
    : [document.getElementById(c.make)?.value].filter(Boolean);
  const models = [...new Set(makes.flatMap(getModelsFor))];
  const input = document.getElementById(c.model);

  // Өмнөх маркийн загвар сонгогдсон байхад марк солигдвол загварыг цэвэрлэнэ
  const prev = c._models || [];
  const cur = input?.value.trim();
  if (input && cur && prev.includes(cur) && !models.includes(cur)) {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  c._models = models;

  const dl = document.getElementById(c.list);
  if (dl) dl.innerHTML = models.map(m => `<option value="${escapeHtml(m)}"></option>`).join('');

  if (c.chips && input) {
    renderModelChips(key);
    if (!input.dataset.chipsWired) {
      input.dataset.chipsWired = '1';
      input.addEventListener('input', () => renderModelChips(key));
    }
  }
}

function renderModelChips(key) {
  const c = MODEL_FIELDS[key];
  const wrap = document.getElementById(c.chips);
  const input = document.getElementById(c.model);
  if (!wrap || !input) return;
  const models = c._models || [];
  const top = models.slice(0, MODEL_CHIP_LIMIT);
  if (!top.length) { wrap.innerHTML = ''; return; }
  const cur = input.value.trim();
  wrap.innerHTML =
    top.map((m, i) => `<button type="button" class="model-chip${cur === m ? ' active' : ''}" data-i="${i}">${escapeHtml(m)}</button>`).join('') +
    (models.length > top.length ? `<span class="model-chip-more">+${models.length - top.length} загвар — бичиж эхлэхэд гарна</span>` : '');
  wrap.querySelectorAll('.model-chip').forEach(btn => {
    btn.onclick = () => {
      const picked = top[+btn.dataset.i];
      input.value = cur === picked ? '' : picked;   // дахин дарвал болиулна
      input.dispatchEvent(new Event('input', { bubbles: true }));  // draft хадгалалт + chip шинэчлэл
    };
  });
}

// ── Амжилттай нийтэлсний дараа form-ыг цэвэрлэнэ ─────────
// Утас, дэлгүүрийн нэр, байршлыг дараагийн зарт ашиглахаар үлдээнэ.
const POST_KEEP_FIELDS = new Set(['p-phone', 'p-shop', 'p-location', 'p-listing-type']);
function resetPostForm() {
  const wrap = document.getElementById('post-form-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('input, select, textarea').forEach(el => {
    if (POST_KEEP_FIELDS.has(el.id) || el.type === 'file') return;
    if (el.type === 'checkbox' || el.type === 'radio') { el.checked = el.defaultChecked; return; }
    if (el.tagName === 'SELECT') {
      const def = [...el.options].findIndex(o => o.defaultSelected);
      el.selectedIndex = def >= 0 ? def : 0;
      return;
    }
    el.value = el.defaultValue || '';
  });
  // Үнэ тохиролцоно → идэвхгүй болсон үнийн талбарыг сэргээнэ
  const price = document.getElementById('p-price');
  price.disabled = false; price.placeholder = '150,000';
  updatePriceHint();
  selectType('original');
  document.getElementById('p-subcategory-group').style.display = 'none';
  // Нээлттэй "Дэлгэрэнгүй" хэсгүүдийг хураана
  if (document.getElementById('p-advanced-fields').style.display !== 'none') togglePartAdvanced();
  if (document.getElementById('v-advanced-fields').style.display !== 'none') toggleVehicleAdvanced();
  document.querySelectorAll('#post-form-wrap .form-error').forEach(e => { e.textContent = ''; e.classList.remove('show'); });
  refreshModelSuggestions('p');
  refreshModelSuggestions('v');
}

// ── Draft auto-save + restore ────────────────────────────
const DRAFT_KEY = 'cb_post_draft_v1';
const DRAFT_FIELDS = [
  'p-title','p-category','p-subcategory','p-condition','p-make','p-model','p-year-from',
  'p-policy','p-desc','p-price','p-shop','p-location',
  'v-title','v-body-type','v-make','v-model','v-year','v-imported-year','v-mileage',
  'v-engine','v-fuel','v-transmission','v-drive','v-steering','v-color',
  'v-color-interior','v-plate-region','v-customs','v-desc',
];

function _collectDraft() {
  const data = { listing_type: document.getElementById('p-listing-type')?.value || 'part' };
  DRAFT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value) data[id] = el.value;
  });
  // Checkboxes
  const barter  = document.getElementById('v-barter');
  const leasing = document.getElementById('v-leasing');
  if (document.getElementById('p-negotiable')?.checked) data['p-negotiable'] = true;
  if (barter?.checked)  data['v-barter'] = true;
  if (leasing?.checked) data['v-leasing'] = true;
  return data;
}

function _applyDraft(data) {
  if (!data) return;
  if (data.listing_type) selectListingType(data.listing_type);
  DRAFT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && data[id] != null) {
      el.value = data[id];
      // Category change → sub-category dropdown
      if (id === 'p-category') onPostCategoryChange();
    }
  });
  if (data['v-barter'])  { const el = document.getElementById('v-barter');  if (el) el.checked = true; }
  if (data['v-leasing']) { const el = document.getElementById('v-leasing'); if (el) el.checked = true; }
  const neg = document.getElementById('p-negotiable');
  if (neg) { neg.checked = !!data['p-negotiable']; if (neg.checked) toggleNegotiable(); }
  updatePriceHint();
  refreshModelSuggestions('p');
  refreshModelSuggestions('v');
}

let _draftTimer = null;
function attachDraftAutoSave() {
  const wrap = document.getElementById('post-form-wrap');
  if (!wrap || wrap.dataset.draftWired) return;
  wrap.dataset.draftWired = '1';
  wrap.addEventListener('input', () => {
    if (_postFormMode !== 'new') return;   // засах үед шинэ зарын ноорогт хадгалахгүй
    clearTimeout(_draftTimer);
    _draftTimer = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(_collectDraft())); } catch {}
    }, 500);
  });
}

function checkForDraft() {
  const banner = document.getElementById('draft-banner');
  if (!banner) return;
  let raw;
  try { raw = localStorage.getItem(DRAFT_KEY); } catch { raw = null; }
  if (!raw) { banner.style.display = 'none'; return; }
  try {
    const data = JSON.parse(raw);
    // Хэрэв title эсвэл v-title хоосон бол draft утгагүй
    if (!data['p-title'] && !data['v-title']) { banner.style.display = 'none'; return; }
    banner.style.display = 'flex';
  } catch { banner.style.display = 'none'; }
}

function restoreDraft() {
  try {
    const data = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    _applyDraft(data);
    showToast('Хадгалсан зар сэргээгдлээ', 'success');
  } catch {}
  document.getElementById('draft-banner').style.display = 'none';
}

function discardDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
  document.getElementById('draft-banner').style.display = 'none';
  showToast('Хадгалсан зар устгагдлаа', 'info');
}

function clearDraftAfterSubmit() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

async function refreshQuotaInfo() {
  const el = document.getElementById('quota-info');
  const txt = document.getElementById('quota-text');
  const btn = document.getElementById('post-submit-btn');
  if (!el || !authGetUser()) return;
  try {
    const q = await fetchMyQuota();
    el.style.display = 'flex';
    el.classList.remove('warning', 'danger');
    const activeUnlimited = q.max_active >= 999999;
    const dailyUnlimited  = q.max_daily  >= 999999;
    const activeText = activeUnlimited ? '∞' : `<strong>${q.active}/${q.max_active}</strong>`;
    const dailyText  = dailyUnlimited  ? '∞' : `<strong>${q.daily}/${q.max_daily}</strong>`;
    txt.innerHTML = `Идэвхтэй зар: ${activeText} · Өнөөдөр нэмсэн: ${dailyText}`;

    if (!activeUnlimited && q.remaining === 0) {
      el.classList.add('danger');
      txt.innerHTML += ' — <strong>Хязгаарт хүрсэн.</strong> Хуучин зар устгаад дахин оролдоно уу.';
      if (btn) btn.disabled = true;
    } else if (!dailyUnlimited && q.daily_remaining === 0) {
      el.classList.add('danger');
      txt.innerHTML += ' — <strong>Өдрийн хязгаарт хүрсэн.</strong> Маргааш дахин оролдоно уу.';
      if (btn) btn.disabled = true;
    } else if (!activeUnlimited && q.remaining <= 1) {
      el.classList.add('warning');
      if (btn) btn.disabled = false;
    } else {
      if (btn) btn.disabled = false;
    }
  } catch(e) {
    el.style.display = 'none';
  }
}

function selectType(type) {
  document.getElementById('p-type').value = type;
  document.getElementById('type-original').classList.toggle('active', type === 'original');
  document.getElementById('type-substitute').classList.toggle('active', type === 'substitute');
}

// ── Advanced toggle (Part / Vehicle) ─────────────────────
function togglePartAdvanced() {
  const wrap = document.getElementById('p-advanced-fields');
  const btn  = document.getElementById('p-advanced-toggle');
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'grid';
  btn.querySelector('span').textContent = isOpen
    ? '➕ Дэлгэрэнгүй мэдээлэл нэмэх (сонголтоор)'
    : '➖ Дэлгэрэнгүйг хураах';
  btn.classList.toggle('expanded', !isOpen);
}
function toggleVehicleAdvanced() {
  const wrap = document.getElementById('v-advanced-fields');
  const btn  = document.getElementById('v-advanced-toggle');
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'block';
  btn.querySelector('span').textContent = isOpen
    ? '➕ Дэлгэрэнгүй мэдээлэл нэмэх (сонголтоор)'
    : '➖ Дэлгэрэнгүйг хураах';
  btn.classList.toggle('expanded', !isOpen);
}

// ── Listing type toggle (Part / Vehicle) ─────────────────
function selectListingType(t) {
  const el = document.getElementById('p-listing-type');
  if (el) el.value = t;
  document.getElementById('lt-part').classList.toggle('active',    t === 'part');
  document.getElementById('lt-vehicle').classList.toggle('active', t === 'vehicle');
  document.getElementById('part-fields-wrap').style.display    = t === 'part'    ? 'block' : 'none';
  document.getElementById('vehicle-fields-wrap').style.display = t === 'vehicle' ? 'block' : 'none';

  // Layout accent + page title
  const layout = document.getElementById('post-layout');
  const title  = document.getElementById('post-page-title');
  if (layout) layout.classList.toggle('vehicle-mode', t === 'vehicle');
  if (title)  title.textContent = t === 'vehicle' ? 'Машины зар нийтлэх' : 'Сэлбэгийн зар нийтлэх';
  const hint = document.getElementById('post-page-hint');
  if (hint) hint.textContent = t === 'vehicle'
    ? 'Зураг оруулаад машины үндсэн мэдээллийг л бөглөнө үү.'
    : 'Зураг оруулаад сэлбэгийн нэр, ангилал, маркыг л бөглөнө үү.';
}

// ── Sub-category: post form ───────────────────────────────
function onPostCategoryChange() {
  const cat = document.getElementById('p-category').value;
  const wrap = document.getElementById('p-subcategory-group');
  const sel  = document.getElementById('p-subcategory');
  if (!cat) { wrap.style.display = 'none'; sel.value = ''; return; }
  const subs = getSubcategoriesFor(cat);
  if (!subs.length) { wrap.style.display = 'none'; sel.value = ''; return; }
  sel.innerHTML = '<option value="">Сонгоно уу</option>' +
    subs.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.icon || '')} ${escapeHtml(s.name)}</option>`).join('');
  wrap.style.display = 'block';
}

// ── Sub-category: search filter ───────────────────────────
function onSearchCategoryChange() {
  const cat = document.getElementById('f-category').value;
  const wrap = document.getElementById('f-subcategory-group');
  const sel  = document.getElementById('f-subcategory');
  if (!cat) { wrap.style.display = 'none'; sel.value = ''; return; }
  const subs = getSubcategoriesFor(cat);
  if (!subs.length) { wrap.style.display = 'none'; sel.value = ''; return; }
  sel.innerHTML = '<option value="">Бүгд</option>' +
    subs.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.icon || '')} ${escapeHtml(s.name)}</option>`).join('');
  wrap.style.display = 'block';
}

async function submitListing() {
  const user = authGetUser();
  if (!user) { openAuthModal('login'); showToast('Эхлээд нэвтэрнэ үү', 'info'); return; }

  const listingType = document.getElementById('p-listing-type')?.value || 'part';
  const negotiable  = document.getElementById('p-negotiable')?.checked;
  const price       = negotiable ? 0 : (parseInt(priceDigits(document.getElementById('p-price').value), 10) || 0);
  const phone       = document.getElementById('p-phone').value.trim();
  let valid = true;

  // Common validation
  if (!negotiable && price <= 0) { showFieldError('p-price-err', 'Үнэ оруулна уу, эсвэл «Үнэ тохиролцоно»-г чагтална уу'); valid=false; }
  else if (price > MAX_PRICE)   { showFieldError('p-price-err', 'Үнэ хэт их байна (2 тэрбум ₮-өөс ихгүй)'); valid=false; }
  if (!phone) { showFieldError('p-phone-err', 'Утасны дугаар оруулна уу'); valid=false; }

  let payload = null, vehiclePayload = null;

  if (listingType === 'part') {
    const title    = document.getElementById('p-title').value.trim();
    const category = document.getElementById('p-category').value;
    const make     = document.getElementById('p-make').value;
    if (!title)    { showFieldError('p-title-err', 'Сэлбэгийн нэр оруулна уу'); valid=false; }
    if (!category) { showFieldError('p-cat-err',   'Ангилал сонгоно уу'); valid=false; }
    if (!make)     { showFieldError('p-make-err',  'Машины марк сонгоно уу'); valid=false; }
    if (!valid) return;
    const yearVal = parseInt(document.getElementById('p-year-from').value) || null;
    payload = {
      listing_type: 'part',
      title, category,
      subcategory: document.getElementById('p-subcategory')?.value || null,
      condition:   document.getElementById('p-condition')?.value || 'used',
      car_make:  make,
      car_model: document.getElementById('p-model').value.trim(),
      year_from: yearVal,
      year_to:   yearVal,
      part_type: document.getElementById('p-type').value,
      exchange_policy: document.getElementById('p-policy')?.value || 'no_return',
      description: document.getElementById('p-desc').value.trim(),
    };
  } else {
    // Vehicle
    const vtitle = document.getElementById('v-title').value.trim();
    const vbody  = document.getElementById('v-body-type').value;
    const vmake  = document.getElementById('v-make').value;
    const vmodel = document.getElementById('v-model').value.trim();
    const vyear  = parseInt(document.getElementById('v-year').value);
    if (!vtitle) { showFieldError('v-title-err', 'Гарчиг оруулна уу'); valid=false; }
    if (!vbody)  { showFieldError('v-body-type-err', 'Ангилал сонгоно уу'); valid=false; }
    if (!vmake)  { showFieldError('v-make-err',  'Марк сонгоно уу');   valid=false; }
    if (!vmodel) { showFieldError('v-model-err', 'Загвар оруулна уу'); valid=false; }
    if (!vyear)  { showFieldError('v-year-err',  'Үйлдвэрлэсэн он оруулна уу'); valid=false; }
    if (!valid) return;
    payload = {
      listing_type: 'vehicle',
      title: vtitle,
      category: vbody,            // body_type-г category болгож нэгтгэсэн filter-т ашиглана
      car_make: vmake,
      car_model: vmodel,
      year_from: vyear,
      year_to:   vyear,
      description: document.getElementById('v-desc').value.trim(),
    };
    vehiclePayload = {
      make: vmake,
      model: vmodel,
      year:  vyear,
      body_type: vbody,
      imported_year: parseInt(document.getElementById('v-imported-year').value) || null,
      mileage_km:    parseInt(document.getElementById('v-mileage').value) || null,
      engine_cc:     parseFloat(document.getElementById('v-engine').value) || null,
      fuel_type:     document.getElementById('v-fuel').value    || null,
      transmission:  document.getElementById('v-transmission').value || null,
      drive:         document.getElementById('v-drive').value   || null,
      steering:      document.getElementById('v-steering').value || 'left',
      color:         document.getElementById('v-color').value.trim() || null,
      color_interior:document.getElementById('v-color-interior').value.trim() || null,
      plate_region:  document.getElementById('v-plate-region').value.trim() || null,
      customs_cleared: document.getElementById('v-customs').value === 'true',
      is_barter:     document.getElementById('v-barter')?.checked || false,
      is_leasing:    document.getElementById('v-leasing')?.checked || false,
    };
  }

  const editingId = _postFormMode !== 'new' ? _postFormMode : null;
  const btn = document.getElementById('post-submit-btn');
  btn.disabled = true; btn.textContent = 'Зураг upload хийж байна...';

  try {
    const newUrls   = await uploadAllFiles(user.id);
    const imageUrls = editingId ? [...getExistingImages(), ...newUrls] : newUrls;
    btn.textContent = editingId ? 'Хадгалж байна...' : 'Зар нийтлэж байна...';

    const record = {
      ...payload,
      price,
      phone,
      shop_name: document.getElementById('p-shop').value.trim(),
      location:  document.getElementById('p-location').value.trim(),
      images:    imageUrls,
    };

    if (editingId) {
      await updateListing(editingId, record, vehiclePayload);
      // Хассан зургийг Storage-аас цэвэрлэнэ
      removeStorageImages((_editingOriginal?.images || []).filter(u => !imageUrls.includes(u)));
      _editListingId = null;
      _leaveEditMode();
      showToast('Зар шинэчлэгдлээ', 'success');
      showPage('profile', { replace: true });
      return;
    }

    await postListing(record, vehiclePayload);

    resetUpload();
    clearDraftAfterSubmit();
    const locVal = document.getElementById('p-location').value.trim();
    if (locVal) { try { localStorage.setItem('cb_last_location', locVal); } catch {} }
    resetPostForm();
    document.getElementById('post-form-wrap').style.display = 'none';
    document.getElementById('post-success').style.display   = 'block';
    showToast('Зар амжилттай нийтлэгдлээ!', 'success');
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = _postFormMode !== 'new' ? '💾 Хадгалах' : 'Зар нийтлэх';
  }
}

// ═══════════════════════════════════════════════════════════
// ЗАР ЗАСАХ — нийтлэх form-ыг дахин ашиглана
// ═══════════════════════════════════════════════════════════
let _editListingId   = null;    // URL: ?p=post&id=<зарын id>
let _postFormMode    = 'new';   // 'new' эсвэл form-д ачаалсан зарын id
let _editingOriginal = null;    // засахын өмнөх зар (хассан зургийг цэвэрлэхэд)

function startEditListing(id) {
  if (!id) return;
  _editListingId = String(id);
  showPage('post', { edit: true });
}
function editCurrentListing() {
  if (_currentListing) startEditListing(_currentListing.id);
}
function cancelEditListing() {
  _editListingId = null;
  _leaveEditMode();
  showPage('profile', { replace: true });
}

async function _enterEditMode(id) {
  const user = authGetUser();
  if (!user) {
    _setPostModeUI(false);
    openAuthModal('login');
    showToast('Зар засахын тулд нэвтэрнэ үү', 'info');
    return;
  }
  let l = null;
  try { l = await fetchListingById(id); } catch {}
  if (_editListingId !== id) return;   // хүлээх зуур өөр хуудас руу шилжсэн
  if (!l || l.user_id !== user.id) {
    showToast('Зар олдсонгүй эсвэл таных биш байна', 'error');
    _editListingId = null;
    showPage('profile', { replace: true });
    return;
  }
  const vd = l.listing_type === 'vehicle' ? await fetchVehicleDetails(l.id) : null;
  if (_editListingId !== id) return;
  resetPostForm();
  resetUpload();
  _postFormMode    = String(l.id);
  _editingOriginal = l;
  _fillPostForm(l, vd);
  _setPostModeUI(true);
}

function _leaveEditMode() {
  if (_postFormMode === 'new') { _setPostModeUI(false); return; }
  _postFormMode    = 'new';
  _editingOriginal = null;
  resetPostForm();
  resetUpload();
  _setPostModeUI(false);
}

// Гарчиг, товч, нийтлэх үеийн хэсгүүдийг горимд тааруулна
function _setPostModeUI(editing) {
  const type = document.getElementById('p-listing-type')?.value || 'part';
  document.getElementById('post-type-card').style.display = editing ? 'none' : '';
  document.getElementById('post-cancel-edit').style.display = editing ? '' : 'none';
  const btn = document.getElementById('post-submit-btn');
  btn.textContent = editing ? '💾 Хадгалах' : 'Зар нийтлэх';
  if (editing) {
    btn.disabled = false;   // хязгаар зөвхөн шинэ зарт хамаарна
    document.getElementById('draft-banner').style.display = 'none';
    document.getElementById('quota-info').style.display   = 'none';
    document.getElementById('post-page-title').textContent = type === 'vehicle' ? 'Машины зар засах' : 'Сэлбэгийн зар засах';
    document.getElementById('post-page-hint').textContent  = 'Өөрчлөх зүйлээ засаад доорх «Хадгалах» товчийг дарна уу.';
  } else {
    selectListingType(type);   // гарчиг, тайлбарыг сэргээнэ
  }
}

// Жагсаалтаас хасагдсан утга (жш: админ устгасан марк) байвал түр нэмж сонгоно
function _setFieldValue(id, v) {
  const el = document.getElementById(id);
  if (!el || v == null || v === '') return;
  if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === String(v))) {
    el.add(new Option(String(v), String(v)));
  }
  el.value = String(v);
}

function _fillPostForm(l, vd) {
  const isV = l.listing_type === 'vehicle';
  selectListingType(isV ? 'vehicle' : 'part');
  if (isV) {
    _setFieldValue('v-title',     l.title);
    _setFieldValue('v-body-type', l.category);
    _setFieldValue('v-make',      vd?.make  || l.car_make);
    _setFieldValue('v-model',     vd?.model || l.car_model);
    _setFieldValue('v-year',      vd?.year  || l.year_from);
    _setFieldValue('v-desc',      l.description);
    if (vd) {
      _setFieldValue('v-imported-year',  vd.imported_year);
      _setFieldValue('v-mileage',        vd.mileage_km);
      _setFieldValue('v-engine',         vd.engine_cc);
      _setFieldValue('v-fuel',           vd.fuel_type);
      _setFieldValue('v-transmission',   vd.transmission);
      _setFieldValue('v-drive',          vd.drive);
      _setFieldValue('v-steering',       vd.steering);
      _setFieldValue('v-color',          vd.color);
      _setFieldValue('v-color-interior', vd.color_interior);
      _setFieldValue('v-plate-region',   vd.plate_region);
      _setFieldValue('v-customs',        vd.customs_cleared === false ? 'false' : 'true');
      document.getElementById('v-barter').checked  = !!vd.is_barter;
      document.getElementById('v-leasing').checked = !!vd.is_leasing;
    }
    if (document.getElementById('v-advanced-fields').style.display === 'none') toggleVehicleAdvanced();
  } else {
    _setFieldValue('p-title',    l.title);
    _setFieldValue('p-category', l.category);
    onPostCategoryChange();
    _setFieldValue('p-subcategory', l.subcategory);
    _setFieldValue('p-make',      l.car_make);
    _setFieldValue('p-model',     l.car_model);
    _setFieldValue('p-condition', l.condition);
    _setFieldValue('p-year-from', l.year_from);
    _setFieldValue('p-policy',    l.exchange_policy);
    _setFieldValue('p-desc',      l.description);
    selectType(l.part_type === 'substitute' ? 'substitute' : 'original');
    if (document.getElementById('p-advanced-fields').style.display === 'none') togglePartAdvanced();
  }
  // Үнэ, холбоо барих
  const neg = document.getElementById('p-negotiable');
  neg.checked = !(Number(l.price) > 0);
  if (neg.checked) toggleNegotiable();
  else document.getElementById('p-price').value = String(l.price);
  updatePriceHint();
  _setFieldValue('p-phone',    l.phone);
  document.getElementById('p-shop').value = l.shop_name || '';
  _setFieldValue('p-location', l.location);
  setExistingImages(l.images);
  refreshModelSuggestions('p');
  refreshModelSuggestions('v');
}

// ═══════════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════════
async function initProfilePage() {
  const user = authGetUser();
  const prompt  = document.getElementById('profile-login-prompt');
  const content = document.getElementById('profile-content');

  if (!user) {
    prompt.style.display  = 'block';
    content.style.display = 'none';
    return;
  }
  prompt.style.display  = 'none';
  content.style.display = 'block';

  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
  document.getElementById('profile-avatar-char').textContent = initial;
  document.getElementById('profile-name-text').textContent   = user.name || 'Хэрэглэгч';
  document.getElementById('profile-phone-text').textContent  = user.email || user.phone || '';
  document.getElementById('profile-type-text').textContent   = user.user_type === 'shop' ? '🏪 Дэлгүүр' : '🛒 Худалдан авагч';

  switchProfileTab('listings');
}

function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab').forEach(b => b.classList.toggle('active', b.dataset.ptab === tab));
  document.getElementById('ptab-listings').style.display  = tab === 'listings'  ? 'block' : 'none';
  document.getElementById('ptab-favorites').style.display = tab === 'favorites' ? 'block' : 'none';
  if (tab === 'listings')  loadMyListings();
  if (tab === 'favorites') loadMyFavorites();
}

async function loadMyFavorites() {
  const container = document.getElementById('favorites-container');
  renderSkeletons('favorites-container', 4);
  try {
    const list = await fetchMyFavorites();
    if (!list.length) {
      container.innerHTML = '<div class="no-results"><div class="no-icon">❤</div><h3>Хадгалсан зар байхгүй</h3><p>Таалагдсан зар дээр зүрх (❤) дарж хадгална уу.</p></div>';
      return;
    }
    container.innerHTML = `<div class="listing-grid">${list.map(buildListingCard).join('')}</div>`;
  } catch(e) {
    container.innerHTML = renderEmptyState('error');
  }
}

async function loadMyListings() {
  const container = document.getElementById('my-listings-container');
  renderSkeletons('my-listings-container', 4);
  try {
    const listings = await myListings();
    if (!listings.length) {
      container.innerHTML = renderEmptyState('myListings');
      return;
    }
    container.innerHTML = listings.map(l => {
      const thumb = l.images?.[0]
        ? cardImg(l.images[0], l.title)
        : '';
      const sold    = !!l.sold_at;
      const expired = l.expires_at && new Date(l.expires_at) < new Date();
      const status  = l.admin_hidden ? '<span class="expiry-tag danger">🚫 Админ нуусан</span>'
                    : sold        ? '<span class="expiry-tag sold">✅ Зарагдсан</span>'
                    : !l.is_active ? '<span class="expiry-tag expired">⏸ Нуусан</span>'
                    : expiryTag(l.expires_at);
      const extendBtn = (!sold && l.expires_at)
        ? `<button class="btn-extend" onclick="doExtendListing('${l.id}')">${expired ? '🔄 Дахин нээх' : '⏱ Сунгах'}</button>`
        : '';
      const actions = sold
        ? `<button class="btn-view-listing" onclick="openDetail('${l.id}')">Харах</button>
           <button class="btn-toggle" onclick="doSetSold('${l.id}',false)">↩ Дахин зарах</button>
           <button class="btn-del" onclick="doDeleteListing('${l.id}')">Устгах</button>`
        : `<button class="btn-edit" onclick="startEditListing('${l.id}')">✏️ Засах</button>
           <button class="btn-sold" onclick="doSetSold('${l.id}',true)">✅ Зарагдсан</button>
           <button class="btn-view-listing" onclick="openDetail('${l.id}')">Харах</button>
           ${l.admin_hidden ? '' : extendBtn}
           ${l.admin_hidden ? '' : `<button class="btn-toggle" onclick="doToggleActive('${l.id}',${l.is_active})">${l.is_active ? '⏸ Түр нуух' : '▶ Нээх'}</button>`}
           <button class="btn-del" onclick="doDeleteListing('${l.id}')">Устгах</button>`;
      return `
        <div class="my-listing-card${sold ? ' is-sold' : ''}" id="mlc-${l.id}">
          <div class="my-listing-img">${thumb}</div>
          <div class="my-listing-body">
            <div class="my-listing-info">
              <div class="my-listing-title">${escapeHtml(l.title)} ${status}</div>
              <div class="my-listing-meta">${escapeHtml(l.car_make || '')} ${escapeHtml(l.car_model || '')} • ${escapeHtml(l.category || '')}</div>
            </div>
            <div class="my-listing-price">${formatPrice(l.price)}</div>
            <div class="my-listing-actions">${actions}</div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="profile-empty"><p>Алдаа гарлаа</p></div>';
  }
}

async function doDeleteListing(id) {
  if (!confirm('Зарыг устгах уу?')) return;
  try {
    await deleteListing(id);
    document.getElementById('mlc-' + id)?.remove();
    showToast('Устгагдлаа', 'success');
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  }
}

async function doSetSold(id, sold) {
  if (sold && !confirm('Энэ зарыг «Зарагдсан» гэж тэмдэглэх үү?\nЗар хайлтаас хасагдана. Дараа нь «Дахин зарах» дарж сэргээж болно.')) return;
  try {
    await setListingSold(id, sold);
    showToast(sold ? 'Баяр хүргэе! Зар «Зарагдсан» боллоо' : 'Зар дахин нийтлэгдлээ', 'success');
    await loadMyListings();
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  }
}

async function doToggleActive(id, current) {
  try {
    await toggleListingActive(id, current);
    showToast(current ? 'Идэвхгүй болголоо' : 'Идэвхтэй болголоо', 'success');
    await loadMyListings();
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  }
}

async function doExtendListing(id) {
  try {
    await extendListing(id);
    showToast('Зар сунгагдлаа', 'success');
    await loadMyListings();
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
// ── Admin page helpers (called from admin.js) ───────────────

// ═══════════════════════════════════════════════════════════
// REPORT (зар мэдээлэх) UI
// ═══════════════════════════════════════════════════════════
let _reportListingId = null;
let _reportReason = '';

function openReportModal() {
  if (!_currentListing) return;
  if (!authGetUser()) {
    openAuthModal('login');
    showToast('Зар мэдээлэхийн тулд нэвтэрнэ үү', 'info');
    return;
  }
  _reportListingId = _currentListing.id;
  _reportReason = '';
  document.getElementById('report-target-title').textContent = _currentListing.title || '';
  document.getElementById('report-comment').value = '';
  document.getElementById('report-reasons').innerHTML = Object.entries(REPORT_REASONS).map(([k, label]) =>
    `<label class="chip"><input type="radio" name="report-reason" value="${k}" onchange="_reportReason=this.value"><span>${label}</span></label>`
  ).join('');
  document.getElementById('modal-report').classList.add('open');
  routeOverlayOpened('report');
}

function closeReportModal() {
  const wasOpen = _isOpen('modal-report');
  document.getElementById('modal-report')?.classList.remove('open');
  _reportListingId = null;
  if (wasOpen) routeOverlayClosed('report');
}

async function sendReport() {
  if (!_reportListingId) return;
  if (!_reportReason) { showToast('Шалтгаанаа сонгоно уу', 'info'); return; }
  const btn = document.getElementById('report-submit-btn');
  btn.disabled = true;
  try {
    await submitReport(_reportListingId, _reportReason, document.getElementById('report-comment').value.trim());
    showToast('Баярлалаа! Мэдээлэл хүлээн авлаа', 'success');
    closeReportModal();
  } catch (e) {
    showToast(e.message === 'duplicate' ? 'Та энэ зарыг аль хэдийн мэдээлсэн байна' : 'Алдаа: ' + e.message,
      e.message === 'duplicate' ? 'info' : 'error');
    if (e.message === 'duplicate') closeReportModal();
  } finally {
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════
// RATING / REVIEW UI
// ═══════════════════════════════════════════════════════════
let _reviewShopId = null;
let _reviewShopName = '';
let _reviewSelected = 0;

function renderStars(rating, size = '') {
  const r = Math.round(Number(rating) || 0);
  const cls = size ? ` ${size}` : '';
  let html = `<span class="stars${cls}">`;
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star${i <= r ? ' filled' : ''}">★</span>`;
  }
  html += '</span>';
  return html;
}

function renderStarInput(selected = 0) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<button type="button" class="star-btn${i <= selected ? ' filled' : ''}" data-val="${i}" onclick="setReviewRating(${i})">★</button>`;
  }
  return html;
}

function setReviewRating(v) {
  _reviewSelected = v;
  const wrap = document.getElementById('review-star-input');
  if (wrap) wrap.innerHTML = renderStarInput(v);
}

function openReviewModal() {
  const user = authGetUser();
  if (!user) {
    openAuthModal('login');
    showToast('Эхлээд нэвтэрнэ үү', 'info');
    return;
  }
  if (!_currentShopId) return;
  if (user.id === _currentShopId) {
    showToast('Өөрийгөө үнэлэх боломжгүй', 'info');
    return;
  }
  _reviewShopId = _currentShopId;
  _reviewShopName = document.getElementById('shop-name-text').textContent || '';
  _reviewSelected = 0;
  document.getElementById('review-target-name').textContent = _reviewShopName;
  document.getElementById('review-comment').value = '';
  document.getElementById('review-star-input').innerHTML = renderStarInput(0);
  document.getElementById('modal-review').classList.add('open');
  routeOverlayOpened('review');
}

function closeReviewModal() {
  const wasOpen = _isOpen('modal-review');
  document.getElementById('modal-review').classList.remove('open');
  _reviewShopId = null;
  _reviewSelected = 0;
  if (wasOpen) routeOverlayClosed('review');
}

async function submitReview() {
  if (!_reviewShopId) return;
  if (_reviewSelected < 1) {
    showToast('Одыг сонгоно уу', 'info');
    return;
  }
  const comment = document.getElementById('review-comment').value.trim();
  const btn = document.getElementById('review-submit-btn');
  btn.disabled = true;
  try {
    await submitReviewRPC({
      target_user_id: _reviewShopId,
      rating: _reviewSelected,
      comment
    });
    showToast('Үнэлгээ илгээгдлээ', 'success');
    const shopId = _reviewShopId;
    closeReviewModal();
    // Refresh shop page's rating + reviews if still viewing same shop
    if (_currentShopId === shopId) {
      await loadShopRatingAndReviews(shopId);
    }
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function doDeleteReview(id) {
  if (!confirm('Үнэлгээг устгах уу?')) return;
  try {
    await deleteReviewRPC(id);
    showToast('Устгагдлаа', 'success');
    if (_currentShopId) await loadShopRatingAndReviews(_currentShopId);
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  }
}

async function loadShopRatingAndReviews(shopId) {
  const heroEl = document.getElementById('shop-rating-hero');
  const listEl = document.getElementById('shop-reviews-container');
  const btn    = document.getElementById('btn-write-review');
  if (!heroEl || !listEl) return;

  const [rating, reviews] = await Promise.all([
    fetchProfileRating(shopId),
    fetchShopReviews(shopId, 50)
  ]);

  // Rating hero
  if (rating.rating_count > 0) {
    heroEl.className = 'shop-rating-hero';
    heroEl.innerHTML = `
      <div class="shop-rating-big">${Number(rating.rating_avg).toFixed(1)}</div>
      <div class="shop-rating-info">
        ${renderStars(rating.rating_avg, 'lg')}
        <span class="rating-count-txt">${rating.rating_count} үнэлгээ</span>
      </div>`;
  } else {
    heroEl.className = 'shop-rating-hero empty';
    heroEl.innerHTML = 'Одоогоор үнэлгээ байхгүй байна.';
  }

  // Write button — зөвхөн нэвтэрсэн, өөр хэрэглэгч бол харагдана
  const user = authGetUser();
  if (btn) {
    const canWrite = !!user && user.id !== shopId && !DEMO_MODE;
    btn.style.display = canWrite ? 'inline-block' : 'none';
  }

  // Reviews list
  if (!reviews.length) {
    listEl.innerHTML = '<div class="no-results"><div class="no-icon">💬</div><p>Эхний үнэлгээг та үлдээж болно</p></div>';
    return;
  }
  listEl.innerHTML = '<div class="review-list">' + reviews.map(r => {
    const initial = escapeHtml((r.reviewer_name || 'Х').charAt(0).toUpperCase());
    const isOwn = user && user.id === r.reviewer_id;
    return `
      <div class="review-card">
        <div class="review-head">
          <div class="review-reviewer">
            <div class="review-avatar">${initial}</div>
            <div>
              <div class="review-name">${escapeHtml(r.reviewer_name)}</div>
              <div class="review-date">${formatDate(r.created_at)}</div>
            </div>
          </div>
          ${renderStars(r.rating)}
        </div>
        ${r.comment ? `<div class="review-comment">${escapeHtml(r.comment)}</div>` : ''}
        ${isOwn ? `<div class="review-actions"><button onclick="doDeleteReview('${r.id}')">Устгах</button></div>` : ''}
      </div>`;
  }).join('') + '</div>';
}

// Зөвхөн http(s), blob, локал img/ эсвэл data:image URL-г зөвшөөрнө
// Жижиг хувилбараар (thumbnail) харуулна; олдохгүй бол том зураг руу шилжинэ (initThumbFallback)
function cardImg(url, alt) {
  const full = safeImgUrl(url);
  if (!full) return '';
  return `<img src="${escapeHtml(thumbUrl(full))}" data-full="${escapeHtml(full)}" alt="${escapeHtml(alt || '')}" loading="lazy">`;
}
function initThumbFallback() {
  // error event bubble хийдэггүй тул capture-аар барина
  document.addEventListener('error', e => {
    const img = e.target;
    if (img?.tagName === 'IMG' && img.dataset.full && img.getAttribute('src') !== img.dataset.full) {
      img.src = img.dataset.full;
    }
  }, true);
}

function safeImgUrl(u) {
  const str = String(u || '').trim();
  return /^(https?:\/\/|blob:|img\/|data:image\/)/i.test(str) ? str : '';
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ═══════════════════════════════════════════════════════════
// FAVORITES
// ═══════════════════════════════════════════════════════════
async function initFavorites() {
  _favoriteIds = await fetchFavoriteIds();
}

async function doToggleFavorite(listingId, btn) {
  const user = authGetUser();
  if (!user) {
    openAuthModal('login');
    showToast('Эхлээд нэвтэрнэ үү', 'info');
    return;
  }
  const willBeOn = !_favoriteIds.has(listingId);
  try {
    await toggleFavorite(listingId, willBeOn);
    if (willBeOn) _favoriteIds.add(listingId); else _favoriteIds.delete(listingId);
    if (btn) {
      btn.classList.toggle('active', willBeOn);
      btn.textContent = willBeOn ? '❤' : '♡';
    }
    showToast(willBeOn ? '❤ Хадгалагдлаа' : 'Хадгалгаас хасагдлаа', 'success');
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// RECENTLY VIEWED (localStorage)
// ═══════════════════════════════════════════════════════════
const RECENT_KEY   = 'cb_recent_viewed_v1';
const RECENT_LIMIT = 12;

function addToRecentlyViewed(listing) {
  if (!listing || !listing.id) return;
  let list = [];
  try { list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch {}
  list = list.filter(l => l.id !== listing.id);
  const slim = {
    id: listing.id, title: listing.title, price: listing.price,
    images: (listing.images || []).slice(0,1),
    car_make: listing.car_make, car_model: listing.car_model,
    year_from: listing.year_from, year_to: listing.year_to,
    category: listing.category, listing_type: listing.listing_type,
    part_type: listing.part_type, exchange_policy: listing.exchange_policy,
    condition: listing.condition, shop_name: listing.shop_name,
    is_vip: listing.is_vip, is_verified: listing.is_verified,
    created_at: listing.created_at,
  };
  list.unshift(slim);
  list = list.slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
}

function getRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function loadRecentlyViewed() {
  const list = getRecentlyViewed();
  const section = document.getElementById('recent-section');
  const grid    = document.getElementById('recent-grid');
  if (!section || !grid) return;
  if (!list.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  grid.innerHTML = list.map(buildListingCard).join('');
}

// ═══════════════════════════════════════════════════════════
// SHOP PROFILE PAGE
// ═══════════════════════════════════════════════════════════
async function openShop(userId, shopName) {
  if (!userId) {
    showToast('Дэлгүүрийн мэдээлэл олдсонгүй', 'info');
    return;
  }
  _currentShopId = userId;
  showPage('shop');   // зар нээлттэй байсан бол showPage нууна; Буцах дарахад зар руу эргэнэ
}

function initShopPage() {
  if (!_currentShopId) {
    document.getElementById('shop-listings-container').innerHTML = renderEmptyState('error');
    return;
  }
  loadShopProfile(_currentShopId);
}

async function loadShopProfile(userId) {
  renderSkeletons('shop-listings-container', 8);

  // ── Fetch shop profile ─────────────────────────────────
  let profile = null;
  if (!DEMO_MODE) {
    try {
      // Нийтийн багануудыг л уншина (email орохгүй)
      const { data } = await sb.from('profiles').select(PUBLIC_PROFILE_COLS).eq('id', userId).maybeSingle();
      profile = data;
    } catch(e) { /* handled below */ }
  }

  // ── Fetch shop's listings ──────────────────────────────
  let listings = [];
  let totalViews = 0;
  let totalCount = 0;
  if (DEMO_MODE) {
    listings = DEMO_LISTINGS.filter(l => l.user_id === userId);
    totalCount = listings.length;
    totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0);
    if (!profile && listings.length) {
      profile = {
        id: userId,
        shop_name: listings[0].shop_name,
        name: listings[0].shop_name,
        phone: listings[0].phone || '',
        user_type: 'shop',
        is_verified: false,
        created_at: listings[0].created_at,
      };
    }
  } else {
    try {
      const { data: active } = await sb
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });
      listings = active || [];

      const { count } = await sb
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      totalCount = count || 0;

      totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0);
    } catch(e) { console.warn('Shop listings failed:', e.message); }
  }

  // ── Render header ──────────────────────────────────────
  const displayName = profile?.shop_name || profile?.name || 'Дэлгүүр';
  const initial = displayName.charAt(0).toUpperCase();
  document.getElementById('shop-avatar-lg').textContent = initial;
  document.getElementById('shop-name-text').textContent = displayName;
  document.getElementById('shop-verified').style.display = profile?.is_verified ? 'inline-flex' : 'none';

  const loc = listings[0]?.location || '';
  document.getElementById('shop-loc-text').textContent = loc ? '📍 ' + loc : '';

  const phone = profile?.phone || listings[0]?.phone || '';
  document.getElementById('shop-phone-text').textContent = phone ? '📞 +976 ' + phone.replace(/^\+976/, '') : '';

  const since = profile?.created_at ? new Date(profile.created_at).getFullYear() : '';
  document.getElementById('shop-since-text').textContent = since ? `📅 ${since} оноос` : '';

  const callBtn = document.getElementById('shop-call-btn');
  if (phone) {
    callBtn.href = 'tel:+976' + phone.replace(/^\+976/, '');
    callBtn.style.display = 'inline-block';
  } else {
    callBtn.style.display = 'none';
  }

  // ── Stats ──────────────────────────────────────────────
  document.getElementById('shop-stat-active').textContent = listings.length;
  document.getElementById('shop-stat-total').textContent  = totalCount;
  document.getElementById('shop-stat-views').textContent  = totalViews;

  // ── Listings grid ──────────────────────────────────────
  renderGrid(listings, 'shop-listings-container', { emptyType: 'search' });

  // ── Rating + reviews (async, doesn't block listings) ───
  loadShopRatingAndReviews(userId);
}

// ═══════════════════════════════════════════════════════════
// SHOPS BROWSE PAGE
// ═══════════════════════════════════════════════════════════
let _allShops = [];

async function initShopsPage() {
  document.getElementById('shops-container').innerHTML =
    '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    _allShops = await fetchShops();
    applyShopsFilter();
  } catch(e) {
    document.getElementById('shops-container').innerHTML = renderEmptyState('error');
  }
}

function applyShopsFilter() {
  const search = (document.getElementById('shops-search-input')?.value || '').trim().toLowerCase();
  const verifiedOnly = document.getElementById('shops-verified-only')?.checked || false;
  const sort = document.getElementById('shops-sort')?.value || 'rating';

  let list = [..._allShops];
  if (verifiedOnly) list = list.filter(s => s.is_verified);
  if (search) list = list.filter(s =>
    (s.shop_name || '').toLowerCase().includes(search) ||
    (s.name || '').toLowerCase().includes(search)
  );

  list.sort((a, b) => {
    if (sort === 'rating') {
      if ((b.rating_avg || 0) !== (a.rating_avg || 0)) return (b.rating_avg || 0) - (a.rating_avg || 0);
      return (b.rating_count || 0) - (a.rating_count || 0);
    }
    if (sort === 'listings') return (b.active_listings || 0) - (a.active_listings || 0);
    if (sort === 'newest')   return new Date(b.created_at) - new Date(a.created_at);
    if (sort === 'name')     return (a.shop_name || '').localeCompare(b.shop_name || '');
    return 0;
  });

  // Verified prioritized within same category (still sortable by chosen)
  if (sort === 'rating' || sort === 'listings') {
    list.sort((a, b) => {
      if (a.is_verified === b.is_verified) return 0;
      return a.is_verified ? -1 : 1;
    });
  }

  renderShopsGrid(list);
}

function renderShopsGrid(shops) {
  const line = document.getElementById('shops-count-line');
  const container = document.getElementById('shops-container');
  if (line) line.innerHTML = `<strong>${shops.length}</strong> дэлгүүр олдлоо`;

  if (!shops.length) {
    container.innerHTML = `<div class="no-results"><div class="no-icon">🏪</div><h3>Дэлгүүр олдсонгүй</h3><p>Шүүлтээ өөрчилж дахин үзнэ үү.</p></div>`;
    return;
  }

  container.innerHTML = '<div class="shops-grid">' + shops.map(s => {
    const initial = (s.shop_name || 'S').charAt(0).toUpperCase();
    const verifiedTag = s.is_verified ? '<span class="verified-badge" title="Баталгаажсан"></span>' : '';
    const ratingHtml = (s.rating_count > 0)
      ? `<div class="shop-card-rating">${renderStars(s.rating_avg, 'sm')}<span class="rating-num">${Number(s.rating_avg).toFixed(1)}</span><span>(${s.rating_count})</span></div>`
      : `<div class="shop-card-rating empty">Үнэлгээ байхгүй</div>`;
    const metaParts = [];
    metaParts.push(`<span class="meta-item">📦 ${s.active_listings || 0} зар</span>`);
    if (s.location) metaParts.push(`<span class="meta-item">📍 ${escapeHtml(s.location)}</span>`);
    return `
      <div class="shop-card${s.is_verified ? ' verified' : ''}" onclick="openShop('${s.id}')">
        <div class="shop-card-avatar">${initial}</div>
        <div class="shop-card-body">
          <div class="shop-card-name">${escapeHtml(s.shop_name || 'Дэлгүүр')}${verifiedTag}</div>
          ${ratingHtml}
          <div class="shop-card-meta">${metaParts.join('')}</div>
        </div>
      </div>`;
  }).join('') + '</div>';
}

// ═══════════════════════════════════════════════════════════
// PWA — service worker + install prompt
// ═══════════════════════════════════════════════════════════
let _pwaInstallPromptEvent = null;

function initPWA() {
  // Register service worker (only on https / localhost)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err =>
        console.warn('SW registration failed:', err)
      );
    });
  }

  // Capture install prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _pwaInstallPromptEvent = e;
    // Хэрэглэгч 3 удаа dismiss хийсэн бол дахин үзүүлэхгүй
    const dismissCount = parseInt(localStorage.getItem('cb_pwa_dismiss') || '0');
    if (dismissCount < 3) {
      setTimeout(() => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner && !isPWAInstalled()) banner.classList.add('visible');
      }, 8000);
    }
  });

  // Suulgasan bol banner huulahgui
  window.addEventListener('appinstalled', () => {
    dismissPWA();
    showToast('✅ Апп амжилттай суугдлаа!', 'success');
  });
}

function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

async function installPWA() {
  if (!_pwaInstallPromptEvent) {
    showToast('Suulgah сонголт одоохондоо боломжгүй байна', 'info');
    return;
  }
  _pwaInstallPromptEvent.prompt();
  const { outcome } = await _pwaInstallPromptEvent.userChoice;
  _pwaInstallPromptEvent = null;
  document.getElementById('pwa-install-banner')?.classList.remove('visible');
  if (outcome === 'accepted') showToast('Суулгаж байна...', 'info');
}

function dismissPWA() {
  document.getElementById('pwa-install-banner')?.classList.remove('visible');
  const count = parseInt(localStorage.getItem('cb_pwa_dismiss') || '0');
  localStorage.setItem('cb_pwa_dismiss', String(count + 1));
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initThumbFallback();

  // Init data defaults and populate all dropdowns + dynamic UI
  initDataDefaults();
  populateAllDropdowns();

  // Supabase-с бодит ангилал/маркыг арын хэсэгт татаж, шинэчилнэ
  loadDataFromSupabase().then(refreshed => {
    if (refreshed) populateAllDropdowns();
  });

  // Restore session
  const user = await authLoadSession();
  if (user) {
    updateAuthUI(user);
    await initFavorites();
  }

  // Render icon picker in admin modal
  renderIconPicker();

  // URL-аас хуудас/зарыг нээнэ (?p=search, ?zar=<id>, хуучин ?action=post)
  routeInit();

  // PWA registration + install prompt
  initPWA();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const lightboxOpen = document.getElementById('modal-lightbox')?.classList.contains('open');
    if (lightboxOpen) {
      if (e.key === 'Escape')      closeLightbox();
      else if (e.key === 'ArrowLeft')  lightboxNav(-1);
      else if (e.key === 'ArrowRight') lightboxNav(1);
      return;
    }
    if (e.key === 'Escape') {
      // Буцах товчтой адил: зөвхөн хамгийн дээд талын цонхыг хаана
      closeAdminModal();
      if (_isOpen('modal-auth'))        closeAuthModal();
      else if (_isOpen('modal-report')) closeReportModal();
      else if (_isOpen('modal-review')) closeReviewModal();
      else if (isDetailOpen())          closeDetail();
      else                              closeMobileNav();
    }
  });
});
