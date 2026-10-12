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

// Утасны эх зураг 8MB-аас их байж болно — шахсаны дараа хэдэн зуун KB болно
const MAX_SOURCE_SIZE_MB = 30;
const ALLOWED_MIME = new Set(['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']);

// ── Зураг шахах ────────────────────────────────────────────
// Хуулахаас өмнө хэрэглэгчийн төхөөрөмж дээр урт талыг нь 1600px болгож JPG-ээр хадгална.
// • 3–5MB зураг → 200–400KB (хуулах, ачаалах 10+ дахин хурдан)
// • EXIF мэдээлэл (GPS байршил г.м) устана
// • Утсыг эргүүлж авсан зургийн чиглэлийг зөв болгоно
// • iPhone-ий HEIC → JPG (бүх browser дээр харагдана)
// • Картанд зориулж 512px жижиг хувилбар (thumbnail, ~30–50KB) давхар үүсгэнэ
const IMG_MAX_SIDE   = 1600;
const IMG_QUALITY    = 0.82;
const THUMB_MAX_SIDE = 512;
const THUMB_QUALITY  = 0.72;
const _thumbFor = new WeakMap();   // том зураг (File) → жижиг хувилбар (File)

async function _decodeImage(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
  }
  // Хуучин browser: <img>-ээр уншина
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function _renderJpeg(src, w0, h0, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';               // PNG-ийн ил тод хэсгийг цагаан болгоно
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
  if (!blob) throw new Error('encode failed');
  return blob;
}

