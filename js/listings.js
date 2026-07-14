// ────────────────────────────────────────────────────────────
// LISTINGS — Supabase CRUD + filters
// ────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

async function fetchListings({ category='', car_make='', car_model='', year_from='', year_to='', price_min='', price_max='', part_type='', exchange_policy='', keyword='', sort='newest', page=0 } = {}) {
  if (DEMO_MODE) return _filterDemo({ category, car_make, car_model, year_from, year_to, price_min, price_max, part_type, exchange_policy, keyword, sort, page });

  let q = sb.from('listings').select('*').eq('is_active', true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (category)  q = q.eq('category', category);
  if (car_make)  q = q.eq('car_make', car_make);
  if (car_model) q = q.ilike('car_model', `%${car_model}%`);
  if (year_from) q = q.gte('year_to', parseInt(year_from));
  if (year_to)   q = q.lte('year_from', parseInt(year_to));
  if (price_min) q = q.gte('price', parseInt(price_min));
  if (price_max) q = q.lte('price', parseInt(price_max));
  if (part_type) q = q.eq('part_type', part_type);
  if (exchange_policy) q = q.eq('exchange_policy', exchange_policy);
  if (keyword)   q = q.ilike('title', `%${keyword}%`);

  if (sort === 'price_asc')  q = q.order('price', { ascending: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false });
  else q = q.order('created_at', { ascending: false });

  q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
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
function _filterDemo({ category, car_make, car_model, year_from, year_to, price_min, price_max, part_type, exchange_policy, keyword, sort, page }) {
  let list = [...DEMO_LISTINGS];
  if (category)  list = list.filter(l => l.category === category);
  if (car_make)  list = list.filter(l => l.car_make === car_make);
  if (car_model) list = list.filter(l => l.car_model.toLowerCase().includes(car_model.toLowerCase()));
  if (year_from) list = list.filter(l => l.year_to >= parseInt(year_from));
  if (year_to)   list = list.filter(l => l.year_from <= parseInt(year_to));
  if (price_min) list = list.filter(l => l.price >= parseInt(price_min));
  if (price_max) list = list.filter(l => l.price <= parseInt(price_max));
  if (part_type) list = list.filter(l => l.part_type === part_type);
  if (exchange_policy) list = list.filter(l => l.exchange_policy === exchange_policy);
  if (keyword)   list = list.filter(l => l.title.toLowerCase().includes(keyword.toLowerCase()) || l.description?.toLowerCase().includes(keyword.toLowerCase()));

  if (sort === 'price_asc')  list.sort((a,b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a,b) => b.price - a.price);
  else list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  return list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
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
