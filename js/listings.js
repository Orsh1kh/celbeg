// ────────────────────────────────────────────────────────────
// LISTINGS — Supabase CRUD + filters
// ────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

// Бусдын профайлаас уншиж болох багана (email нууц)
const PUBLIC_PROFILE_COLS = 'id,name,phone,user_type,shop_name,is_admin,is_verified,created_at';

// ── Байршил жагсаалт (checkbox шүүлт + post-form dropdown) ─
// УБ 9 дүүрэг + Монгол 21 аймгийн төв + Дархан/Эрдэнэт хот
const LOCATIONS = [
  // ── Улаанбаатар (9 дүүрэг) ─────────────────────────────
  { key: 'ub_bz',      label: 'УБ, Баянзүрх',       patterns: ['баянзүрх', 'bayanzurkh'] },
  { key: 'ub_bg',      label: 'УБ, Баянгол',        patterns: ['баянгол', 'bayangol'] },
  { key: 'ub_sb',      label: 'УБ, Сүхбаатар',      patterns: ['уб, сүхбаатар', 'уб сүхбаатар', 'ub sukhbaatar', 'ub, sukhbaatar'] },
  { key: 'ub_ch',      label: 'УБ, Чингэлтэй',      patterns: ['чингэлтэй', 'chingeltei'] },
  { key: 'ub_hu',      label: 'УБ, Хан-Уул',        patterns: ['хан-уул', 'хан уул', 'khan uul', 'khan-uul'] },
  { key: 'ub_sn',      label: 'УБ, Сонгинохайрхан', patterns: ['сонгино', 'songino'] },
  { key: 'ub_nl',      label: 'УБ, Налайх',         patterns: ['налайх', 'nalaikh'] },
  { key: 'ub_bn',      label: 'УБ, Багануур',       patterns: ['багануур', 'baganuur'] },
  { key: 'ub_bh',      label: 'УБ, Багахангай',     patterns: ['багахангай', 'bagakhangai'] },

  // ── Гол хотууд ─────────────────────────────────────────
  { key: 'erdenet',    label: 'Эрдэнэт',            patterns: ['эрдэнэт', 'erdenet'] },
  { key: 'darkhan',    label: 'Дархан',             patterns: ['дархан', 'darkhan'] },

  // ── Аймгийн төв (21) ───────────────────────────────────
  { key: 'arvaikheer', label: 'Арвайхээр (Өвөрхангай)', patterns: ['арвайхээр', 'arvaikheer', 'өвөрхангай', 'ovorkhangai'] },
  { key: 'altai',      label: 'Алтай (Говь-Алтай)',      patterns: ['алтай', 'altai', 'говь-алтай', 'gov-altai'] },
  { key: 'baruun_urt', label: 'Баруун-Урт (Сүхбаатар)',  patterns: ['баруун-урт', 'баруун урт', 'baruun-urt', 'baruun urt'] },
  { key: 'bayankhongor', label: 'Баянхонгор',            patterns: ['баянхонгор', 'bayankhongor'] },
  { key: 'bulgan',     label: 'Булган',                  patterns: ['булган', 'bulgan'] },
  { key: 'chinggis',   label: 'Чингис (Хэнтий)',         patterns: ['чингис', 'chinggis', 'ондөрхаан', 'ondorkhaan', 'хэнтий', 'khentii'] },
  { key: 'choibalsan', label: 'Чойбалсан (Дорнод)',      patterns: ['чойбалсан', 'choibalsan', 'дорнод', 'dornod'] },
  { key: 'choir',      label: 'Чойр (Говь-сүмбэр)',      patterns: ['чойр', 'choir', 'говь-сүмбэр', 'gov-sumber'] },
  { key: 'dalanzadgad',label: 'Даланзадгад (Өмнөговь)',  patterns: ['даланзадгад', 'dalanzadgad', 'өмнөговь', 'omnogov'] },
  { key: 'khovd',      label: 'Ховд',                    patterns: ['ховд', 'khovd'] },
  { key: 'mandalgovi', label: 'Мандалговь (Дундговь)',   patterns: ['мандалговь', 'mandalgovi', 'дундговь', 'dundgov'] },
  { key: 'moron',      label: 'Мөрөн (Хөвсгөл)',         patterns: ['мөрөн', 'moron', 'хөвсгөл', 'khovsgol'] },
  { key: 'olgii',      label: 'Өлгий (Баян-Өлгий)',      patterns: ['өлгий', 'olgii', 'баян-өлгий', 'bayan-olgii'] },
  { key: 'sainshand',  label: 'Сайншанд (Дорноговь)',    patterns: ['сайншанд', 'sainshand', 'дорноговь', 'dornogov'] },
  { key: 'sukhbaatar_c',label:'Сүхбаатар хот (Сэлэнгэ)', patterns: ['сүхбаатар хот', 'sukhbaatar khot', 'сэлэнгэ', 'selenge'] },
  { key: 'tsetserleg', label: 'Цэцэрлэг (Архангай)',     patterns: ['цэцэрлэг', 'tsetserleg', 'архангай', 'arkhangai'] },
  { key: 'ulaangom',   label: 'Улаангом (Увс)',          patterns: ['улаангом', 'ulaangom', 'увс', 'uvs'] },
  { key: 'uliastai',   label: 'Улиастай (Завхан)',       patterns: ['улиастай', 'uliastai', 'завхан', 'zavkhan'] },
  { key: 'zuunmod',    label: 'Зуунмод (Төв)',           patterns: ['зуунмод', 'zuunmod', 'төв аймаг', 'tov aimag'] },

  // ── Catchall ───────────────────────────────────────────
  { key: 'other',      label: 'Бусад',                   patterns: ['бусад'] },
];

