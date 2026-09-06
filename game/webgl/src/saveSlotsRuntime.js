export const SLOT_COUNT = 5;
export const ACTIVE_SLOT_KEY = 'kr3_active_save_slot';
export const LEGACY_SAVE_KEY = 'kr3_save_slot0';
export const LEGACY_META_KEY = 'kr3_save_meta';
export const PRIMARY_SLOT_BACKUP_KEY = 'kr3_save_slot0_primary';
export const PRIMARY_META_BACKUP_KEY = 'kr3_save_meta_slot0_primary';

const FLIGHT_ERROR_LIMIT = 4;

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
  try { return normalizeSlot(storage.getItem(ACTIVE_SLOT_KEY)); }
  catch (_) { return 0; }
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
  try {
    if (getActiveSlot(storage) !== 0) return;
    const save = storage.getItem(LEGACY_SAVE_KEY);
    if (!isValidSaveRaw(save)) return;
    storage.setItem(PRIMARY_SLOT_BACKUP_KEY, save);
    const meta = storage.getItem(LEGACY_META_KEY);
    if (meta) storage.setItem(PRIMARY_META_BACKUP_KEY, meta);
    else storage.removeItem(PRIMARY_META_BACKUP_KEY);
  } catch (_) {}
}

export function slotHasSave(slot, storage = localStorage) {
  try {
    const s = normalizeSlot(slot);
    if (s === 0) return isValidSaveRaw(primarySaveRaw(storage));
    return isValidSaveRaw(storage.getItem(saveKey(s)));
  } catch (_) { return false; }
}

function readSlotMeta(slot, storage = localStorage) {
  try {
    const s = normalizeSlot(slot);
    if (s === 0) {
      const raw = primaryMetaRaw(storage);
      try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
    }
    return readJson(storage, metaKey(s));
  } catch (_) { return null; }
}

function slotHasMeta(slot, storage = localStorage) {
  try {
    const s = normalizeSlot(slot);
    return !!(s === 0 ? primaryMetaRaw(storage) : storage.getItem(metaKey(s)));
  } catch (_) { return false; }
}

function setActiveSlot(slot, storage = localStorage) {
  const s = normalizeSlot(slot);
  try { storage.setItem(ACTIVE_SLOT_KEY, String(s)); } catch (_) {}
  return s;
}

export function syncSelectedSlotToLegacy(slot, storage = localStorage) {
  try {
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
  } catch (_) { return false; }
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
  try {
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
  } catch (error) {
    console.warn('KR3 save-slot mirror unavailable:', error);
  }
}

function flightVisible(doc = document) {
  const menu = doc.getElementById('menu');
  const hud = doc.getElementById('hud');
  return Boolean(hud && !hud.classList.contains('hidden') && menu && menu.classList.contains('hidden'));
}

function reportRecoverableFlightError(error, doc = document) {
  const text = error?.message || String(error || 'неизвестная ошибка');
  console.error('KR3 recoverable flight-frame error:', error);
  const box = doc.getElementById('errBox');
  if (!box) return;
  box.dataset.kr3Recoverable = '1';
  box.style.display = 'block';
  box.textContent = `⚠️ Сбой кадра перехвачен, полёт продолжается: ${text}`;
  clearTimeout(reportRecoverableFlightError.timer);
  reportRecoverableFlightError.timer = setTimeout(() => {
    if (box.dataset.kr3Recoverable === '1') {
      box.style.display = 'none';
      box.textContent = '';
      delete box.dataset.kr3Recoverable;
    }
  }, 4200);
}

