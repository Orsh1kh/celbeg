// ────────────────────────────────────────────────────────────
// LISTINGS — Supabase CRUD + filters
// ────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

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
  { key: 'other',      label: 'Бусад',                   patterns: null },
];

function locationLabel(key) {
  return LOCATIONS.find(l => l.key === key)?.label || key;
}

function _buildLocationOr(locKeys) {
  const parts = [];
  const knownPatterns = [];
  let hasOther = false;
  locKeys.forEach(k => {
    const loc = LOCATIONS.find(l => l.key === k);
    if (!loc) return;
    if (loc.patterns === null) hasOther = true;
    else loc.patterns.forEach(p => {
      parts.push(`location.ilike.%${p}%`);
      knownPatterns.push(p);
    });
  });
  return { parts, knownPatterns, hasOther };
}

async function fetchListings({ category='', subcategory='', car_makes=[], car_model='', year_from='', year_to='', price_min='', price_max='', part_type='', condition='', exchange_policy='', locations=[], keyword='', sort='newest', page=0, withCount=false } = {}) {
  if (DEMO_MODE) {
    const data = _filterDemo({ category, subcategory, car_makes, car_model, year_from, year_to, price_min, price_max, part_type, condition, exchange_policy, locations, keyword, sort, page });
    if (withCount) return { data, count: _countDemo({ category, subcategory, car_makes, car_model, year_from, year_to, price_min, price_max, part_type, condition, exchange_policy, locations, keyword }) };
    return data;
  }

  const selectOpts = withCount ? { count: 'exact' } : undefined;
  let q = sb.from('listings').select('*', selectOpts).eq('is_active', true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (category)               q = q.eq('category', category);
  if (subcategory)            q = q.eq('subcategory', subcategory);
  if (car_makes && car_makes.length) q = q.in('car_make', car_makes);
  if (car_model)              q = q.ilike('car_model', `%${car_model}%`);
  if (year_from)              q = q.gte('year_to', parseInt(year_from));
  if (year_to)                q = q.lte('year_from', parseInt(year_to));
  if (price_min)              q = q.gte('price', parseInt(price_min));
  if (price_max)              q = q.lte('price', parseInt(price_max));
  if (part_type)              q = q.eq('part_type', part_type);
  if (condition)              q = q.eq('condition', condition);
  if (exchange_policy)        q = q.eq('exchange_policy', exchange_policy);
  if (keyword)                q = q.ilike('title', `%${keyword}%`);

  if (locations && locations.length) {
    const { parts } = _buildLocationOr(locations);
    if (parts.length) q = q.or(parts.join(','));
  }

  if (sort === 'price_asc')       q = q.order('price', { ascending: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false });
  else                            q = q.order('created_at', { ascending: false });

  q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  if (withCount) return { data: data || [], count: count || 0 };
  return data || [];
}

function _countDemo(f) {
  return _filterDemoAll(f).length;
}

function _filterDemoAll({ category, subcategory, car_makes, car_model, year_from, year_to, price_min, price_max, part_type, condition, exchange_policy, locations, keyword }) {
  let list = [...DEMO_LISTINGS];
  if (category)    list = list.filter(l => l.category === category);
  if (subcategory) list = list.filter(l => l.subcategory === subcategory);
  if (car_makes && car_makes.length) list = list.filter(l => car_makes.includes(l.car_make));
  if (car_model) list = list.filter(l => l.car_model.toLowerCase().includes(car_model.toLowerCase()));
  if (year_from) list = list.filter(l => l.year_to >= parseInt(year_from));
  if (year_to)   list = list.filter(l => l.year_from <= parseInt(year_to));
  if (price_min) list = list.filter(l => l.price >= parseInt(price_min));
  if (price_max) list = list.filter(l => l.price <= parseInt(price_max));
  if (part_type) list = list.filter(l => l.part_type === part_type);
  if (condition) list = list.filter(l => l.condition === condition);
  if (exchange_policy) list = list.filter(l => l.exchange_policy === exchange_policy);
  if (locations && locations.length) {
    list = list.filter(l => {
      const loc = (l.location || '').toLowerCase();
      return locations.some(k => {
        const def = LOCATIONS.find(x => x.key === k);
        if (!def || def.patterns === null) return false;
        return def.patterns.some(p => loc.includes(p.toLowerCase()));
      });
    });
  }
  if (keyword)   list = list.filter(l => l.title.toLowerCase().includes(keyword.toLowerCase()) || l.description?.toLowerCase().includes(keyword.toLowerCase()));
  return list;
}

async function fetchVipListings() {
  if (DEMO_MODE) return DEMO_LISTINGS.filter(l => l.is_vip);
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

async function postListing(data) {
  const user = authGetUser();
  if (!user) throw new Error('Нэвтэрнэ үү');

  if (DEMO_MODE) {
    const newListing = { ...data, id: 'demo-' + Date.now(), user_id: user.id, created_at: new Date().toISOString(), is_vip: false, view_count: 0, is_active: true };
    DEMO_LISTINGS.unshift(newListing);
    return newListing;
  }

  const { data: result, error } = await sb.from('listings').insert({ ...data, user_id: user.id }).select().single();
  if (error) throw error;
  return result;
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
  if (!p && p !== 0) return 'Үнэ тохиролцоно';
  return Number(p).toLocaleString('mn-MN') + '₮';
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 3600)  return Math.floor(diff/60) + ' минутын өмнө';
  if (diff < 86400) return Math.floor(diff/3600) + ' цагийн өмнө';
  return Math.floor(diff/86400) + ' өдрийн өмнө';
}

function listingThumb(listing) {
  return listing.images?.[0] || 'img/no-photo.svg';
}
