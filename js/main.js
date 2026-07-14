// ═══════════════════════════════════════════════════════════
// CELBEG.MN — Main App
// ═══════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────
let _homePage   = 0;
let _searchPage = 0;
let _searchFilters = {};
let _currentListing = null;
let _currentListingImages = [];

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

  const carMeta = [l.car_make, l.car_model, l.year_from && l.year_to ? `${l.year_from}–${l.year_to}` : ''].filter(Boolean).join(' ');

  return `
    <div class="listing-card${l.is_vip ? ' vip-card' : ''}" onclick="openDetail('${l.id}')">
      <div class="card-img">
        ${img}
        <div class="card-badge ${badgeClass}">${badgeText}</div>
        ${vipTag}
      </div>
      <div class="card-body">
        <div class="card-price">${formatPrice(l.price)}</div>
        <div class="card-title">${l.title}</div>
        <div class="card-meta">${carMeta || l.category || ''}</div>
        <div class="card-footer">
          <span class="card-shop">🏪 ${l.shop_name || 'Хувь хүн'}</span>
          <span class="card-date">${formatDate(l.created_at)}</span>
        </div>
      </div>
    </div>`;
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
  if (f.category)  count++;
  if (f.car_make)  count++;
  if (f.car_model) count++;
  if (f.year_from) count++;
  if (f.year_to)   count++;
  if (f.price_min) count++;
  if (f.price_max) count++;
  if (f.part_type) count++;
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
    const listings = await fetchListings({ sort: 'newest', page: _homePage });
    const container = document.getElementById('home-listings-container');
    if (reset) {
      renderGrid(listings, 'home-listings-container', { emptyType: 'home' });
    } else {
      const grid = container.querySelector('.listing-grid');
      if (grid) grid.insertAdjacentHTML('beforeend', listings.map(buildListingCard).join(''));
      else renderGrid(listings, 'home-listings-container', { emptyType: 'home' });
    }
    document.getElementById('home-load-more').style.display = listings.length >= PAGE_SIZE ? 'block' : 'none';
  } catch(e) {
    document.getElementById('home-listings-container').innerHTML = renderEmptyState('error');
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
  return {
    category:  document.getElementById('f-category').value,
    car_make:  document.getElementById('f-make').value,
    car_model: document.getElementById('f-model').value.trim(),
    year_from: document.getElementById('f-year-from').value,
    year_to:   document.getElementById('f-year-to').value,
    price_min: document.getElementById('f-price-min').value,
    price_max: document.getElementById('f-price-max').value,
    part_type: document.querySelector('input[name="f-type"]:checked')?.value || '',
    sort:      document.getElementById('sort-select').value,
  };
}