function locationLabel(key) {
  return LOCATIONS.find(l => l.key === key)?.label || key;
}

function _buildLocationOr(locKeys) {
  const parts = [];
  locKeys.forEach(k => {
    const loc = LOCATIONS.find(l => l.key === k);
    if (loc) loc.patterns.forEach(p => parts.push(`location.ilike.%${p}%`));
  });
  return { parts };
}

function _arr(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  return v ? [v] : [];
}

let _vehicleEmbedSupported = true;  // vehicle_details хүснэгт байхгүй бол false болно

async function fetchListings(f = {}) {
  const {
    listing_type = 'part', category = '', subcategory = '', car_makes = [], car_model = '',
    year_from = '', year_to = '', price_min = '', price_max = '', locations = [],
    keyword = '', sort = 'newest', page = 0, withCount = false,
    mileage_max = '', steering = '',
  } = f;
  const part_types   = _arr(f.part_type);
  const conditions   = _arr(f.condition);
  const policies     = _arr(f.exchange_policy);
  const fuels        = _arr(f.fuel_type);
  const transmissions= _arr(f.transmission);
  const drives       = _arr(f.drive);

  const norm = { ...f, listing_type, part_types, conditions, policies, fuels, transmissions, drives, mileage_max, steering };

  if (DEMO_MODE) {
    const data = _filterDemo({ ...norm, sort, page });
    if (withCount) return { data, count: _countDemo(norm) };
    return data;
  }

  const isVehicle   = listing_type === 'vehicle';
  const needVFilter = isVehicle && (fuels.length || transmissions.length || drives.length || mileage_max || steering);

  const build = (withEmbed) => {
    let sel = '*';
    if (withEmbed && isVehicle) {
      sel = needVFilter
        ? '*, vehicle_details!inner(fuel_type,transmission,drive,steering,mileage_km,engine_cc)'
        : '*, vehicle_details(fuel_type,transmission,drive,steering,mileage_km,engine_cc)';
    }
    const selectOpts = withCount ? { count: 'exact' } : undefined;
    let q = sb.from('listings').select(sel, selectOpts).eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (listing_type)        q = q.eq('listing_type', listing_type);
    if (category)            q = q.eq('category', category);
    if (subcategory)         q = q.eq('subcategory', subcategory);
    if (car_makes.length)    q = q.in('car_make', car_makes);
    if (car_model)           q = q.ilike('car_model', `%${car_model}%`);
    if (year_from)           q = q.gte('year_to', parseInt(year_from));
    if (year_to)             q = q.lte('year_from', parseInt(year_to));
    if (price_min)           q = q.gte('price', parseInt(price_min));
    if (price_max)           q = q.lte('price', parseInt(price_max));
    if (part_types.length)   q = q.in('part_type', part_types);
    if (conditions.length)   q = q.in('condition', conditions);
    if (policies.length)     q = q.in('exchange_policy', policies);
    if (keyword)             q = q.ilike('title', `%${keyword}%`);

    if (withEmbed && needVFilter) {
      if (fuels.length)         q = q.in('vehicle_details.fuel_type', fuels);
      if (transmissions.length) q = q.in('vehicle_details.transmission', transmissions);
      if (drives.length)        q = q.in('vehicle_details.drive', drives);
      if (steering)             q = q.eq('vehicle_details.steering', steering);
      if (mileage_max)          q = q.lte('vehicle_details.mileage_km', parseInt(mileage_max));
    }

    if (locations.length) {
      const { parts } = _buildLocationOr(locations);
      if (parts.length) q = q.or(parts.join(','));
    }

    if (sort === 'price_asc')       q = q.order('price', { ascending: true });
    else if (sort === 'price_desc') q = q.order('price', { ascending: false });
    else                            q = q.order('created_at', { ascending: false });

    return q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  };

  let res = await build(_vehicleEmbedSupported);
  if (res.error && _vehicleEmbedSupported && isVehicle) {
    // vehicle_details хүснэгт/холбоос байхгүй (007 migration ажиллаагүй) → embed-гүй дахин оролдоно
    _vehicleEmbedSupported = false;
    res = await build(false);
  }
  if (res.error) throw res.error;

  const rows = (res.data || []).map(r => {
    if (r.vehicle_details !== undefined) {
      r.vehicle = Array.isArray(r.vehicle_details) ? r.vehicle_details[0] : r.vehicle_details;
      delete r.vehicle_details;
    }
    return r;
  });
  if (withCount) return { data: rows, count: res.count || 0 };
  return rows;
}