// Буцаах утга: том зураг (File). Жижиг хувилбарыг _thumbFor-т хадгална.
async function compressImage(file) {
  const src = await _decodeImage(file);   // уншиж чадахгүй бол алдаа шиднэ
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  try {
    const full  = await _renderJpeg(src, w0, h0, IMG_MAX_SIDE, IMG_QUALITY);
    const thumb = await _renderJpeg(src, w0, h0, THUMB_MAX_SIDE, THUMB_QUALITY);
    const base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
    const out = new File([full], base + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
    _thumbFor.set(out, new File([thumb], base + '_t.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
    return out;
  } finally {
    src.close?.();
  }
}

// Шахалтыг нэг нэгээр нь дараалуулна (хуучин утасны санах ой дүүргэхгүй)
let _processing   = Promise.resolve();
let _pendingCount = 0;
let _uploadGen    = 0;   // reset хийсний дараа дуусах хуучин шахалтыг хаяна

function _setUploadStatus() {
  const el = document.getElementById('upload-status');
  if (!el) return;
  el.textContent = _pendingCount > 0 ? `⏳ Зураг бэлдэж байна… (${_pendingCount} үлдсэн)` : '';
}

function _addFiles(files, preview) {
  const invalid = files.filter(f => !ALLOWED_MIME.has(f.type));
  if (invalid.length) showToast('Зөвхөн JPG, PNG, WebP зураг оруулна уу', 'error');
  const oversized = files.filter(f => f.size > MAX_SOURCE_SIZE_MB * 1024 * 1024);
  if (oversized.length) showToast(`Зураг ${MAX_SOURCE_SIZE_MB}MB-с бага байх ёстой`, 'error');

  const allowed = files.filter(f => ALLOWED_MIME.has(f.type) && f.size <= MAX_SOURCE_SIZE_MB * 1024 * 1024);
  const remaining = MAX_PHOTOS - _existingUrls.length - _uploadedFiles.length - _pendingCount;
  const toAdd = allowed.slice(0, Math.max(0, remaining));
  if (allowed.length > toAdd.length) showToast(`Хамгийн ихдээ ${MAX_PHOTOS} зураг оруулна уу`, 'info');
  if (!toAdd.length) return;

  const gen = _uploadGen;
  _pendingCount += toAdd.length;
  _setUploadStatus();
  _processing = _processing.then(async () => {
    for (const file of toAdd) {
      let out = null;
      try {
        out = await compressImage(file);
      } catch (e) {
        // HEIC-г уншиж чадахгүй browser → хэнд ч харагдахгүй тул оруулахгүй
        if (/hei[cf]/.test(file.type)) {
          showToast('Энэ зургийн төрөл (HEIC) дэмжигдэхгүй байна. Утсаараа шууд авсан зураг эсвэл JPG оруулна уу', 'error');
        } else {
          out = file;   // уншиж чадаагүй ч JPG/PNG бол эх файлаар нь
        }
      }
      if (gen !== _uploadGen) return;   // энэ хооронд form цэвэрлэгдсэн
      _pendingCount--;
      if (out) _uploadedFiles.push(out);
      _rebuildPreview();
      _setUploadStatus();
    }
  }).catch(e => console.warn('Image processing failed:', e));
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
  _cancelProcessing();
  _existingUrls = (urls || []).map(safeImgUrl).filter(Boolean).slice(0, MAX_PHOTOS);
  _uploadedFiles = [];
  _rebuildPreview();
}

function getExistingImages() { return [..._existingUrls]; }

// Preview-ийн objectURL-уудыг дахин ашиглаж, хэрэггүй болсныг чөлөөлнө
const _thumbUrls = new Map();
function _thumbUrl(file) {
  if (!_thumbUrls.has(file)) _thumbUrls.set(file, URL.createObjectURL(file));
  return _thumbUrls.get(file);
}

function _rebuildPreview() {
  const preview = document.getElementById('upload-preview');
  if (!preview) return;
  for (const [file, url] of _thumbUrls) {
    if (!_uploadedFiles.includes(file)) { URL.revokeObjectURL(url); _thumbUrls.delete(file); }
  }
  preview.innerHTML =
    _existingUrls.map((url, i) =>
      `<div class="upload-thumb"><img src="${escapeHtml(thumbUrl(url))}" data-full="${escapeHtml(url)}" alt=""><button type="button" class="thumb-remove" onclick="removeExistingImage(${i})">×</button></div>`
    ).join('') +
    _uploadedFiles.map((file, i) =>
      `<div class="upload-thumb"><img src="${_thumbUrl(file)}" alt=""><button type="button" class="thumb-remove" onclick="removeUploadFile(${i})">×</button></div>`
    ).join('');
}

function _cancelProcessing() {
  _uploadGen++;
  _pendingCount = 0;
  _setUploadStatus();
}

async function uploadAllFiles(userId) {
  await _processing;   // шахагдаж байгаа зураг дуустал хүлээнэ
  _uploadedUrls = [];
  if (_uploadedFiles.length === 0) return [];

  if (DEMO_MODE) {
    // In demo mode return local object URLs
    _uploadedUrls = _uploadedFiles.map(f => URL.createObjectURL(f));
    return _uploadedUrls;
  }

  // Файлын нэр давхардахгүй тул өөрчлөгдөхгүй → browser 1 жил кэшлэнэ (дахин татахгүй)
  const opts = { cacheControl: '31536000', upsert: false };
  for (const file of _uploadedFiles) {
    const id    = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const thumb = _thumbFor.get(file);
    // Шахсан зураг: <id>.w.jpg (том) + <id>.t.jpg (жижиг). Шахаж чадаагүй бол эх өргөтгөлөөр.
    let ext = 'w.jpg';
    if (!thumb) {
      ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!/^[a-z0-9]{2,5}$/.test(ext)) ext = 'jpg';
    }
    const path = `${userId}/${id}.${ext}`;
    const { data, error } = await sb.storage.from('listing-images').upload(path, file, opts);
    if (error) { showToast('Зураг upload алдаа: ' + error.message, 'error'); continue; }
    if (thumb) {
      const { error: tErr } = await sb.storage.from('listing-images').upload(`${userId}/${id}.t.jpg`, thumb, opts);
      if (tErr) console.warn('Thumbnail upload failed (том зургийг харуулна):', tErr.message);
    }
    const { data: pub } = sb.storage.from('listing-images').getPublicUrl(data.path);
    _uploadedUrls.push(pub.publicUrl);
  }
  return _uploadedUrls;
}

function resetUpload() {
  _cancelProcessing();
  _uploadedFiles = [];
  _uploadedUrls  = [];
  _existingUrls  = [];
  _rebuildPreview();
}
