// ═══════════════════════════════════════════════════════════
// ADMIN DASHBOARD — Categories & Car Marks Management
// ═══════════════════════════════════════════════════════════

let _adminTab = 'categories'; // 'categories' | 'marks'
let _editingId = null;        // id of item being edited

// ── Switch tab ──────────────────────────────────────────────
function adminSwitchTab(tab) {
  _adminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.admin-tab[data-tab="${tab}"]`).classList.add('active');
  renderAdminTable();
}

// ── Render table ────────────────────────────────────────────
function renderAdminTable() {
  const wrap = document.getElementById('admin-table-wrap');
  if (_adminTab === 'categories') renderCategoryTable(wrap);
  else renderMarkTable(wrap);
}

function renderCategoryTable(wrap) {
  const cats = getCategories().sort((a,b) => a.order - b.order);
  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th style="width:48px">Эрэмбэ</th>
          <th style="width:56px">Дүрс</th>
          <th>Ангилалын нэр</th>
          <th style="width:120px">Үйлдэл</th>
        </tr>
      </thead>
      <tbody id="cat-tbody">
        ${cats.map(c => `
          <tr id="cat-row-${c.id}">
            <td class="admin-center">
              <div class="order-btns">
                <button onclick="moveCat('${c.id}',-1)" title="Дээш">▲</button>
                <button onclick="moveCat('${c.id}',1)"  title="Доош">▼</button>
              </div>
            </td>
            <td class="admin-center"><span style="font-size:22px">${c.icon}</span></td>
            <td>${c.name}</td>
            <td class="admin-actions">
              <button class="ab-edit" onclick="openEditCat('${c.id}')">✏️</button>
              <button class="ab-del"  onclick="deleteCat('${c.id}')">🗑️</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderMarkTable(wrap) {
  const marks = getMarks();
  wrap.innerHTML = `
    <div class="marks-grid" id="marks-grid">
      ${marks.map((m,i) => `
        <div class="mark-chip" id="mark-chip-${i}">
          <span>${m}</span>
          <button onclick="openEditMark(${i})" title="Засах">✏️</button>
          <button onclick="deleteMark(${i})"  title="Устгах">×</button>
        </div>`).join('')}
    </div>`;
}

// ── Category CRUD ───────────────────────────────────────────
function openAddCat() {
  _editingId = null;
  document.getElementById('admin-modal-title').textContent = 'Ангилал нэмэх';
  document.getElementById('adm-cat-name').value = '';
  document.getElementById('adm-cat-icon').value = '🔩';
  openAdminModal('modal-cat');
}

function openEditCat(id) {
  const cats = getCategories();
  const cat  = cats.find(c => c.id === id);
  if (!cat) return;
  _editingId = id;
  document.getElementById('admin-modal-title').textContent = 'Ангилал засах';
  document.getElementById('adm-cat-name').value = cat.name;
  document.getElementById('adm-cat-icon').value = cat.icon;
  openAdminModal('modal-cat');
}

function saveCat() {
  const name = document.getElementById('adm-cat-name').value.trim();
  const icon = document.getElementById('adm-cat-icon').value.trim() || '🔩';
  if (!name) { showToast('Нэр оруулна уу', 'error'); return; }

  let cats = getCategories();
  if (_editingId) {
    const idx = cats.findIndex(c => c.id === _editingId);
    if (idx !== -1) { cats[idx].name = name; cats[idx].icon = icon; }
  } else {
    if (cats.find(c => c.name === name)) { showToast('Тийм ангилал аль хэдийн байна', 'error'); return; }
    const maxOrder = cats.length ? Math.max(...cats.map(c => c.order)) : 0;
    cats.push({ id: 'cat-' + Date.now(), name, icon, order: maxOrder + 1 });
  }
  saveCategories(cats);
  populateAllDropdowns();
  closeAdminModal();
  renderAdminTable();
  showToast(_editingId ? 'Ангилал шинэчлэгдлээ' : 'Ангилал нэмэгдлээ', 'success');
}

function deleteCat(id) {
  if (!confirm('Энэ ангилалыг устгах уу?')) return;
  const cats = getCategories().filter(c => c.id !== id);
  saveCategories(cats);
  populateAllDropdowns();
  renderAdminTable();
  showToast('Устгагдлаа', 'success');
}

function moveCat(id, dir) {
  let cats = getCategories().sort((a,b) => a.order - b.order);
  const idx = cats.findIndex(c => c.id === id);
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= cats.length) return;
  [cats[idx].order, cats[swapIdx].order] = [cats[swapIdx].order, cats[idx].order];
  saveCategories(cats);
  populateAllDropdowns();
  renderAdminTable();
}

// ── Mark CRUD ───────────────────────────────────────────────
function openAddMark() {
  _editingId = null;
  document.getElementById('admin-modal-title').textContent = 'Марк нэмэх';
  document.getElementById('adm-mark-name').value = '';
  openAdminModal('modal-mark');
}

