import { resolveDeliveryAtDock, resolveDeliveryOnDayAdvance } from './questDelivery.js';

export const SAVE_KEY = 'kr3_save_slot0';

function cloneSave(save) {
  if (!save || typeof save !== 'object') return null;
  return {
    ...save,
    P: { ...(save.P || {}) },
    G: { ...(save.G || {}) },
  };
}

export function resolveSavedDeliveryState(save = null) {
  const next = cloneSave(save);
  const quest = next?.G?.activeQuest || null;
  if (!next || !quest) return { changed: false, status: 'none', save };

  const day = Number(next.G.day || 0);
  const systemId = Number(next.G.sysId || 0);
  const docked = Number.isInteger(next.P?.docked) ? next.P.docked : null;

  const result = docked === null
    ? resolveDeliveryOnDayAdvance({
        quest,
        day,
        reputation: next.P.rep || {},
      })
    : resolveDeliveryAtDock({
        quest,
        day,
        systemId,
        planetIdx: docked,
        cargo: next.P.cargo || {},
        money: next.P.money || 0,
        xp: next.P.xp || 0,
        reputation: next.P.rep || {},
      });

  if (result.status !== 'completed' && result.status !== 'expired') {
    return { changed: false, status: result.status, save };
  }

  next.G.activeQuest = result.quest;
  next.P.rep = result.reputation;

  if (result.status === 'completed') {
    next.P.cargo = result.cargo;
    next.P.money = result.money;
    next.P.xp = result.xp;
  }

  return {
    changed: true,
    status: result.status,
    reputationDelta: Number(result.reputationDelta || 0),
    reward: Number(result.reward || 0),
    xpAward: Number(result.xpAward || 0),
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

function showOutcome(doc, outcome) {
  const host = doc?.getElementById?.('toasts') || doc?.body;
  if (!host || !doc?.createElement) return;
  const node = doc.createElement('div');
  node.textContent = outcome.status === 'completed'
    ? `Контракт выполнен · +${outcome.reward} кр · +${outcome.xpAward} XP · репутация ${outcome.reputationDelta >= 0 ? '+' : ''}${outcome.reputationDelta}`
    : `Контракт просрочен · репутация ${outcome.reputationDelta}`;
  node.style.cssText = 'pointer-events:none;margin:6px;padding:8px 10px;border:1px solid rgba(140,190,255,.35);background:rgba(5,12,28,.92);color:#dce9ff;font-size:12px;border-radius:6px';
  host.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

export function reconcileDeliveryContract(win = globalThis?.window) {
  const storage = win?.localStorage;
  if (!storage || typeof win?.saveGame !== 'function') return { changed: false, status: 'unavailable' };

  try { win.saveGame(0); } catch { return { changed: false, status: 'save_failed' }; }
  const current = readSave(storage);
  const outcome = resolveSavedDeliveryState(current);
  if (!outcome.changed) return outcome;

  storage.setItem(SAVE_KEY, JSON.stringify(outcome.save));
  if (typeof win.loadGame === 'function') {
    try { win.loadGame(0); } catch {}
  }
  showOutcome(win.document, outcome);
  try {
    win.dispatchEvent(new CustomEvent('kr3:contract-outcome', { detail: outcome }));
  } catch {}
  return outcome;
}

export function installContractOutcomeRuntime(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.documentElement?.dataset?.contractOutcomeRuntime === '1') return false;
  doc.documentElement.dataset.contractOutcomeRuntime = '1';

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      reconcileDeliveryContract(win);
    }, 0);
  };

  doc.addEventListener('pointerup', queue, true);
  doc.addEventListener('keyup', queue, true);
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installContractOutcomeRuntime(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