// ── Ангилал бүрийн зарын тоо (chip-үүдэд) ────────────────
async function fetchCategoryCounts(listing_type = 'part') {
  if (DEMO_MODE || !sb) {
    const out = {};
    DEMO_LISTINGS.filter(l => (l.listing_type || 'part') === listing_type)
      .forEach(l => { if (l.category) out[l.category] = (out[l.category] || 0) + 1; });
    return out;
  }
  try {
    const { data, error } = await sb.rpc('category_counts', { lt: listing_type });
    if (error) throw error;
    const out = {};
    (data || []).forEach(r => { out[r.category] = Number(r.cnt); });
    return out;
  } catch {
    return {};
  }
}

function _countDemo(f) {
  return _filterDemoAll(f).length;
}

function _filterDemoAll({ listing_type, category, subcategory, car_makes, car_model, year_from, year_to, price_min, price_max, part_types = [], conditions = [], policies = [], fuels = [], transmissions = [], drives = [], mileage_max, steering, locations, keyword }) {
  // Production query-тэй адил: идэвхгүй зарыг харуулахгүй
  let list = DEMO_LISTINGS.filter(l => l.is_active !== false);
  if (listing_type) list = list.filter(l => (l.listing_type || 'part') === listing_type);
  if (category)    list = list.filter(l => l.category === category);
  if (subcategory) list = list.filter(l => l.subcategory === subcategory);
  if (car_makes && car_makes.length) list = list.filter(l => car_makes.includes(l.car_make));
  if (car_model) list = list.filter(l => (l.car_model || '').toLowerCase().includes(car_model.toLowerCase()));
  if (year_from) list = list.filter(l => l.year_to >= parseInt(year_from));
  if (year_to)   list = list.filter(l => l.year_from <= parseInt(year_to));
  if (price_min) list = list.filter(l => l.price >= parseInt(price_min));
  if (price_max) list = list.filter(l => l.price <= parseInt(price_max));
  if (part_types.length) list = list.filter(l => part_types.includes(l.part_type));
  if (conditions.length) list = list.filter(l => conditions.includes(l.condition));
  if (policies.length)   list = list.filter(l => policies.includes(l.exchange_policy));
  if (fuels.length)         list = list.filter(l => fuels.includes(l.vehicle?.fuel_type));
  if (transmissions.length) list = list.filter(l => transmissions.includes(l.vehicle?.transmission));
  if (drives.length)        list = list.filter(l => drives.includes(l.vehicle?.drive));
  if (steering)             list = list.filter(l => l.vehicle?.steering === steering);
  if (mileage_max)          list = list.filter(l => (l.vehicle?.mileage_km || 0) <= parseInt(mileage_max));
  if (locations && locations.length) {
    list = list.filter(l => {
      const loc = (l.location || '').toLowerCase();
      return locations.some(k => {
        const def = LOCATIONS.find(x => x.key === k);
        if (!def) return false;
        return def.patterns.some(p => loc.includes(p.toLowerCase()));
      });
    });
  }
  if (keyword)   list = list.filter(l => l.title.toLowerCase().includes(keyword.toLowerCase()) || l.description?.toLowerCase().includes(keyword.toLowerCase()));
  return list;
}

