export const SLOT_COUNT = 5;
export const ACTIVE_SLOT_KEY = 'kr3_active_save_slot';
export const LEGACY_SAVE_KEY = 'kr3_save_slot0';
export const LEGACY_META_KEY = 'kr3_save_meta';
export const PRIMARY_SLOT_BACKUP_KEY = 'kr3_save_slot0_primary';
export const PRIMARY_META_BACKUP_KEY = 'kr3_save_meta_slot0_primary';

export function normalizeSlot(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < SLOT_COUNT ? n : 0;
}

export function saveKey(slot) {
  const s = normalizeSlot(slot);
  return s === 0 ? LEGACY_SAVE_KEY : `kr3_save_slot${s}`;
}

export function metaKey(slot) {
  const s = normalizeSlot(slot);
  return s === 0 ? LEGACY_META_KEY : `kr3_save_meta_slot${s}`;
}

export function formatSlotMeta(slot, meta) {
  const n = normalizeSlot(slot) + 1;
  if (!meta) return `Слот ${n} · пусто`;
  const place = meta.sys || 'неизвестная система';
  const date = meta.dateStr || '—';
  const money = Number.isFinite(Number(meta.money)) ? Number(meta.money).toLocaleString('ru-RU') : '—';
  return `Слот ${n} · ${date} · ${place} · ${money} кр.`;
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function isValidSaveRaw(raw) {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch (_) { return false; }
}

function getActiveSlot(storage = localStorage) {
  return normalizeSlot(storage.getItem(ACTIVE_SLOT_KEY));
}

function primarySaveRaw(storage = localStorage) {
  const backup = storage.getItem(PRIMARY_SLOT_BACKUP_KEY);
  if (isValidSaveRaw(backup)) return backup;
  return getActiveSlot(storage) === 0 ? storage.getItem(LEGACY_SAVE_KEY) : null;
}

function primaryMetaRaw(storage = localStorage) {
  const backup = storage.getItem(PRIMARY_META_BACKUP_KEY);
  if (backup) return backup;
  return getActiveSlot(storage) === 0 ? storage.getItem(LEGACY_META_KEY) : null;
}

function preservePrimarySlot(storage = localStorage) {
  if (getActiveSlot(storage) !== 0) return;
  const save = storage.getItem(LEGACY_SAVE_KEY);
  if (!isValidSaveRaw(save)) return;
  storage.setItem(PRIMARY_SLOT_BACKUP_KEY, save);
  const meta = storage.getItem(LEGACY_META_KEY);
  if (meta) storage.setItem(PRIMARY_META_BACKUP_KEY, meta);
  else storage.removeItem(PRIMARY_META_BACKUP_KEY);
}

export function slotHasSave(slot, storage = localStorage) {
  const s = normalizeSlot(slot);
  if (s === 0) return isValidSaveRaw(primarySaveRaw(storage));
  return isValidSaveRaw(storage.getItem(saveKey(s)));
}

function readSlotMeta(slot, storage = localStorage) {
  const s = normalizeSlot(slot);
  if (s === 0) {
    const raw = primaryMetaRaw(storage);
    try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }
  return readJson(storage, metaKey(s));
}

function slotHasMeta(slot, storage = localStorage) {
  const s = normalizeSlot(slot);
  return !!(s === 0 ? primaryMetaRaw(storage) : storage.getItem(metaKey(s)));
}

function setActiveSlot(slot, storage = localStorage) {
  const s = normalizeSlot(slot);
  storage.setItem(ACTIVE_SLOT_KEY, String(s));
  return s;
}

export function syncSelectedSlotToLegacy(slot, storage = localStorage) {
  const s = normalizeSlot(slot);
  if (s === 0) {
    const save = primarySaveRaw(storage);
    if (!isValidSaveRaw(save)) {
      storage.removeItem(LEGACY_SAVE_KEY);
      storage.removeItem(LEGACY_META_KEY);
      return false;
    }
    storage.setItem(LEGACY_SAVE_KEY, save);
    const meta = primaryMetaRaw(storage);
    if (meta) storage.setItem(LEGACY_META_KEY, meta); else storage.removeItem(LEGACY_META_KEY);
    return true;
  }
  const save = storage.getItem(saveKey(s));
  if (!slotHasSave(s, storage)) {
    storage.removeItem(LEGACY_SAVE_KEY);
    storage.removeItem(LEGACY_META_KEY);
    return false;
  }
  const meta = storage.getItem(metaKey(s));
  storage.setItem(LEGACY_SAVE_KEY, save);
  if (meta) storage.setItem(LEGACY_META_KEY, meta); else storage.removeItem(LEGACY_META_KEY);
  return true;
}

export function activateSlotForLoad(slot, storage = localStorage) {
  const previous = getActiveSlot(storage);
  const next = normalizeSlot(slot);
  if (previous === 0 && next !== 0) preservePrimarySlot(storage);
  setActiveSlot(next, storage);
  if (syncSelectedSlotToLegacy(next, storage)) return true;
  setActiveSlot(previous, storage);
  if (previous === 0) syncSelectedSlotToLegacy(0, storage);
  return false;
}

function installWriteMirror(storage = localStorage) {
  const proto = Object.getPrototypeOf(storage);
  if (!proto || proto.__kr3SlotsPatched) return;
  const originalSetItem = proto.setItem;
  Object.defineProperty(proto, '__kr3SlotsPatched', { value: true, configurable: true });
  proto.setItem = function patchedSetItem(key, value) {
    originalSetItem.call(this, key, value);
    if (this !== storage) return;
    const active = getActiveSlot(storage);
    if (active === 0) {
      if (key === LEGACY_SAVE_KEY) originalSetItem.call(this, PRIMARY_SLOT_BACKUP_KEY, value);
      if (key === LEGACY_META_KEY) originalSetItem.call(this, PRIMARY_META_BACKUP_KEY, value);
      return;
    }
    if (key === LEGACY_SAVE_KEY) originalSetItem.call(this, saveKey(active), value);
    if (key === LEGACY_META_KEY) originalSetItem.call(this, metaKey(active), value);
  };
}

function createSlotPanel() {
  const panel = document.createElement('div');
  panel.id = 'saveSlotsPanel';
  panel.style.cssText = 'display:none;position:fixed;inset:0;z-index:80;background:rgba(3,7,18,.88);padding:5vh 5vw;overflow:auto;color:#e8f6ff;font-family:Exo 2,sans-serif';
  panel.innerHTML = `<div style="max-width:760px;margin:auto;background:#0b1324;border:1px solid #4ec9ff55;border-radius:16px;padding:20px;box-shadow:0 20px 60px #0008">
    <h2 style="margin-top:0">💾 Слоты сохранений</h2>
    <p style="opacity:.8">Пять независимых слотов. Активный слот автоматически получает обычные сохранения игры.</p>
    <div id="saveSlotsList" style="display:grid;gap:10px"></div>
    <button id="saveSlotsClose" class="mbtn ghost" style="margin-top:16px">✕ Закрыть</button>
  </div>`;
  document.body.appendChild(panel);
  return panel;
}

function renderSlots(panel, storage = localStorage) {
  const list = panel.querySelector('#saveSlotsList');
  if (!list) return;
  const active = getActiveSlot(storage);
  list.innerHTML = '';
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const hasSave = slotHasSave(slot, storage);
    const meta = readSlotMeta(slot, storage);
    const hasMeta = slotHasMeta(slot, storage);
    const row = document.createElement('div');
    row.style.cssText = `padding:12px;border:1px solid ${slot === active ? '#7ee787' : '#4ec9ff44'};border-radius:10px;background:#101b30`;
    row.innerHTML = `<div style="font-weight:700;margin-bottom:8px">${formatSlotMeta(slot, hasSave ? (meta || {}) : null)}${slot === active ? ' · АКТИВНЫЙ' : ''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" data-slot-load="${slot}" ${hasSave ? '' : 'disabled'}>▶ Загрузить</button>
        <button class="btn" data-slot-select="${slot}">✓ Сделать активным</button>
        <button class="btn ghost" data-slot-new="${slot}">＋ Новая игра</button>
        <button class="btn ghost" data-slot-delete="${slot}" ${hasSave || hasMeta ? '' : 'disabled'}>🗑 Очистить</button>
      </div>`;
    list.appendChild(row);
  }
}

