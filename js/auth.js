// ────────────────────────────────────────────────────────────
// AUTH — Supabase Email + Password
// ────────────────────────────────────────────────────────────
// Note: Supabase Dashboard → Authentication → Providers → Email
// шинэ хэрэглэгчийг email confirmation-гүйгээр зөвшөөрсөн байх ёстой.
// (Enable Email provider = ON, Confirm email = OFF нь MVP-д тохиромжтой.)
// ────────────────────────────────────────────────────────────

async function authRegister(email, password, name, userType, shopName) {
  if (DEMO_MODE) {
    const isAdmin = _isAdminEmail(email);
    const profile = { id: 'demo-' + Date.now(), email, name, user_type: userType, shop_name: shopName, is_admin: isAdmin };
    localStorage.setItem('cb_user', JSON.stringify(profile));
    return profile;
  }

  // 1) Auth хэрэглэгч үүсгэх
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('Бүртгэл үүссэн, email-ийг шалгаад баталгаажуулна уу');

  // Хэрэв Supabase-т email confirmation ON хэвээр бол session байхгүй.
  // Тэр үед _ensureProfile-г шууд дуудаж чадахгүй (RLS-т auth.uid() хэрэгтэй).
  // Гэхдээ баталгаажаагүй ч auth.users-т мөр үүссэн байна. Дараа login хийхэд шинэ ensure явна.
  const isAdmin = _isAdminEmail(email);
  if (data.session) {
    await _ensureProfile(user, { name, userType, shopName, isAdmin });
  }
  return user;
}

async function authLogin(email, password) {
  if (DEMO_MODE) {
    const isAdmin = _isAdminEmail(email);
    const profile = { id: 'demo-' + email, email, name: 'Хэрэглэгч', user_type: 'buyer', is_admin: isAdmin };
    localStorage.setItem('cb_user', JSON.stringify(profile));
    return profile;
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const isAdmin = _isAdminEmail(email);
  await _ensureProfile(data.user, { name: '', userType: 'buyer', shopName: '', isAdmin });
  return data.user;
}

function _isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

async function _ensureProfile(user, opts = {}) {
  const email   = user.email || '';
  const isAdmin = _isAdminEmail(email);

  const { data: existing } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!existing) {
    await sb.from('profiles').insert({
      id: user.id,
      email,
      name: opts.name || '',
      user_type: opts.userType || 'buyer',
      shop_name: opts.shopName || '',
      is_admin: isAdmin,
    });
  } else if (existing.is_admin !== isAdmin || existing.email !== email) {
    await sb.from('profiles').update({ email, is_admin: isAdmin }).eq('id', user.id);
  }
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  localStorage.setItem('cb_user', JSON.stringify(profile));
  return profile;
}

async function authLogout() {
  if (!DEMO_MODE) await sb.auth.signOut();
  localStorage.removeItem('cb_user');
}

function authGetUser() {
  const raw = localStorage.getItem('cb_user');
  return raw ? JSON.parse(raw) : null;
}

async function authLoadSession() {
  if (DEMO_MODE) return authGetUser();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { localStorage.removeItem('cb_user'); return null; }
  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (profile) localStorage.setItem('cb_user', JSON.stringify(profile));
  return profile;
}