async function fetchVipListings() {
  if (DEMO_MODE) return DEMO_LISTINGS.filter(l => l.is_vip && l.is_active !== false);
  const { data } = await sb.from('listings').select('*').eq('is_vip', true).eq('is_active', true).order('created_at', { ascending: false }).limit(4);
  return data || [];
}

async function fetchListingById(id) {
  if (DEMO_MODE) return DEMO_LISTINGS.find(l => l.id === id) || null;
  const { data, error } = await sb.from('listings').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function incrementView(id) {
  if (DEMO_MODE) return;
  await sb.rpc('increment_view', { listing_id: id });
}

async function postListing(data, vehicleData = null) {
  const user = authGetUser();
  if (!user) throw new Error('Нэвтэрнэ үү');

  if (DEMO_MODE) {
    const newListing = { ...data, id: 'demo-' + Date.now(), user_id: user.id, created_at: new Date().toISOString(), is_vip: false, view_count: 0, is_active: true };
    if (vehicleData) Object.assign(newListing, { vehicle: vehicleData });
    DEMO_LISTINGS.unshift(newListing);
    return newListing;
  }

  const { data: result, error } = await sb.from('listings').insert({ ...data, user_id: user.id }).select().single();
  if (error) throw error;

  // Vehicle listing бол vehicle_details мөр нэмнэ
  if (vehicleData && result?.id) {
    const { error: vErr } = await sb.from('vehicle_details').insert({ ...vehicleData, listing_id: result.id });
    if (vErr) {
      // Rollback: vehicle_details insert алдаа гарвал listings-с устгана
      await sb.from('listings').delete().eq('id', result.id);
      throw vErr;
    }
  }

  return result;
}

async function fetchVehicleDetails(listingId) {
  if (DEMO_MODE) {
    const l = DEMO_LISTINGS.find(x => x.id === listingId);
    return l?.vehicle || null;
  }
  try {
    const { data } = await sb.from('vehicle_details').select('*').eq('listing_id', listingId).single();
    return data;
  } catch { return null; }
}

async function myListings() {
  const user = authGetUser();
  if (!user) return [];

  if (DEMO_MODE) return DEMO_LISTINGS.filter(l => l.user_id === user.id);

  const { data } = await sb.from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return data || [];
}

async function deleteListing(id) {
  const user = authGetUser();
  if (!user) throw new Error('Нэвтэрнэ үү');

  if (DEMO_MODE) {
    const idx = DEMO_LISTINGS.findIndex(l => l.id === id);
    if (idx !== -1) DEMO_LISTINGS.splice(idx, 1);
    return;
  }

  const { error } = await sb.from('listings').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

async function toggleListingActive(id, current) {
  if (DEMO_MODE) {
    const l = DEMO_LISTINGS.find(x => x.id === id);
    if (l) l.is_active = !current;
    return;
  }
  await sb.from('listings').update({ is_active: !current }).eq('id', id);
}

async function extendListing(id) {
  if (DEMO_MODE) {
    const l = DEMO_LISTINGS.find(x => x.id === id);
    if (l) l.expires_at = new Date(Date.now() + 7*24*3600*1000).toISOString();
    return l?.expires_at;
  }
  const { data, error } = await sb.rpc('extend_listing', { listing_id: id });
  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════════════════════
// REVIEWS / RATINGS
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// FAVORITES
// ═══════════════════════════════════════════════════════════
async function fetchFavoriteIds() {
  const user = authGetUser();
  if (!user) return new Set();
  if (DEMO_MODE || !sb) {
    try { return new Set(JSON.parse(localStorage.getItem('cb_demo_favs') || '[]')); } catch { return new Set(); }
  }
  try {
    const { data } = await sb.from('favorites').select('listing_id').eq('user_id', user.id);
    return new Set((data || []).map(r => r.listing_id));
  } catch { return new Set(); }
}

async function fetchMyFavorites() {
  const user = authGetUser();
  if (!user) return [];
  if (DEMO_MODE || !sb) {
    let ids = []; try { ids = JSON.parse(localStorage.getItem('cb_demo_favs') || '[]'); } catch {}
    return DEMO_LISTINGS.filter(l => ids.includes(l.id));
  }
  try {
    const { data } = await sb.from('favorites')
      .select('listing_id, listings!inner(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return (data || []).map(r => r.listings).filter(Boolean);
  } catch { return []; }
}

async function toggleFavorite(listingId, nextOn) {
  const user = authGetUser();
  if (!user) throw new Error('Нэвтэрнэ үү');
  if (DEMO_MODE || !sb) {
    let ids = []; try { ids = JSON.parse(localStorage.getItem('cb_demo_favs') || '[]'); } catch {}
    const set = new Set(ids);
    if (nextOn) set.add(listingId); else set.delete(listingId);
    localStorage.setItem('cb_demo_favs', JSON.stringify([...set]));
    return;
  }
  if (nextOn) {
    const { error } = await sb.from('favorites').insert({ user_id: user.id, listing_id: listingId });
    if (error && !/duplicate/i.test(error.message)) throw error;
  } else {
    const { error } = await sb.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
    if (error) throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// REPORTS (зар мэдээлэх)
// ═══════════════════════════════════════════════════════════
const REPORT_REASONS = {
  scam:       '🚨 Залилан, луйвар',
  wrong_info: '❌ Буруу мэдээлэл, зураг',
  spam:       '🔁 Спам, давхар зар',
  sold:       '✅ Аль хэдийн зарагдсан',
  prohibited: '⛔ Хориотой бараа',
  other:      '💬 Бусад',
};

const DEMO_REPORTS_KEY = 'cb_demo_reports';

async function submitReport(listingId, reason, comment = '') {
  const user = authGetUser();
  if (!user) throw new Error('Нэвтэрнэ үү');
  if (DEMO_MODE || !sb) {
    const list = JSON.parse(localStorage.getItem(DEMO_REPORTS_KEY) || '[]');
    if (list.some(r => r.listing_id === listingId && r.reporter_id === user.id)) throw new Error('duplicate');
    list.push({ id: 'r-' + Date.now(), listing_id: listingId, reporter_id: user.id, reason, comment, status: 'open', created_at: new Date().toISOString() });
    localStorage.setItem(DEMO_REPORTS_KEY, JSON.stringify(list));
    return;
  }
  const { error } = await sb.from('reports').insert({
    listing_id: listingId, reporter_id: user.id, reason, comment: comment || null,
  });
  if (error) throw (/duplicate|unique/i.test(error.message) ? new Error('duplicate') : error);
}

// Админд: нээлттэй мэдээллүүдийг зараар бүлэглэж буцаана
async function fetchOpenReports() {
  let rows = [];
  if (DEMO_MODE || !sb) {
    rows = JSON.parse(localStorage.getItem(DEMO_REPORTS_KEY) || '[]')
      .filter(r => r.status === 'open')
      .map(r => ({ ...r, listings: DEMO_LISTINGS.find(l => l.id === r.listing_id) || null }));
  } else {
    const { data, error } = await sb.from('reports')
      .select('id, listing_id, reason, comment, created_at, listings(title, is_active, user_id, phone)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw error;
    rows = data || [];
  }
  const byListing = new Map();
  rows.forEach(r => {
    if (!byListing.has(r.listing_id)) byListing.set(r.listing_id, { listing_id: r.listing_id, listing: r.listings, reports: [] });
    byListing.get(r.listing_id).reports.push(r);
  });
  return [...byListing.values()].sort((a, b) => b.reports.length - a.reports.length);
}

// action: 'hide' → зарыг нууж мэдээллийг шийдвэрлэсэн болгоно
//         'dismiss' → зарыг сэргээж мэдээллийг хэрэгсэхгүй болгоно
async function resolveListingReports(listingId, action) {
  const status = action === 'hide' ? 'resolved' : 'dismissed';
  const active = action !== 'hide';
  if (DEMO_MODE || !sb) {
    const list = JSON.parse(localStorage.getItem(DEMO_REPORTS_KEY) || '[]');
    list.forEach(r => { if (r.listing_id === listingId && r.status === 'open') r.status = status; });
    localStorage.setItem(DEMO_REPORTS_KEY, JSON.stringify(list));
    const l = DEMO_LISTINGS.find(x => x.id === listingId); if (l) l.is_active = active;
    return;
  }
  const { error: e1 } = await sb.from('listings').update({ is_active: active }).eq('id', listingId);
  if (e1) throw e1;
  const { error: e2 } = await sb.from('reports').update({ status }).eq('listing_id', listingId).eq('status', 'open');
  if (e2) throw e2;
}

async function fetchShops() {
  if (DEMO_MODE || !sb) {
    // Demo: infer from DEMO_LISTINGS
    const byShop = {};
    DEMO_LISTINGS.forEach(l => {
      if (!l.shop_name) return;
      const key = l.shop_name;
      if (!byShop[key]) {
        byShop[key] = {
          id: 'demo-shop-' + key,
          shop_name: l.shop_name,
          name: l.shop_name,
          phone: l.phone || '',
          is_verified: false,
          created_at: l.created_at,
          rating_avg: 0,
          rating_count: 0,
          active_listings: 0,
          total_listings: 0,
          location: l.location || ''
        };
      }
      byShop[key].active_listings++;
      byShop[key].total_listings++;
      if (l.location && !byShop[key].location) byShop[key].location = l.location;
    });
    return Object.values(byShop);
  }
  try {
    const { data, error } = await sb.from('shops_with_stats').select('*');
    if (error) throw error;
    return data || [];
  } catch(e) { console.warn('Shops fetch failed:', e.message); return []; }
}

async function fetchProfileRating(userId) {
  if (DEMO_MODE || !sb || !userId) return { rating_avg: 0, rating_count: 0 };
  try {
    const { data } = await sb.from('profile_ratings')
      .select('rating_avg,rating_count')
      .eq('user_id', userId).single();
    return data || { rating_avg: 0, rating_count: 0 };
  } catch { return { rating_avg: 0, rating_count: 0 }; }
}

async function fetchShopReviews(shopId, limit = 50) {
  if (DEMO_MODE || !sb) return [];
  try {
    const { data, error } = await sb.rpc('get_shop_reviews', { shop_id: shopId, lim: limit });
    if (error) throw error;
    return data || [];
  } catch(e) { console.warn('Reviews fetch failed:', e.message); return []; }
}

async function submitReviewRPC({ target_user_id, rating, comment = '', listing_id = null }) {
  if (DEMO_MODE) throw new Error('DEMO горимд review илгээх боломжгүй');
  const { data, error } = await sb.rpc('add_review', {
    target_user: target_user_id,
    rating_val: rating,
    comment_val: comment,
    listing_ref: listing_id
  });
  if (error) throw error;
  return data;
}

async function deleteReviewRPC(id) {
  if (DEMO_MODE) return;
  const { error } = await sb.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

async function fetchMyQuota() {
  if (DEMO_MODE) {
    const user = authGetUser();
    if (!user) return { max_active: 0, active: 0, remaining: 0, max_daily: 0, daily: 0, daily_remaining: 0 };
    const utype = user.user_type || 'buyer';
    return utype === 'shop'
      ? { max_active: 50, active: 0, remaining: 50, max_daily: 20, daily: 0, daily_remaining: 20 }
      : { max_active: 5,  active: 0, remaining: 5,  max_daily: 3,  daily: 0, daily_remaining: 3 };
  }
  const { data, error } = await sb.rpc('my_listing_quota');
  if (error) throw error;
  return data;
}

// ── Demo filter helper ──────────────────────────────────────
function _filterDemo(f) {
  let list = _filterDemoAll(f);
  if (f.sort === 'price_asc')       list.sort((a,b) => a.price - b.price);
  else if (f.sort === 'price_desc') list.sort((a,b) => b.price - a.price);
  else                              list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  return list.slice(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE);
}

// ── Helpers ─────────────────────────────────────────────────
function formatPrice(p) {
  if (!p || Number(p) <= 0) return 'Үнэ тохиролцоно';
  return Number(p).toLocaleString('mn-MN') + '₮';
}

// Картанд: 47,000,000 → "47 сая ₮", 31,500,000 → "31.5 сая ₮", 450,000 → "450 мянга ₮"
function formatPriceShort(p) {
  const n = Number(p);
  if (!n || n <= 0) return 'Үнэ тохиролцоно';
  const trim = x => String(Math.round(x * 10) / 10).replace(/\.0$/, '');
  if (n >= 1000000) return `${trim(n / 1000000)} сая ₮`;
  if (n >= 10000)   return `${trim(n / 1000)} мянга ₮`;
  return n.toLocaleString('mn-MN') + '₮';
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 3600)  return Math.floor(diff/60) + ' минутын өмнө';
  if (diff < 86400) return Math.floor(diff/3600) + ' цагийн өмнө';
  return Math.floor(diff/86400) + ' өдрийн өмнө';
}