function installFlightRuntimeGuard(win = window, doc = document) {
  if (!win || win.__kr3FlightRuntimeGuard) return;
  Object.defineProperty(win, '__kr3FlightRuntimeGuard', { value: true, configurable: true });

  const nativeRaf = win.requestAnimationFrame?.bind(win);
  const nativeCancel = win.cancelAnimationFrame?.bind(win);
  if (nativeRaf) {
    let scheduleSerial = 0;
    const failures = new WeakMap();

    const schedule = callback => {
      scheduleSerial += 1;
      return nativeRaf(timestamp => {
        const beforeCallback = scheduleSerial;
        try {
          callback(timestamp);
          failures.set(callback, 0);
        } catch (error) {
          if (!flightVisible(doc)) throw error;
          const count = (failures.get(callback) || 0) + 1;
          failures.set(callback, count);
          reportRecoverableFlightError(error, doc);

          // If the failing callback did not already queue another frame, keep the
          // gameplay loop alive. This avoids duplicate loops when a callback
          // scheduled its successor before throwing.
          if (count <= FLIGHT_ERROR_LIMIT && scheduleSerial === beforeCallback) {
            win.setTimeout(() => schedule(callback), Math.min(80 * count, 320));
          }
        }
      });
    };

    win.requestAnimationFrame = schedule;
    if (nativeCancel) win.cancelAnimationFrame = id => nativeCancel(id);
  }

  const bindCanvasRecovery = () => {
    const canvas = doc.getElementById('cv');
    if (!canvas || canvas.dataset.kr3ContextGuard === '1') return;
    canvas.dataset.kr3ContextGuard = '1';
    let reloadTimer = null;

    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      try { doc.getElementById('ctxSave')?.click(); } catch (_) {}
      reportRecoverableFlightError(new Error('WebGL-контекст потерян · выполняю восстановление'), doc);
      reloadTimer = win.setTimeout(() => {
        try { win.location.reload(); } catch (_) {}
      }, 2500);
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      if (reloadTimer) win.clearTimeout(reloadTimer);
      reloadTimer = null;
      const box = doc.getElementById('errBox');
      if (box?.dataset.kr3Recoverable === '1') {
        box.style.display = 'none';
        box.textContent = '';
        delete box.dataset.kr3Recoverable;
      }
    }, false);
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bindCanvasRecovery, { once: true });
  else bindCanvasRecovery();

  win.addEventListener('unhandledrejection', event => {
    if (flightVisible(doc)) reportRecoverableFlightError(event.reason || new Error('ошибка асинхронного полёта'), doc);
  });
}

function createSlotPanel() {
  const panel = document.createElement('div');
  panel.id = 'saveSlotsPanel';
  panel.style.cssText = 'display:none;position:fixed;inset:0;z-index:80;background:rgba(3,7,18,.9);padding:max(18px,5vh) max(14px,4vw);overflow:auto;color:#e8f6ff;font-family:Exo 2,sans-serif;touch-action:pan-y;overscroll-behavior:contain';
  panel.innerHTML = `<div style="max-width:820px;margin:auto;background:#0b1324;border:1px solid #4ec9ff55;border-radius:16px;padding:clamp(12px,2.5vw,20px);box-shadow:0 20px 60px #0008">
    <h2 style="margin-top:0">💾 Слоты сохранений</h2>
    <p id="saveSlotsHint" style="opacity:.8;margin:6px 0 14px">Пять независимых слотов. Активный слот получает обычные сохранения игры.</p>
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
  const inFlight = flightVisible(document);
  const canSaveNow = inFlight && Boolean(document.getElementById('ctxSave'));
  const hint = panel.querySelector('#saveSlotsHint');
  if (hint) {
    hint.textContent = inFlight
      ? 'Полётный менеджер: сохраняйте текущий рейс в любой слот или загружайте другой без выхода в главное меню.'
      : 'Пять независимых слотов. Активный слот получает обычные сохранения игры.';
  }

  list.innerHTML = '';
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const hasSave = slotHasSave(slot, storage);
    const meta = readSlotMeta(slot, storage);
    const hasMeta = slotHasMeta(slot, storage);
    const row = document.createElement('div');
    row.style.cssText = `padding:12px;border:1px solid ${slot === active ? '#7ee787' : '#4ec9ff44'};border-radius:10px;background:#101b30`;
    row.innerHTML = `<div style="font-weight:700;margin-bottom:8px">${formatSlotMeta(slot, hasSave ? (meta || {}) : null)}${slot === active ? ' · АКТИВНЫЙ' : ''}</div>
      <div class="save-slot-actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
        ${inFlight ? `<button class="btn green" data-slot-save="${slot}" ${canSaveNow ? '' : 'disabled'}>💾 Сохранить сюда</button>` : ''}
        <button class="btn" data-slot-load="${slot}" ${hasSave ? '' : 'disabled'}>▶ Загрузить</button>
        <button class="btn" data-slot-select="${slot}">✓ Активировать слот</button>
        ${inFlight ? '' : `<button class="btn ghost" data-slot-new="${slot}">＋ Новая игра</button>`}
        <button class="btn ghost" data-slot-delete="${slot}" ${hasSave || hasMeta ? '' : 'disabled'}>🗑 Очистить</button>
      </div>`;
    list.appendChild(row);
  }
}

