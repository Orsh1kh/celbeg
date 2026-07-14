// ────────────────────────────────────────────────────────────
// AUTH — Supabase Phone OTP
// ────────────────────────────────────────────────────────────

let _otpTimer = null;

async function authSendOTP(phone, formType) {
  const fullPhone = phone.startsWith('+') ? phone : '+976' + phone;
  const btn = document.getElementById(formType === 'login' ? 'login-otp-btn' : 'reg-otp-btn');

  btn.disabled = true;

  if (DEMO_MODE) {
    showToast('Demo горим: OTP код — 123456', 'info');
    _startOTPTimer(btn);
    document.getElementById(formType === 'login' ? 'login-otp-wrap' : 'reg-otp-wrap').style.display = 'block';
    return;
  }

  try {
    const { error } = await sb.auth.signInWithOtp({ phone: fullPhone });
    if (error) throw error;
    showToast('OTP код илгээгдлээ', 'success');
    _startOTPTimer(btn);
    document.getElementById(formType === 'login' ? 'login-otp-wrap' : 'reg-otp-wrap').style.display = 'block';
  } catch (e) {
    showToast('Алдаа: ' + e.message, 'error');
    btn.disabled = false;
  }
}

async function authVerifyOTP(phone, token, formType) {
  const fullPhone = phone.startsWith('+') ? phone : '+976' + phone;

  if (DEMO_MODE) {
    if (token === '123456') {
      const demoUser = { id: 'demo-user', phone: fullPhone };
      await _ensureProfile(demoUser, formType);
      return demoUser;
    } else {
      throw new Error('Буруу OTP код (demo: 123456)');
    }
  }

  const { data, error } = await sb.auth.verifyOtp({ phone: fullPhone, token, type: 'sms' });
  if (error) throw error;
  await _ensureProfile(data.user, formType);
  return data.user;
}

function _isAdminPhone(phone) {
  // Strip +976 prefix for comparison
  const clean = phone.replace(/^\+976/, '').replace(/\s/g, '');
  return ADMIN_PHONES.includes(clean);
}

async function _ensureProfile(user, formType) {
  const isAdmin = _isAdminPhone(user.phone || '');

  if (DEMO_MODE) {
    const name = formType === 'register'
      ? (document.getElementById('reg-name')?.value || 'Хэрэглэгч')
      : (JSON.parse(localStorage.getItem('cb_user') || '{}').name || 'Хэрэглэгч');
    const type = document.querySelector('input[name="reg-type"]:checked')?.value || 'buyer';
    const shopName = document.getElementById('reg-shop')?.value || '';
    const profile = { id: user.id, phone: user.phone, name, user_type: type, shop_name: shopName, is_admin: isAdmin };
    localStorage.setItem('cb_user', JSON.stringify(profile));
    return profile;
  }

  const { data: existing } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!existing) {
    const name = document.getElementById('reg-name')?.value || '';
    const type = document.querySelector('input[name="reg-type"]:checked')?.value || 'buyer';
    const shopName = document.getElementById('reg-shop')?.value || '';
    await sb.from('profiles').insert({ id: user.id, phone: user.phone, name, user_type: type, shop_name: shopName, is_admin: isAdmin });
  } else if (existing.is_admin !== isAdmin) {
    // Sync admin status if phone list changed
    await sb.from('profiles').update({ is_admin: isAdmin }).eq('id', user.id);
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

function _startOTPTimer(btn) {
  clearInterval(_otpTimer);
  let secs = 60;
  btn.textContent = `${secs}с дахин илгээх`;
  _otpTimer = setInterval(() => {
    secs--;
    btn.textContent = `${secs}с дахин илгээх`;
    if (secs <= 0) {
      clearInterval(_otpTimer);
      btn.textContent = 'OTP илгээх';
      btn.disabled = false;
    }
  }, 1000);
}