function boot() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof localStorage === 'undefined') return;
  installWriteMirror(localStorage);
  if (getActiveSlot(localStorage) === 0) preservePrimarySlot(localStorage);
  const menuInner = document.getElementById('menuInner');
  if (!menuInner) return;
  const panel = createSlotPanel();
  const btn = document.createElement('button');
  btn.className = 'mbtn ghost';
  btn.id = 'btnSaveSlots';
  btn.textContent = '💾 СЛОТЫ СОХРАНЕНИЙ';
  const help = document.getElementById('btnHelp');
  menuInner.insertBefore(btn, help || null);
  btn.addEventListener('click', () => { renderSlots(panel); panel.style.display = 'block'; });
  panel.querySelector('#saveSlotsClose')?.addEventListener('click', () => { panel.style.display = 'none'; });
  panel.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const getSlot = (name) => target.hasAttribute(name) ? normalizeSlot(target.getAttribute(name)) : null;
    let slot = getSlot('data-slot-select');
    if (slot !== null) { setActiveSlot(slot); renderSlots(panel); return; }
    slot = getSlot('data-slot-load');
    if (slot !== null) {
      if (!activateSlotForLoad(slot)) return;
      panel.style.display = 'none';
      document.getElementById('contBtn')?.click();
      return;
    }
    slot = getSlot('data-slot-new');
    if (slot !== null) {
      if (getActiveSlot(localStorage) === 0 && slot !== 0) preservePrimarySlot(localStorage);
      setActiveSlot(slot); panel.style.display = 'none';
      document.getElementById('btnNewGame')?.click();
      return;
    }
    slot = getSlot('data-slot-delete');
    if (slot !== null) {
      if (!window.confirm(`Очистить слот ${slot + 1}?`)) return;
      if (slot === 0) {
        localStorage.removeItem(PRIMARY_SLOT_BACKUP_KEY);
        localStorage.removeItem(PRIMARY_META_BACKUP_KEY);
        if (getActiveSlot(localStorage) === 0) {
          localStorage.removeItem(LEGACY_SAVE_KEY);
          localStorage.removeItem(LEGACY_META_KEY);
        }
      } else {
        localStorage.removeItem(saveKey(slot)); localStorage.removeItem(metaKey(slot));
        if (slot === getActiveSlot(localStorage)) {
          localStorage.removeItem(LEGACY_SAVE_KEY);
          localStorage.removeItem(LEGACY_META_KEY);
        }
      }
      renderSlots(panel); return;
    }
  });
  document.getElementById('contBtn')?.addEventListener('click', () => {
    const active = getActiveSlot(localStorage);
    syncSelectedSlotToLegacy(active, localStorage);
  }, true);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
}