function openSlotsPanel(panel) {
  renderSlots(panel);
  panel.style.display = 'block';
}

function closeSlotsPanel(panel) {
  panel.style.display = 'none';
}

function ensureFlightSlotsButton(panel) {
  const tray = document.getElementById('trBtns');
  if (!tray || document.getElementById('flightSaveSlotsBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'flightSaveSlotsBtn';
  btn.type = 'button';
  btn.title = 'Слоты сохранений';
  btn.setAttribute('aria-label', 'Открыть слоты сохранений');
  btn.textContent = '💾';
  btn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openSlotsPanel(panel);
  });
  tray.appendChild(btn);
}

function saveCurrentFlightToSlot(slot, panel, storage = localStorage) {
  if (!flightVisible(document)) return false;
  const quickSave = document.getElementById('ctxSave');
  if (!quickSave) {
    renderSlots(panel, storage);
    return false;
  }

  if (getActiveSlot(storage) === 0 && slot !== 0) preservePrimarySlot(storage);
  setActiveSlot(slot, storage);
  closeSlotsPanel(panel);
  try {
    quickSave.click();
    setTimeout(() => renderSlots(panel, storage), 0);
    return true;
  } catch (error) {
    reportRecoverableFlightError(error, document);
    openSlotsPanel(panel);
    return false;
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
  btn.addEventListener('click', () => openSlotsPanel(panel));
  ensureFlightSlotsButton(panel);

  panel.querySelector('#saveSlotsClose')?.addEventListener('click', () => closeSlotsPanel(panel));
  panel.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target.closest('button') : null;
    if (!target) return;
    const getSlot = name => target.hasAttribute(name) ? normalizeSlot(target.getAttribute(name)) : null;

    let slot = getSlot('data-slot-save');
    if (slot !== null) {
      saveCurrentFlightToSlot(slot, panel, localStorage);
      return;
    }

    slot = getSlot('data-slot-select');
    if (slot !== null) {
      if (getActiveSlot(localStorage) === 0 && slot !== 0) preservePrimarySlot(localStorage);
      setActiveSlot(slot, localStorage);
      renderSlots(panel);
      return;
    }

    slot = getSlot('data-slot-load');
    if (slot !== null) {
      if (!activateSlotForLoad(slot)) return;
      closeSlotsPanel(panel);
      const continueButton = document.getElementById('contBtn');
      if (continueButton) continueButton.click();
      return;
    }

    slot = getSlot('data-slot-new');
    if (slot !== null) {
      if (getActiveSlot(localStorage) === 0 && slot !== 0) preservePrimarySlot(localStorage);
      setActiveSlot(slot, localStorage);
      closeSlotsPanel(panel);
      document.getElementById('btnNewGame')?.click();
      return;
    }

    slot = getSlot('data-slot-delete');
    if (slot !== null) {
      if (!window.confirm(`Очистить слот ${slot + 1}?`)) return;
      try {
        if (slot === 0) {
          localStorage.removeItem(PRIMARY_SLOT_BACKUP_KEY);
          localStorage.removeItem(PRIMARY_META_BACKUP_KEY);
          if (getActiveSlot(localStorage) === 0) {
            localStorage.removeItem(LEGACY_SAVE_KEY);
            localStorage.removeItem(LEGACY_META_KEY);
          }
        } else {
          localStorage.removeItem(saveKey(slot));
          localStorage.removeItem(metaKey(slot));
          if (slot === getActiveSlot(localStorage)) {
            localStorage.removeItem(LEGACY_SAVE_KEY);
            localStorage.removeItem(LEGACY_META_KEY);
          }
        }
      } catch (_) {}
      renderSlots(panel);
    }
  });

  panel.addEventListener('pointerdown', event => event.stopPropagation());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.style.display !== 'none') closeSlotsPanel(panel);
  });

  document.getElementById('contBtn')?.addEventListener('click', () => {
    const active = getActiveSlot(localStorage);
    syncSelectedSlotToLegacy(active, localStorage);
  }, true);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installFlightRuntimeGuard(window, document);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