function openEditMark(idx) {
  const marks = getMarks();
  _editingId = idx;
  document.getElementById('admin-modal-title').textContent = 'Марк засах';
  document.getElementById('adm-mark-name').value = marks[idx];
  openAdminModal('modal-mark');
}

function saveMark() {
  const name = document.getElementById('adm-mark-name').value.trim();
  if (!name) { showToast('Маркийн нэр оруулна уу', 'error'); return; }

  let marks = getMarks();
  if (_editingId !== null && typeof _editingId === 'number') {
    marks[_editingId] = name;
  } else {
    if (marks.includes(name)) { showToast('Тийм марк аль хэдийн байна', 'error'); return; }
    // Insert before Бусад if present
    const busadIdx = marks.indexOf('Бусад');
    if (busadIdx !== -1) marks.splice(busadIdx, 0, name);
    else marks.push(name);
    marks.sort((a,b) => {
      if (a === 'Бусад') return 1;
      if (b === 'Бусад') return -1;
      return a.localeCompare(b);
    });
  }
  saveMarks(marks);
  populateAllDropdowns();
  closeAdminModal();
  renderAdminTable();
  showToast(_editingId !== null ? 'Марк шинэчлэгдлээ' : 'Марк нэмэгдлээ', 'success');
}

function deleteMark(idx) {
  const marks = getMarks();
  if (!confirm(`"${marks[idx]}" маркийг устгах уу?`)) return;
  marks.splice(idx, 1);
  saveMarks(marks);
  populateAllDropdowns();
  renderAdminTable();
  showToast('Устгагдлаа', 'success');
}

// ── Bulk add marks ──────────────────────────────────────────
function openBulkAddMarks() {
  document.getElementById('adm-bulk-marks').value = '';
  openAdminModal('modal-bulk');
}

function saveBulkMarks() {
  const raw = document.getElementById('adm-bulk-marks').value;
  const newMarks = raw.split(/[\n,،]+/).map(m => m.trim()).filter(m => m.length > 0);
  if (!newMarks.length) { showToast('Марк оруулна уу', 'error'); return; }

  let marks = getMarks();
  let added = 0;
  newMarks.forEach(m => {
    if (!marks.includes(m)) { marks.push(m); added++; }
  });
  marks.sort((a,b) => {
    if (a === 'Бусад') return 1;
    if (b === 'Бусад') return -1;
    return a.localeCompare(b);
  });
  saveMarks(marks);
  populateAllDropdowns();
  closeAdminModal();
  renderAdminTable();
  showToast(`${added} марк нэмэгдлээ`, 'success');
}

// ── Reset to defaults ────────────────────────────────────────
function resetToDefaults(type) {
  if (!confirm('Анхны тохиргоонд буцаах уу?')) return;
  if (type === 'categories') {
    saveCategories([...DEFAULT_CATEGORIES]);
    showToast('Ангилал анхны байдалд буцлаа', 'success');
  } else {
    saveMarks([...DEFAULT_MARKS]);
    showToast('Марк анхны байдалд буцлаа', 'success');
  }
  populateAllDropdowns();
  renderAdminTable();
}

// ── Modal helpers ───────────────────────────────────────────
function openAdminModal(type) {
  document.getElementById('admin-modal').classList.add('open');
  document.querySelectorAll('.admin-modal-body').forEach(b => b.style.display = 'none');
  document.getElementById(type).style.display = 'block';
}
function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('open');
  _editingId = null;
}

// ── Page init ────────────────────────────────────────────────
function initAdminPage() {
  const user    = authGetUser();
  const blocked = document.getElementById('admin-blocked');
  const content = document.getElementById('admin-content');

  // Strict check: must be logged in AND is_admin === true
  if (!user || !user.is_admin) {
    blocked.style.display = 'block';
    content.style.display = 'none';
    return;
  }
  blocked.style.display = 'none';
  content.style.display = 'block';

  // Stats
  document.getElementById('admin-stat-cats').textContent  = getCategories().length;
  document.getElementById('admin-stat-marks').textContent = getMarks().length;

  renderAdminTable();
}

// ── Emoji picker shortcut ─────────────────────────────────────
const COMMON_ICONS = ['⚙️','🔴','🔧','⚡','🚗','🛞','💺','❄️','🔩','🪛','🔋','💡','🛢️','🏁','🔑','🪄','🎯','🛡️','⛽','🧲'];
function renderIconPicker() {
  const wrap = document.getElementById('icon-picker');
  if (!wrap) return;
  wrap.innerHTML = COMMON_ICONS.map(e =>
    `<button type="button" class="icon-opt" onclick="document.getElementById('adm-cat-icon').value='${e}';document.querySelectorAll('.icon-opt').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">${e}</button>`
  ).join('');
}
