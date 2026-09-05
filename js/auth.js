// ────────────────────────────────────────────────────────────
// AUTH — Supabase Email OTP
// ────────────────────────────────────────────────────────────

let _otpTimer = null;

async function authSendOTP(email, formType) {
  const btn = document.getElementById(formType === 'login' ? 'login-otp-btn' : 'reg-otp-btn');
  btn.disabled = true;

  if (DEMO_MODE) {
    showToast('Demo горим: OTP код — 123456', 'info');
    _startOTPTimer(btn);
    document.getElementById(formType === 'login' ? 'login-otp-wrap' : 'reg-otp-wrap').style.display = 'block';
    return;
  }

  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });
    if (error) throw error;
    showToast('OTP код email-ээр илгээгдлээ', 'success');
    _startOTPTimer(btn);
    document.getElementById(formType === 'login' ? 'login-otp-wrap' : 'reg-otp-wrap').style.display = 'block';
  } catch (e) {
    showToast('Алдаа: ' + e.message, 'error');
    btn.disabled = false;
  }
}

async function authVerifyOTP(email, token, formType) {
  if (DEMO_MODE) {
    if (token === '123456') {
      const demoUser = { id: 'demo-user', email };
      await _ensureProfile(demoUser, formType);
      return demoUser;
    } else {
      throw new Error('Буруу OTP код (demo: 123456)');
    }
  }

  const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  await _ensureProfile(data.user, formType);
  return data.user;
}

function _isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

async function _ensureProfile(user, formType) {
  const email   = user.email || '';
  const isAdmin = _isAdminEmail(email);

  if (DEMO_MODE) {
    const name = formType === 'register'
      ? (document.getElementById('reg-name')?.value || 'Хэрэглэгч')
      : (JSON.parse(localStorage.getItem('cb_user') || '{}').name || 'Хэрэглэгч');
    const type = document.querySelector('input[name="reg-type"]:checked')?.value || 'buyer';
    const shopName = document.getElementById('reg-shop')?.value || '';
    const profile = { id: user.id, email, name, user_type: type, shop_name: shopName, is_admin: isAdmin };
    localStorage.setItem('cb_user', JSON.stringify(profile));
    return profile;
  }

  const { data: existing } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!existing) {
    const name = document.getElementById('reg-name')?.value || '';
    const type = document.querySelector('input[name="reg-type"]:checked')?.value || 'buyer';
    const shopName = document.getElementById('reg-shop')?.value || '';
    await sb.from('profiles').insert({
      id: user.id, email, name, user_type: type, shop_name: shopName, is_admin: isAdmin
    });
  } else if (existing.is_admin !== isAdmin || existing.email !== email) {
    // Sync admin status and email if changed
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