async function loadSearchResults(reset = false) {
  if (reset) {
    _searchPage = 0;
    renderSkeletons('search-listings-container', 8);
    document.getElementById('results-count').textContent = 'Хайж байна...';
  }
  updateFilterCountBadge();
  try {
    const filters = { ...getFilters(), ..._searchFilters, page: _searchPage };
    const listings = await fetchListings(filters);
    const container = document.getElementById('search-listings-container');
    if (reset) {
      renderGrid(listings, 'search-listings-container', { emptyType: 'search' });
      document.getElementById('results-count').innerHTML =
        `<strong>${listings.length}</strong> зар олдлоо`;
    } else {
      const grid = container.querySelector('.listing-grid');
      if (grid) grid.insertAdjacentHTML('beforeend', listings.map(buildListingCard).join(''));
    }
    document.getElementById('search-load-more').style.display = listings.length >= PAGE_SIZE ? 'block' : 'none';
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
  document.getElementById('f-make').value = '';
  document.getElementById('f-model').value = '';
  document.getElementById('f-year-from').value = '';
  document.getElementById('f-year-to').value = '';
  document.getElementById('f-price-min').value = '';
  document.getElementById('f-price-max').value = '';
  document.querySelector('input[name="f-type"]').checked = true;
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
  _searchFilters = {
    car_make:  document.getElementById('hero-mark').value,
    car_model: document.getElementById('hero-model').value.trim(),
    category:  document.getElementById('hero-cat').value,
    keyword:   document.getElementById('hero-keyword').value.trim(),
  };
  showPage('search');
  // sync sidebar
  if (_searchFilters.car_make)  document.getElementById('f-make').value     = _searchFilters.car_make;
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
    document.getElementById('detail-badges').innerHTML =
      `<span class="detail-badge ${badgeClass}">${badgeText}</span>` +
      `<span class="detail-badge category">${l.category || ''}</span>` +
      (l.is_vip ? '<span class="detail-badge vip">⭐ VIP</span>' : '');

    document.getElementById('detail-price').textContent = formatPrice(l.price);
    document.getElementById('detail-title').textContent = l.title;

    // Car info
    const carRows = [
      l.car_make  ? ['Марк', l.car_make] : null,
      l.car_model ? ['Загвар', l.car_model] : null,
      (l.year_from || l.year_to) ? ['Он', `${l.year_from||''}${l.year_to && l.year_to !== l.year_from ? '–'+l.year_to : ''}`] : null,
    ].filter(Boolean);
    document.getElementById('detail-car').innerHTML = carRows.map(([k,v]) =>
      `<div class="detail-car-row"><span>${k}</span><span>${v}</span></div>`
    ).join('');

    document.getElementById('detail-desc').textContent = l.description || 'Тайлбар байхгүй';

    // Shop
    const shopInitial = (l.shop_name || l.phone || 'Х').charAt(0).toUpperCase();
    document.getElementById('detail-shop').innerHTML = `
      <div class="detail-shop-avatar">${shopInitial}</div>
      <div class="detail-shop-info">
        <div class="detail-shop-name">${l.shop_name || 'Хувь хүн'}</div>
        <div class="detail-shop-loc">📍 ${l.location || 'Байршил тодорхойгүй'}</div>
      </div>`;

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
function initPostPage() {
  document.getElementById('post-form-wrap').style.display = 'block';
  document.getElementById('post-success').style.display   = 'none';
  initUploadZone('upload-zone', 'upload-preview');
}

function selectType(type) {
  document.getElementById('p-type').value = type;
  document.getElementById('type-original').classList.toggle('active', type === 'original');
  document.getElementById('type-substitute').classList.toggle('active', type === 'substitute');
}

async function submitListing() {
  const user = authGetUser();
  if (!user) { openAuthModal('login'); showToast('Эхлээд нэвтэрнэ үү', 'info'); return; }

  const title    = document.getElementById('p-title').value.trim();
  const category = document.getElementById('p-category').value;
  const make     = document.getElementById('p-make').value;
  const price    = document.getElementById('p-price').value;
  const phone    = document.getElementById('p-phone').value.trim();
  let valid = true;

  if (!title)    { showFieldError('p-title-err', 'Сэлбэгийн нэр оруулна уу'); valid=false; }
  if (!category) { showFieldError('p-cat-err',   'Ангилал сонгоно уу'); valid=false; }
  if (!make)     { showFieldError('p-make-err',  'Машины марк сонгоно уу'); valid=false; }
  if (!price)    { showFieldError('p-price-err', 'Үнэ оруулна уу'); valid=false; }
  if (!phone)    { showFieldError('p-phone-err', 'Утасны дугаар оруулна уу'); valid=false; }
  if (!valid) return;

  const btn = document.getElementById('post-submit-btn');
  btn.disabled = true; btn.textContent = 'Зураг upload хийж байна...';

  try {
    const imageUrls = await uploadAllFiles(user.id);
    btn.textContent = 'Зар нийтлэж байна...';

    await postListing({
      title,
      category,
      car_make:  make,
      car_model: document.getElementById('p-model').value.trim(),
      year_from: parseInt(document.getElementById('p-year-from').value) || null,
      year_to:   parseInt(document.getElementById('p-year-to').value)   || null,
      part_type: document.getElementById('p-type').value,
      description: document.getElementById('p-desc').value.trim(),
      price:     parseInt(price),
      phone,
      shop_name: document.getElementById('p-shop').value.trim(),
      location:  document.getElementById('p-location').value.trim(),
      images:    imageUrls,
    });

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
      return `
        <div class="my-listing-card" id="mlc-${l.id}">
          <div class="my-listing-img">${thumb}</div>
          <div class="my-listing-body">
            <div class="my-listing-info">
              <div class="my-listing-title">${l.title}</div>
              <div class="my-listing-meta">${l.car_make || ''} ${l.car_model || ''} • ${l.category || ''}</div>
            </div>
            <div class="my-listing-price">${formatPrice(l.price)}</div>
            <div class="my-listing-actions">
              <button class="btn-view-listing" onclick="openDetail('${l.id}')">Харах</button>
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
      closeDetail();
      closeAuthModal();
      closeAdminModal();
    }
  });
});
