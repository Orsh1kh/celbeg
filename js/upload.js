// ────────────────────────────────────────────────────────────
// UPLOAD — Drag & drop + Supabase Storage
// ────────────────────────────────────────────────────────────

const MAX_PHOTOS = 8;
let _uploadedFiles = [];
let _uploadedUrls  = [];
let _existingUrls  = [];   // Зар засах үед аль хэдийн байршуулсан зургууд

function initUploadZone(zoneId, previewId) {
  const zone    = document.getElementById(zoneId);
  const preview = document.getElementById(previewId);
  const input   = zone.querySelector('input[type="file"]');

  if (!zone || !preview || !input) return;
  if (zone.dataset.wired) return;   // хуудсанд дахин ороход listener давхардуулахгүй
  zone.dataset.wired = '1';

  zone.addEventListener('click', e => {
    // Button дээр дарсан бол зөвшөөрөхгүй — тэд өөрийн handler-тэй
    if (e.target.closest('.upload-buttons')) return;
    input.click();
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    _addFiles(Array.from(e.dataTransfer.files), preview);
  });
  input.addEventListener('change', () => {
    _addFiles(Array.from(input.files), preview);
    input.value = '';
  });
}

// ── Камер шууд нээх (мобайл дээр ажиллана) ─────────────────
function pickFromCamera() {
  const input = document.querySelector('#upload-zone input[type="file"]');
  if (!input) return;
  // Capture attribute-г түр нэмж камер нээлгэнэ
  input.setAttribute('capture', 'environment');
  input.click();
  // Дараа устгаад гар утасны галлерейг хэвийн нээдэг болгоно
  setTimeout(() => input.removeAttribute('capture'), 1000);
}

function pickFromGallery() {
  const input = document.querySelector('#upload-zone input[type="file"]');
  if (!input) return;
  input.removeAttribute('capture');
  input.click();
}

const MAX_FILE_SIZE_MB = 8;
const ALLOWED_MIME = new Set(['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']);

function _addFiles(files, preview) {
  // Хамгаалалт: зөвхөн image, хэмжээ 8MB-с хэтрэхгүй
  const invalid = files.filter(f => !ALLOWED_MIME.has(f.type) || !f.type.startsWith('image/'));
  if (invalid.length) showToast('Зөвхөн JPG, PNG, WebP зураг оруулна уу', 'error');
  const oversized = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
  if (oversized.length) showToast(`Зураг ${MAX_FILE_SIZE_MB}MB-с бага байх ёстой`, 'error');

  const allowed = files.filter(f =>
    ALLOWED_MIME.has(f.type) &&
    f.type.startsWith('image/') &&
    f.size <= MAX_FILE_SIZE_MB * 1024 * 1024
  );
  const remaining = MAX_PHOTOS - _existingUrls.length - _uploadedFiles.length;
  const toAdd = allowed.slice(0, remaining);

  toAdd.forEach(file => {
    _uploadedFiles.push(file);
    const reader = new FileReader();
    reader.onload = e => {
      const thumb = document.createElement('div');
      thumb.className = 'upload-thumb';
      thumb.innerHTML = `<img src="${e.target.result}" alt=""><button type="button" class="thumb-remove" onclick="removeUploadFile(${_uploadedFiles.indexOf(file)})">×</button>`;
      preview.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  });

  if (allowed.length > remaining) showToast(`Хамгийн ихдээ ${MAX_PHOTOS} зураг оруулна уу`, 'info');
}

function removeUploadFile(idx) {
  _uploadedFiles.splice(idx, 1);
  _rebuildPreview();
}

function removeExistingImage(idx) {
  _existingUrls.splice(idx, 1);
  _rebuildPreview();
}

// Зар засах: хуучин зургуудыг preview-д харуулна
function setExistingImages(urls) {
  _existingUrls = (urls || []).map(safeImgUrl).filter(Boolean).slice(0, MAX_PHOTOS);
  _uploadedFiles = [];
  _rebuildPreview();
}

function getExistingImages() { return [..._existingUrls]; }

function _rebuildPreview() {
  const preview = document.getElementById('upload-preview');
  if (!preview) return;
  preview.innerHTML = '';
  _existingUrls.forEach((url, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'upload-thumb';
    thumb.innerHTML = `<img src="${escapeHtml(url)}" alt=""><button type="button" class="thumb-remove" onclick="removeExistingImage(${i})">×</button>`;
    preview.appendChild(thumb);
  });
  _uploadedFiles.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = e => {
      const thumb = document.createElement('div');
      thumb.className = 'upload-thumb';
      thumb.innerHTML = `<img src="${e.target.result}" alt=""><button type="button" class="thumb-remove" onclick="removeUploadFile(${i})">×</button>`;
      preview.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadAllFiles(userId) {
  _uploadedUrls = [];
  if (_uploadedFiles.length === 0) return [];

  if (DEMO_MODE) {
    // In demo mode return local object URLs
    _uploadedUrls = _uploadedFiles.map(f => URL.createObjectURL(f));
    return _uploadedUrls;
  }

  for (const file of _uploadedFiles) {
    const ext  = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await sb.storage.from('listing-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { showToast('Зураг upload алдаа: ' + error.message, 'error'); continue; }
    const { data: pub } = sb.storage.from('listing-images').getPublicUrl(data.path);
    _uploadedUrls.push(pub.publicUrl);
  }
  return _uploadedUrls;
}

function resetUpload() {
  _uploadedFiles = [];
  _uploadedUrls  = [];
  _existingUrls  = [];
  const preview = document.getElementById('upload-preview');
  if (preview) preview.innerHTML = '';
}
