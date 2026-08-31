export const CANONICAL_CAMPAIGN_YEAR = 3550;
export const LEGACY_CAMPAIGN_YEAR = 3500;
export const CAMPAIGN_YEAR_OFFSET = CANONICAL_CAMPAIGN_YEAR - LEGACY_CAMPAIGN_YEAR;
export const ACTIVE_SLOT_KEY = 'kr3_active_save_slot';

export function saveKey(slot) {
  return slot === 0 ? 'kr3_save_slot0' : `kr3_save_slot${slot}`;
}

export function metaKey(slot) {
  return slot === 0 ? 'kr3_save_meta' : `kr3_save_meta_slot${slot}`;
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function parseDateString(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value || ''));
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

export function formatGameDate(date) {
  if (!date || !Number.isFinite(Number(date.year))) return '';
  const day = String(Number(date.day) || 1).padStart(2, '0');
  const month = String(Number(date.month) || 1).padStart(2, '0');
  return `${day}.${month}.${Number(date.year)}`;
}

export function migrateLegacyCampaignSave(input) {
  if (!input || typeof input !== 'object') return { data: input, migrated: false };
  const data = cloneJson(input);
  const date = data?.G?.date || parseDateString(data.dateStr);
  const year = Number(date?.year);
  if (!Number.isFinite(year) || year < LEGACY_CAMPAIGN_YEAR || year >= CANONICAL_CAMPAIGN_YEAR) {
    return { data, migrated: false };
  }

  const migratedDate = {
    year: year + CAMPAIGN_YEAR_OFFSET,
    month: Number(date.month) || 1,
    day: Number(date.day) || 1,
  };
  data.G = data.G || {};
  data.G.date = migratedDate;
  data.dateStr = formatGameDate(migratedDate);
  data.calendarEpoch = CANONICAL_CAMPAIGN_YEAR;
  return { data, migrated: true };
}

function readJson(storage, key) {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  storage?.setItem?.(key, JSON.stringify(value));
}

export function migrateSlot(storage, slot) {
  const sk = saveKey(slot);
  const mk = metaKey(slot);
  const save = readJson(storage, sk);
  if (!save) return false;
  const result = migrateLegacyCampaignSave(save);
  if (!result.migrated) return false;

  writeJson(storage, sk, result.data);
  const meta = readJson(storage, mk);
  if (meta) {
    meta.dateStr = result.data.dateStr;
    writeJson(storage, mk, meta);
  }
  return true;
}

export function migrateAllSlots(storage, slotCount = 5) {
  const migrated = [];
  for (let slot = 0; slot < slotCount; slot++) {
    if (migrateSlot(storage, slot)) migrated.push(slot);
  }
  return migrated;
}

function snapshotKeys(storage, keys) {
  const snapshot = new Map();
  for (const key of keys) snapshot.set(key, storage.getItem(key));
  return snapshot;
}

function restoreKeys(storage, snapshot) {
  for (const [key, value] of snapshot) {
    if (value == null) storage.removeItem(key);
    else storage.setItem(key, value);
  }
}

function currentSlot(storage) {
  const n = Number(storage.getItem(ACTIVE_SLOT_KEY));
  return Number.isInteger(n) && n >= 0 && n < 5 ? n : 0;
}

function refreshContinueLabel(win) {
  const btn = win.document?.getElementById?.('contBtn');
  if (!btn) return;
  const meta = readJson(win.localStorage, 'kr3_save_meta');
  if (!meta) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  btn.textContent = `💾 ПРОДОЛЖИТЬ (${meta.dateStr || '—'})`;
}

export function runCanonicalNewGame(win, originals) {
  const storage = win?.localStorage;
  if (!storage || typeof originals?.startNewGame !== 'function' || typeof originals?.saveGame !== 'function' || typeof originals?.loadGame !== 'function') return false;

  const slot = currentSlot(storage);
  const keys = new Set(['kr3_save_slot0', 'kr3_save_meta', saveKey(slot), metaKey(slot)]);
  const snapshot = snapshotKeys(storage, keys);

  originals.startNewGame();
  originals.saveGame(0);
  migrateSlot(storage, 0);
  originals.loadGame(0);
  restoreKeys(storage, snapshot);
  refreshContinueLabel(win);

  const toasts = win.document?.getElementById?.('toasts');
  if (toasts) toasts.innerHTML = '';
  return true;
}

export function runCanonicalLoad(win, originals) {
  if (!win?.localStorage || typeof originals?.loadGame !== 'function') return false;
  const slot = currentSlot(win.localStorage);
  migrateSlot(win.localStorage, slot);
  if (slot !== 0) {
    const save = win.localStorage.getItem(saveKey(slot));
    const meta = win.localStorage.getItem(metaKey(slot));
    if (save) win.localStorage.setItem('kr3_save_slot0', save);
    if (meta) win.localStorage.setItem('kr3_save_meta', meta);
  } else {
    migrateSlot(win.localStorage, 0);
  }
  return originals.loadGame(0);
}

export function installCampaignDateRuntime(win = globalThis?.window) {
  const doc = win?.document;
  if (!win || !doc || !win.localStorage || win.__kr3CampaignDateRuntimeInstalled) return false;
  win.__kr3CampaignDateRuntimeInstalled = true;

  migrateAllSlots(win.localStorage);
  const originals = {};
  const resolveOriginals = () => {
    if (!originals.startNewGame && typeof win.startNewGame === 'function') originals.startNewGame = win.startNewGame;
    if (!originals.saveGame && typeof win.saveGame === 'function') originals.saveGame = win.saveGame;
    if (!originals.loadGame && typeof win.loadGame === 'function') originals.loadGame = win.loadGame;
    return originals;
  };

  doc.getElementById('btnNewGame')?.addEventListener('click', event => {
    resolveOriginals();
    if (!originals.startNewGame || !originals.saveGame || !originals.loadGame) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runCanonicalNewGame(win, originals);
  }, true);

  doc.getElementById('contBtn')?.addEventListener('click', event => {
    resolveOriginals();
    if (!originals.loadGame) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runCanonicalLoad(win, originals);
  }, true);

  win.addEventListener?.('load', () => {
    resolveOriginals();
    if (originals.startNewGame) win.startNewGame = () => runCanonicalNewGame(win, originals);
    if (originals.loadGame) win.loadGame = () => runCanonicalLoad(win, originals);
  }, { once: true });

  return true;
}

if (typeof window !== 'undefined') installCampaignDateRuntime(window);
