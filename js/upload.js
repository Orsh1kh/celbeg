// ────────────────────────────────────────────────────────────
// UPLOAD — Drag & drop + Supabase Storage
// ────────────────────────────────────────────────────────────

const MAX_PHOTOS = 8;
let _uploadedFiles = [];
let _uploadedUrls  = [];

function initUploadZone(zoneId, previewId) {
  const zone    = document.getElementById(zoneId);
  const preview = document.getElementById(previewId);
  const input   = zone.querySelector('input[type="file"]');

  if (!zone || !preview || !input) return;

  zone.addEventListener('click', () => input.click());
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

function _addFiles(files, preview) {
  const allowed = files.filter(f => f.type.startsWith('image/'));
  const remaining = MAX_PHOTOS - _uploadedFiles.length;
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

function _rebuildPreview() {
  const preview = document.getElementById('upload-preview');
  if (!preview) return;
  preview.innerHTML = '';
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
  const preview = document.getElementById('upload-preview');
  if (preview) preview.innerHTML = '';
}
