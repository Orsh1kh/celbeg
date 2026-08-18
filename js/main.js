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

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  closeMobileNav();

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
  document.getElementById('mobile-nav').classList.toggle('open');
  document.getElementById('mobile-overlay').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobile-nav').classList.remove('open');
  document.getElementById('mobile-overlay').classList.remove('open');
}

// ── Category nav bar ───────────────────────────────────────
function selectCatNav(btn, cat) {
  document.querySelectorAll('.cat-nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  goSearchCat(cat);
}

// ── Listing type nav (Part / Vehicle) ─────────────────────
function selectListingTypeNav(t) {
  _listingTypeNav = t;
  document.querySelectorAll('.type-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lt === t)
  );
  // Category nav + grid + sidebar dropdown-г source-оор нь сольж бөглөнө
  populateCategoryNavAndGrid();
  // Home page-т байвал шинэчилнэ, эсрэг тохиолдолд Search руу
  const activePage = document.querySelector('.page.active')?.id;
  if (activePage === 'page-home')       initHomePage();
  else if (activePage === 'page-search') { _searchPage = 0; loadSearchResults(true); }
  else showPage('home');
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
}
function closeAuthModal() {
  document.getElementById('modal-auth').classList.remove('open');
  resetAuthForms();
}
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-' + tab).classList.add('active');
}
function resetAuthForms() {
  ['login-phone','login-otp','reg-name','reg-phone','reg-otp','reg-shop'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['login-otp-wrap','reg-otp-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
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

// ── OTP send ───────────────────────────────────────────────
async function sendLoginOTP() {
  const phone = document.getElementById('login-phone').value.trim();
  if (phone.length < 8) { showFieldError('login-phone-err', 'Утасны дугаар оруулна уу'); return; }
  showFieldError('login-phone-err', '');
  await authSendOTP(phone, 'login');
}
async function sendRegOTP() {
  const phone = document.getElementById('reg-phone').value.trim();
  if (phone.length < 8) { showFieldError('reg-phone-err', 'Утасны дугаар оруулна уу'); return; }
  showFieldError('reg-phone-err', '');
  await authSendOTP(phone, 'register');
}

// ── Submit login ────────────────────────────────────────────
async function submitLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const otp   = document.getElementById('login-otp').value.trim();
  if (!phone) { showFieldError('login-phone-err', 'Утасны дугаар оруулна уу'); return; }
  if (!otp)   { showFieldError('login-otp-err', 'OTP код оруулна уу'); return; }

  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true; btn.textContent = 'Шалгаж байна...';
  try {
    const user = await authVerifyOTP(phone, otp, 'login');
    updateAuthUI(user);
    closeAuthModal();
    showToast('Амжилттай нэвтэрлээ!', 'success');
  } catch(e) {
    showFieldError('login-otp-err', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Нэвтрэх';
  }
}

// ── Submit register ─────────────────────────────────────────
async function submitRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const otp   = document.getElementById('reg-otp').value.trim();
  let valid = true;
  if (!name)  { showFieldError('reg-name-err', 'Нэр оруулна уу'); valid=false; }
  if (!phone) { showFieldError('reg-phone-err', 'Утасны дугаар оруулна уу'); valid=false; }
  if (!otp)   { showFieldError('reg-otp-err', 'OTP код оруулна уу'); valid=false; }
  if (!valid) return;

  const btn = document.getElementById('reg-submit-btn');
  btn.disabled = true; btn.textContent = 'Бүртгэж байна...';
  try {
    const user = await authVerifyOTP(phone, otp, 'register');
    updateAuthUI(user);
    closeAuthModal();
    showToast('Амжилттай бүртгүүллээ!', 'success');
  } catch(e) {
    showFieldError('reg-otp-err', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Бүртгүүлэх';
  }
}

// ── Auth UI state ───────────────────────────────────────────
function updateAuthUI(user) {
  const guestBtns = document.getElementById('guest-btns');
  const userBtns  = document.getElementById('user-btns');
  const mobAuth   = document.getElementById('mob-auth-area');
  const mobUser   = document.getElementById('mob-user-area');

  if (user) {
    const initial = (user.name || user.phone || 'U').charAt(0).toUpperCase();
    const displayName = user.name || user.phone || 'Хэрэглэгч';

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
  updateAuthUI(null);
  showToast('Гарлаа', 'info');
  showPage('home');
}

// ═══════════════════════════════════════════════════════════
// LISTING CARD BUILDER
// ═══════════════════════════════════════════════════════════
function buildListingCard(l) {
  const img = l.images?.[0]
    ? `<img src="${l.images[0]}" alt="${l.title}" loading="lazy">`
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

  const yearTxt = (l.year_from && l.year_to)
    ? (l.year_from === l.year_to ? `${l.year_from}` : `${l.year_from}–${l.year_to}`)
    : (l.year_from ? `${l.year_from}` : '');
  const cond = conditionMeta(l.condition);
  const condBadge = cond ? `<span class="condition-badge ${l.condition}">${cond.short}</span>` : '';
  const isVehicle = l.listing_type === 'vehicle';
  const vehicleTag = isVehicle ? '<div class="card-vehicle-tag">🚗 Машин</div>' : '';
  const carMeta = [l.car_make, l.car_model, yearTxt].filter(Boolean).join(' ');

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
      </div>
      <div class="card-body">
        <div class="card-price">${formatPrice(l.price)}</div>
        <div class="card-title">${l.title}</div>
        <div class="card-meta">${carMeta || l.category || ''}${isVehicle ? '' : condBadge}</div>
        <div class="card-footer">
          <span ${shopClickable}>${isVehicle ? '👤' : '🏪'} ${l.shop_name || 'Хувь хүн'}${verified}</span>
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
  if (f.category)                        count++;
  if (f.subcategory)                     count++;
  if (f.car_makes && f.car_makes.length) count += f.car_makes.length;
  if (f.car_model)                       count++;
  if (f.year_from)                       count++;
  if (f.year_to)                         count++;
  if (f.price_min)                       count++;
  if (f.price_max)                       count++;
  if (f.part_type)                       count++;
  if (f.condition)                       count++;
  if (f.exchange_policy)                 count++;
  if (f.locations && f.locations.length) count += f.locations.length;
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
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
}
function closeLightbox() {
  document.getElementById('modal-lightbox').classList.remove('open');
  document.body.style.overflow = '';
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
  img.src = _lightboxImages[_lightboxIdx] || '';
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
  await loadSearchResults(true);
}

function getFilters() {
  const makes = Array.from(document.querySelectorAll('input[name="f-make-cb"]:checked')).map(i => i.value);
  const locs  = Array.from(document.querySelectorAll('input[name="f-loc-cb"]:checked')).map(i => i.value);
  return {
    category:        document.getElementById('f-category').value,
    subcategory:     document.getElementById('f-subcategory')?.value || '',
    car_makes:       makes,
    car_model:       document.getElementById('f-model').value.trim(),
    year_from:       document.getElementById('f-year-from').value,
    year_to:         document.getElementById('f-year-to').value,
    price_min:       document.getElementById('f-price-min').value,
    price_max:       document.getElementById('f-price-max').value,
    part_type:       document.querySelector('input[name="f-type"]:checked')?.value || '',
    condition:       document.querySelector('input[name="f-condition"]:checked')?.value || '',
    exchange_policy: document.querySelector('input[name="f-policy"]:checked')?.value || '',
    locations:       locs,
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

async function loadSearchResults(reset = false) {
  if (reset) {
    _searchPage = 0;
    renderSkeletons('search-listings-container', 8);
    document.getElementById('results-count').textContent = 'Хайж байна...';
  }
  updateFilterCountBadge();
  try {
    const filters = { ...getFilters(), ..._searchFilters, page: _searchPage, withCount: reset, listing_type: _listingTypeNav };
    const res = await fetchListings(filters);
    const listings = reset ? res.data : res;
    if (reset && typeof res.count === 'number') _searchTotalCount = res.count;

    const container = document.getElementById('search-listings-container');
    if (reset) {
      renderGrid(listings, 'search-listings-container', { emptyType: 'search' });
      document.getElementById('results-count').innerHTML =
        `<strong>${_searchTotalCount || listings.length}</strong> зар олдлоо`;
    } else {
      const grid = container.querySelector('.listing-grid');
      if (grid) grid.insertAdjacentHTML('beforeend', listings.map(buildListingCard).join(''));
    }
    updateLoadMoreButton('search-load-more', _searchPage, _searchTotalCount, listings.length);
  } catch(e) {
    document.getElementById('search-listings-container').innerHTML = renderEmptyState('error');
  }
}

function applyFilters() {
  _searchFilters = {};
  loadSearchResults(true);
}

function resetFilters() {
  document.getElementById('f-category').value = '';
  document.getElementById('f-model').value = '';
  document.getElementById('f-year-from').value = '';
  document.getElementById('f-year-to').value = '';
  document.getElementById('f-price-min').value = '';
  document.getElementById('f-price-max').value = '';
  document.querySelector('input[name="f-type"]').checked = true;
  const firstPolicy = document.querySelector('input[name="f-policy"]');
  if (firstPolicy) firstPolicy.checked = true;
  const firstCond = document.querySelector('input[name="f-condition"]');
  if (firstCond) firstCond.checked = true;
  const subEl = document.getElementById('f-subcategory');
  if (subEl) subEl.value = '';
  document.getElementById('f-subcategory-group').style.display = 'none';
  document.querySelectorAll('input[name="f-make-cb"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="f-loc-cb"]').forEach(cb => cb.checked = false);
  document.getElementById('sort-select').value = 'newest';
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
  const heroMake = document.getElementById('hero-mark').value;
  _searchFilters = {
    car_makes: heroMake ? [heroMake] : [],
    car_model: document.getElementById('hero-model').value.trim(),
    category:  document.getElementById('hero-cat').value,
    keyword:   document.getElementById('hero-keyword').value.trim(),
  };
  showPage('search');
  // sync sidebar
  if (heroMake) {
    const cb = document.querySelector(`input[name="f-make-cb"][value="${heroMake}"]`);
    if (cb) cb.checked = true;
  }
  if (_searchFilters.car_model) document.getElementById('f-model').value    = _searchFilters.car_model;
  if (_searchFilters.category)  document.getElementById('f-category').value = _searchFilters.category;
  loadSearchResults(true);
}

// ═══════════════════════════════════════════════════════════
// LISTING DETAIL
// ═══════════════════════════════════════════════════════════
async function openDetail(id) {
  try {
    const l = await fetchListingById(id);
    if (!l) return;
    _currentListing = l;
    incrementView(id);

    // Images
    const mainWrap = document.getElementById('detail-main-img-wrap');
    const thumbsWrap = document.getElementById('detail-thumbs');
    if (l.images?.length) {
      const imgsJson = encodeURIComponent(JSON.stringify(l.images));
      mainWrap.innerHTML = `<img src="${l.images[0]}" alt="${l.title}" onclick="openLightbox(JSON.parse(decodeURIComponent('${imgsJson}')), 0)">`;
      thumbsWrap.innerHTML = l.images.map((url, i) =>
        `<div class="gallery-thumb ${i===0?'active':''}" onclick="switchDetailImg(this,'${url}',${i})"><img src="${url}" loading="lazy"></div>`
      ).join('');
      _currentListingImages = l.images;
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
      `<span class="detail-badge category">${l.category || ''}${l.subcategory ? ' / ' + l.subcategory : ''}</span>` +
      (l.is_vip ? '<span class="detail-badge vip">⭐ VIP</span>' : '') +
      (cond ? `<span class="detail-badge ${cond.cls}">${cond.short}</span>` : '') +
      (policy ? `<span class="detail-badge ${policy.cls}">${policy.short}</span>` : '');

    document.getElementById('detail-price').textContent = formatPrice(l.price);
    document.getElementById('detail-title').textContent = l.title;

    // Car info (extended for vehicles)
    const carRows = [
      l.car_make  ? ['Марк', l.car_make] : null,
      l.car_model ? ['Загвар', l.car_model] : null,
      (l.year_from || l.year_to) ? ['Он', l.year_from && l.year_to && l.year_from !== l.year_to ? `${l.year_from}–${l.year_to}` : `${l.year_from || l.year_to}`] : null,
    ].filter(Boolean);
    document.getElementById('detail-car').innerHTML = carRows.map(([k,v]) =>
      `<div class="detail-car-row"><span>${k}</span><span>${v}</span></div>`
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
          `<div class="detail-car-row"><span>${k}</span><span>${v}</span></div>`
        ).join('');
      }
    }

    document.getElementById('detail-desc').textContent = l.description || 'Тайлбар байхгүй';

    // Shop
    const shopInitial = (l.shop_name || l.phone || 'Х').charAt(0).toUpperCase();
    const verifiedIcon = l.is_verified ? '<span class="verified-badge" title="Баталгаажсан дэлгүүр"></span>' : '';
    const shopClickHandler = (l.user_id && l.shop_name)
      ? `onclick="closeDetail();openShop('${l.user_id}')" class="detail-shop-info clickable"`
      : 'class="detail-shop-info"';
    document.getElementById('detail-shop').innerHTML = `
      <div class="detail-shop-avatar">${shopInitial}</div>
      <div ${shopClickHandler}>
        <div class="detail-shop-name">${l.shop_name || 'Хувь хүн'}${verifiedIcon}</div>
        <div class="detail-shop-loc">📍 ${l.location || 'Байршил тодорхойгүй'}</div>
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
    const phone = l.phone ? '+976' + l.phone.replace(/^\+976/, '') : '';
    document.getElementById('detail-call-btn').href = phone ? `tel:${phone}` : '#';
    document.getElementById('detail-wa-btn').href   = phone ? `https://wa.me/${phone.replace('+','')}` : '#';

    document.getElementById('detail-date').textContent  = formatDate(l.created_at);
    document.getElementById('detail-views').textContent = `👁 ${l.view_count || 0} үзэлт`;

    document.getElementById('modal-detail').classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch(e) {
    showToast('Зар ачаалахад алдаа гарлаа', 'error');
  }
}

function switchDetailImg(thumb, url, idx) {
  const mainImg = document.querySelector('#detail-main-img-wrap img');
  if (mainImg) {
    mainImg.setAttribute('src', url);
    if (typeof idx === 'number') {
      mainImg.onclick = () => openLightbox(_currentListingImages, idx);
    }
  }
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function closeDetail() {
  document.getElementById('modal-detail').classList.remove('open');
  document.body.style.overflow = '';
  _currentListing = null;
}

// ═══════════════════════════════════════════════════════════
// POST LISTING
// ═══════════════════════════════════════════════════════════
async function initPostPage() {
  document.getElementById('post-form-wrap').style.display = 'block';
  document.getElementById('post-success').style.display   = 'none';
  initUploadZone('upload-zone', 'upload-preview');
  // Header type nav-с автоматаар default type-г сонгоно
  selectListingType(_listingTypeNav || 'part');
  await refreshQuotaInfo();
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
    subs.map(s => `<option value="${s.name}">${s.icon || ''} ${s.name}</option>`).join('');
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
    subs.map(s => `<option value="${s.name}">${s.icon || ''} ${s.name}</option>`).join('');
  wrap.style.display = 'block';
}

async function submitListing() {
  const user = authGetUser();
  if (!user) { openAuthModal('login'); showToast('Эхлээд нэвтэрнэ үү', 'info'); return; }

  const listingType = document.getElementById('p-listing-type')?.value || 'part';
  const price       = document.getElementById('p-price').value;
  const phone       = document.getElementById('p-phone').value.trim();
  let valid = true;

  // Common validation
  if (!price) { showFieldError('p-price-err', 'Үнэ оруулна уу'); valid=false; }
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

  const btn = document.getElementById('post-submit-btn');
  btn.disabled = true; btn.textContent = 'Зураг upload хийж байна...';

  try {
    const imageUrls = await uploadAllFiles(user.id);
    btn.textContent = 'Зар нийтлэж байна...';

    await postListing({
      ...payload,
      price:     parseInt(price),
      phone,
      shop_name: document.getElementById('p-shop').value.trim(),
      location:  document.getElementById('p-location').value.trim(),
      images:    imageUrls,
    }, vehiclePayload);

    resetUpload();
    document.getElementById('post-form-wrap').style.display = 'none';
    document.getElementById('post-success').style.display   = 'block';
    showToast('Зар амжилттай нийтлэгдлээ!', 'success');
  } catch(e) {
    showToast('Алдаа: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Зар нийтлэх';
  }
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

  const initial = (user.name || user.phone || 'U').charAt(0).toUpperCase();
  document.getElementById('profile-avatar-char').textContent = initial;
  document.getElementById('profile-name-text').textContent   = user.name || 'Хэрэглэгч';
  document.getElementById('profile-phone-text').textContent  = user.phone || '';
  document.getElementById('profile-type-text').textContent   = user.user_type === 'shop' ? '🏪 Дэлгүүр' : '🛒 Худалдан авагч';

  await loadMyListings();
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
        ? `<img src="${l.images[0]}" alt="${l.title}" loading="lazy">`
        : '';
      const expTag = expiryTag(l.expires_at);
      const expired = l.expires_at && new Date(l.expires_at) < new Date();
      const extendBtn = (l.expires_at)
        ? `<button class="btn-extend" onclick="doExtendListing('${l.id}')">${expired ? '🔄 Дахин нээх' : '⏱ Сунгах'}</button>`
        : '';
      return `
        <div class="my-listing-card" id="mlc-${l.id}">
          <div class="my-listing-img">${thumb}</div>
          <div class="my-listing-body">
            <div class="my-listing-info">
              <div class="my-listing-title">${l.title} ${expTag}</div>
              <div class="my-listing-meta">${l.car_make || ''} ${l.car_model || ''} • ${l.category || ''}</div>
            </div>
            <div class="my-listing-price">${formatPrice(l.price)}</div>
            <div class="my-listing-actions">
              <button class="btn-view-listing" onclick="openDetail('${l.id}')">Харах</button>
              ${extendBtn}
              <button class="btn-toggle" onclick="doToggleActive('${l.id}',${l.is_active})">${l.is_active ? 'Идэвхгүй' : 'Идэвхтэй'}</button>
              <button class="btn-del" onclick="doDeleteListing('${l.id}')">Устгах</button>
            </div>
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
function adminAddNew() {
  if (_adminTab === 'categories') openAddCat();
  else openAddMark();
}
function adminResetDefaults() {
  resetToDefaults(_adminTab);
}

// ── Admin tab switch — show/hide bulk button ────────────────
const _origAdminSwitchTab = adminSwitchTab;
function adminSwitchTab(tab) {
  _origAdminSwitchTab(tab);
  const bulkBtn = document.getElementById('admin-bulk-btn');
  if (bulkBtn) bulkBtn.style.display = tab === 'marks' ? 'inline-flex' : 'none';
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
}

function closeReviewModal() {
  document.getElementById('modal-review').classList.remove('open');
  _reviewShopId = null;
  _reviewSelected = 0;
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
    const initial = (r.reviewer_name || 'Х').charAt(0).toUpperCase();
    const isOwn = user && user.id === r.reviewer_id;
    return `
      <div class="review-card">
        <div class="review-head">
          <div class="review-reviewer">
            <div class="review-avatar">${initial}</div>
            <div>
              <div class="review-name">${r.reviewer_name}</div>
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

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
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
  showPage('shop');
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
      const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
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

// URL shortcut handler (?action=post|shops|search)
function handleUrlAction() {
  const params = new URLSearchParams(location.search);
  const action = params.get('action');
  if (!action) return;
  const map = { post: 'post', shops: 'shops', search: 'search', profile: 'profile' };
  if (map[action]) {
    // clean URL so refresh doesn't loop
    history.replaceState({}, '', location.pathname);
    setTimeout(() => showPage(map[action]), 100);
  }
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  // Init data defaults and populate all dropdowns + dynamic UI
  initDataDefaults();
  populateAllDropdowns();

  // Supabase-с бодит ангилал/маркыг арын хэсэгт татаж, шинэчилнэ
  loadDataFromSupabase().then(refreshed => {
    if (refreshed) populateAllDropdowns();
  });

  // Restore session
  const user = await authLoadSession();
  if (user) updateAuthUI(user);

  // Render icon picker in admin modal
  renderIconPicker();

  initHomePage();

  // PWA registration + install prompt
  initPWA();

  // Handle ?action= URL shortcut (from manifest shortcuts)
  handleUrlAction();

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
      closeReviewModal();
      closeDetail();
      closeAuthModal();
      closeAdminModal();
    }
  });
});
