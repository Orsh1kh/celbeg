// ===== ХУУДАС ШИЛЖИХ =====
function showPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
  var nav = document.getElementById('nav-' + p);
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
}

// ===== MODAL =====
function openModal(tab) {
  document.getElementById('auth-modal').classList.add('open');
  switchTab(tab || 'login');
}
function closeModal() {
  document.getElementById('auth-modal').classList.remove('open');
  resetForms();
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});
document.getElementById('auth-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ===== TAB ШИЛЖИХ =====
function switchTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-' + tab).classList.add('active');
}

// ===== OTP ИЛГЭЭХ =====
var otpTimer = null;

function sendOTP(formType) {
  var phoneInput = document.getElementById(formType + '-phone');
  var phone = phoneInput.value.trim();

  if (!phone || phone.length < 8) {
    showError(formType + '-error', 'Утасны дугаараа зөв оруулна уу');
    return;
  }

  var btn = document.getElementById(formType + '-otp-btn');
  var otpFields = document.getElementById(formType + '-otp-fields');

  btn.disabled = true;
  btn.textContent = 'Илгээж байна...';

  // Netlify Function дуудах
  fetch('/.netlify/functions/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      otpFields.classList.add('show');
      showError(formType + '-error', '');
      startTimer(btn, formType);
    } else {
      showError(formType + '-error', data.message || 'Алдаа гарлаа. Дахин оролдоно уу.');
      btn.disabled = false;
      btn.textContent = 'OTP авах';
    }
  })
  .catch(() => {
    // Demo mode — backend байхгүй үед
    otpFields.classList.add('show');
    showError(formType + '-error', '');
    startTimer(btn, formType);
    console.log('Demo: OTP sent to', phone);
  });
}

function startTimer(btn, formType) {
  var secs = 60;
  btn.textContent = secs + 'с хүлээх';
  otpTimer = setInterval(function() {
    secs--;
    btn.textContent = secs + 'с хүлээх';
    if (secs <= 0) {
      clearInterval(otpTimer);
      btn.disabled = false;
      btn.textContent = 'Дахин авах';
    }
  }, 1000);
}

// ===== НЭВТРЭХ =====
function submitLogin() {
  var phone = document.getElementById('login-phone').value.trim();
  var otp = document.getElementById('login-otp').value.trim();

  if (!phone) { showError('login-error', 'Утасны дугаараа оруулна уу'); return; }
  if (!otp || otp.length < 4) { showError('login-error', 'OTP кодоо оруулна уу'); return; }

  var btn = document.querySelector('#form-login .submit-btn');
  btn.disabled = true;
  btn.textContent = 'Шалгаж байна...';

  fetch('/.netlify/functions/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone, otp: otp, action: 'login' })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setLoggedIn({ phone: phone, name: data.name || phone });
      closeModal();
    } else {
      showError('login-error', 'OTP код буруу байна');
      btn.disabled = false;
      btn.textContent = 'Нэвтрэх';
    }
  })
  .catch(() => {
    // Demo mode
    setLoggedIn({ phone: phone, name: phone });
    closeModal();
  });
}

// ===== БҮРТГЭЛ =====
function submitRegister() {
  var name = document.getElementById('reg-name').value.trim();
  var phone = document.getElementById('reg-phone').value.trim();
  var type = document.getElementById('reg-type').value;
  var otp = document.getElementById('reg-otp').value.trim();

  if (!name) { showError('reg-error', 'Нэрээ оруулна уу'); return; }
  if (!phone) { showError('reg-error', 'Утасны дугаараа оруулна уу'); return; }
  if (!type) { showError('reg-error', 'Төрлөө сонгоно уу'); return; }
  if (!otp || otp.length < 4) { showError('reg-error', 'OTP кодоо оруулна уу'); return; }

  var btn = document.querySelector('#form-register .submit-btn');
  btn.disabled = true;
  btn.textContent = 'Бүртгэж байна...';

  fetch('/.netlify/functions/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, type, otp })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setLoggedIn({ phone: phone, name: name, type: type });
      closeModal();
    } else {
      showError('reg-error', data.message || 'Алдаа гарлаа');
      btn.disabled = false;
      btn.textContent = 'Бүртгүүлэх';
    }
  })
  .catch(() => {
    // Demo mode
    setLoggedIn({ phone: phone, name: name, type: type });
    closeModal();
  });
}

// ===== НЭВТЭРСЭН БАЙДАЛ =====
function setLoggedIn(user) {
  localStorage.setItem('celbeg_user', JSON.stringify(user));
  updateNavUser(user);
}

function updateNavUser(user) {
  var navRight = document.getElementById('nav-right');
  if (user) {
    navRight.innerHTML = `
      <div class="user-badge">
        <div class="user-dot"></div>
        <span>${user.name}</span>
      </div>
      <button class="nav-btn" onclick="showPage('zar')">+ Зар нийтлэх</button>
    `;
  } else {
    navRight.innerHTML = `
      <button class="nav-login" onclick="openModal('login')">Нэвтрэх</button>
      <button class="nav-btn" onclick="openModal('register')">Бүртгүүлэх</button>
    `;
  }
}

function logout() {
  localStorage.removeItem('celbeg_user');
  updateNavUser(null);
}

// ===== ZAR FORM =====
var selectedBadge = '';
function pickBadge(t) {
  selectedBadge = t;
  document.getElementById('pick-orig').className = 'badge-pick' + (t === 'orig' ? ' sel-orig' : '');
  document.getElementById('pick-sub').className = 'badge-pick' + (t === 'sub' ? ' sel-sub' : '');
}

function submitZar() {
  var name = document.getElementById('f-name').value;
  var mark = document.getElementById('f-mark').value;
  var price = document.getElementById('f-price').value;
  var phone = document.getElementById('f-phone').value;
  if (!name || !mark || !price || !phone) {
    alert('Одтой (*) талбаруудыг заавал бөглөнө үү!');
    return;
  }
  document.getElementById('success-msg').style.display = 'block';
  window.scrollTo(0, document.body.scrollHeight);
}

// ===== ТУСЛАХ ФУНКЦҮҮД =====
function showError(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function resetForms() {
  ['login-phone','login-otp','reg-name','reg-phone','reg-otp'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['login-otp-fields','reg-otp-fields'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  ['login-error','reg-error'].forEach(function(id) {
    showError(id, '');
  });
  if (otpTimer) clearInterval(otpTimer);
}

// ===== ЭХЛҮҮЛЭХ =====
document.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem('celbeg_user');
  if (saved) {
    try { updateNavUser(JSON.parse(saved)); } catch(e) {}
  } else {
    updateNavUser(null);
  }
});
