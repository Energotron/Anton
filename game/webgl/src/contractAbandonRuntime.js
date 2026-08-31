import { abandonDelivery } from './questDelivery.js';

export const SAVE_KEY = 'kr3_save_slot0';

function nonNegativeInt(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function cloneSave(save) {
  if (!save || typeof save !== 'object') return null;
  return {
    ...save,
    P: {
      ...(save.P || {}),
      cargo: { ...(save.P?.cargo || {}) },
      rep: { ...(save.P?.rep || {}) },
    },
    G: { ...(save.G || {}) },
  };
}

export function abandonSavedDelivery(save = null) {
  const next = cloneSave(save);
  const quest = next?.G?.activeQuest || null;
  if (!next || !quest) return { changed: false, status: 'none', save };

  const result = abandonDelivery({ quest, reputation: next.P.rep || {} });
  next.G.activeQuest = result.quest;
  next.P.rep = result.reputation;

  let cargoRemoved = 0;
  if (!quest.missionCargo && quest.g) {
    const have = nonNegativeInt(next.P.cargo?.[quest.g]);
    cargoRemoved = Math.min(have, nonNegativeInt(quest.q));
    const remaining = have - cargoRemoved;
    if (remaining > 0) next.P.cargo[quest.g] = remaining;
    else delete next.P.cargo[quest.g];
  }

  return {
    changed: true,
    status: 'abandoned',
    reputationDelta: Number(result.reputationDelta || 0),
    cargoRemoved,
    cargoGood: quest.g ?? null,
    save: next,
  };
}

function readSave(storage) {
  try {
    const raw = storage?.getItem?.(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function refreshLiveSave(win) {
  const menu = win?.document?.getElementById?.('menu');
  if (menu && !menu.classList.contains('hidden')) return false;
  if (typeof win?.saveGame !== 'function') return false;
  try {
    win.saveGame(0);
    return true;
  } catch {
    return false;
  }
}

function showOutcome(doc, outcome) {
  const host = doc?.getElementById?.('toasts') || doc?.body;
  if (!host || !doc?.createElement) return;
  const node = doc.createElement('div');
  const cargoNote = outcome.cargoRemoved > 0 ? ` · груз возвращён заказчику: ${outcome.cargoRemoved}` : '';
  node.textContent = `Контракт отменён · репутация ${outcome.reputationDelta}${cargoNote}`;
  node.style.cssText = 'pointer-events:none;margin:6px;padding:8px 10px;border:1px solid rgba(255,150,130,.4);background:rgba(28,9,8,.94);color:#ffd8cf;font-size:12px;border-radius:6px';
  host.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

export function abandonCurrentDelivery(win = globalThis?.window) {
  const storage = win?.localStorage;
  if (!storage) return { changed: false, status: 'unavailable' };
  refreshLiveSave(win);
  const current = readSave(storage);
  const outcome = abandonSavedDelivery(current);
  if (!outcome.changed) return outcome;

  storage.setItem(SAVE_KEY, JSON.stringify(outcome.save));
  if (typeof win?.loadGame === 'function') {
    try { win.loadGame(0); } catch {}
  }
  showOutcome(win?.document, outcome);
  try {
    win.dispatchEvent(new CustomEvent('kr3:contract-abandoned', { detail: outcome }));
  } catch {}
  return outcome;
}

export function decorateAbandonControl(doc = globalThis?.document, storage = globalThis?.localStorage) {
  const host = doc?.getElementById?.('questLog');
  if (!host) return false;
  const save = readSave(storage);
  const existing = host.querySelector?.('[data-abandon-delivery]');
  if (!save?.G?.activeQuest) {
    existing?.remove?.();
    return false;
  }
  if (existing) return true;

  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.abandonDelivery = '1';
  button.textContent = '✕ Отказаться от контракта';
  button.title = 'Отмена активного контракта снижает репутацию заказчика';
  button.style.cssText = 'margin-top:6px;padding:5px 8px;border:1px solid rgba(255,130,110,.45);background:rgba(70,20,18,.7);color:#ffd3cb;border-radius:5px;font:inherit;cursor:pointer';
  host.appendChild(button);
  return true;
}

export function installContractAbandonRuntime(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.documentElement?.dataset?.contractAbandonRuntime === '1') return false;
  doc.documentElement.dataset.contractAbandonRuntime = '1';

  const refresh = () => {
    refreshLiveSave(win);
    decorateAbandonControl(doc, win.localStorage);
  };

  doc.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-abandon-delivery]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const approved = typeof win.confirm !== 'function'
      || win.confirm('Отказаться от активного контракта? Репутация заказчика снизится.');
    if (!approved) return;
    abandonCurrentDelivery(win);
  });

  const host = doc.getElementById('questLog');
  const observer = host && typeof win.MutationObserver === 'function'
    ? new win.MutationObserver(() => decorateAbandonControl(doc, win.localStorage))
    : null;
  observer?.observe(host, { childList: true, subtree: false });
  doc.addEventListener('pointerup', refresh, true);
  win.addEventListener?.('kr3:contract-outcome', refresh);
  refresh();
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installContractAbandonRuntime(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
