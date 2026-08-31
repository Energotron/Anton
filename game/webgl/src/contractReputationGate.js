import { canAcceptDelivery, DELIVERY_MIN_REPUTATION } from './questDelivery.js';

export const SAVE_KEY = 'kr3_save_slot0';

export const CONTRACT_FACTION_NAMES = Object.freeze({
  fed: 'Федерация Терра',
  mal: 'Малоки',
  pel: 'Пеленгская Лига',
  kla: 'Клиссаны',
  pir: 'Пираты Вольницы',
});

function int(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function issuerFactionForOffer(save = null, offer = null) {
  if (!offer) return null;
  if (offer.issuerFaction || offer.faction) return offer.issuerFaction || offer.faction;
  const sysId = int(save?.G?.sysId, -1);
  return save?.systems?.find?.(system => int(system?.id, -2) === sysId)?.fac || null;
}

export function contractReputationState(save = null, offer = null) {
  const faction = issuerFactionForOffer(save, offer);
  const normalizedOffer = offer && faction ? { ...offer, issuerFaction: faction } : offer;
  const availability = canAcceptDelivery({
    activeQuest: save?.G?.activeQuest || null,
    cargo: save?.P?.cargo || {},
    capacity: save?.P?.cap || 0,
    offer: normalizedOffer,
    reputation: save?.P?.rep || {},
  });
  const score = faction ? int(save?.P?.rep?.[faction], 0) : null;
  return {
    ...availability,
    faction,
    factionName: faction ? (CONTRACT_FACTION_NAMES[faction] || faction) : null,
    score,
    minimumReputation: faction ? DELIVERY_MIN_REPUTATION : null,
    reputationLocked: availability.reason === 'reputation_too_low',
  };
}

export function readCurrentSave(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function refreshLiveSave(win = globalThis?.window) {
  if (!win || typeof win.saveGame !== 'function') return;
  const menu = win.document?.getElementById('menu');
  if (menu && !menu.classList.contains('hidden')) return;
  try { win.saveGame(0); } catch {}
}

function feedback(button, state) {
  const host = button?.closest?.('.evTxt') || button?.parentElement;
  if (!host) return;
  let notice = host.querySelector?.('[data-contract-gate-notice]');
  if (!notice) {
    notice = host.ownerDocument.createElement('div');
    notice.dataset.contractGateNotice = '1';
    notice.style.cssText = 'margin-top:6px;font-size:11px;color:#ff8f8f';
    host.appendChild(notice);
  }
  const reason = state.reason === 'active_quest'
    ? 'Сначала завершите или отмените активный контракт.'
    : state.reason === 'cargo_full'
      ? 'Недостаточно свободного места в трюме.'
      : `Репутация ${state.factionName || 'заказчика'} слишком низкая: ${state.score}. Требуется ${state.minimumReputation} или выше.`;
  notice.textContent = reason;
}

export function decorateContractButtons(doc = globalThis?.document, storage = globalThis?.localStorage) {
  if (!doc) return 0;
  const save = readCurrentSave(storage);
  if (!save) return 0;
  let decorated = 0;
  doc.querySelectorAll?.('[data-take]').forEach(button => {
    const index = int(button.dataset.take, -1);
    const offer = save?.G?.offers?.[index];
    if (!offer) return;
    const state = contractReputationState(save, offer);
    const host = button.closest?.('.evTxt') || button.parentElement;
    if (!host) return;
    let intel = host.querySelector?.('[data-contract-reputation]');
    if (!intel) {
      intel = doc.createElement('div');
      intel.dataset.contractReputation = '1';
      intel.style.cssText = 'margin-top:5px;font-size:11px;color:#9fb8e8';
      button.before(intel);
    }
    if (state.faction) {
      const sign = state.score >= 0 ? '+' : '';
      intel.textContent = `Заказчик: ${state.factionName} · репутация ${sign}${state.score} · допуск от ${state.minimumReputation}`;
    } else {
      intel.textContent = 'Заказчик: независимый контракт';
    }
    if (state.reputationLocked || state.reason === 'active_quest') {
      button.disabled = true;
      button.title = state.reputationLocked
        ? `Контракт недоступен: репутация ниже ${state.minimumReputation}`
        : 'Сначала завершите активный контракт';
    }
    decorated++;
  });
  return decorated;
}

export function installContractReputationGate(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.documentElement?.dataset?.contractReputationGate === '1') return false;
  doc.documentElement.dataset.contractReputationGate = '1';

  const refresh = () => {
    refreshLiveSave(win);
    decorateContractButtons(doc, win.localStorage);
  };

  doc.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-take]');
    if (!button) return;
    refreshLiveSave(win);
    const save = readCurrentSave(win.localStorage);
    const index = int(button.dataset.take, -1);
    const offer = save?.G?.offers?.[index];
    if (!offer) return;
    const state = contractReputationState(save, offer);
    if (state.ok) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    feedback(button, state);
  }, true);

  const observer = typeof win.MutationObserver === 'function'
    ? new win.MutationObserver(() => decorateContractButtons(doc, win.localStorage))
    : null;
  observer?.observe(doc.getElementById('panel') || doc.body, { childList: true, subtree: true });
  doc.addEventListener('pointerup', refresh, true);
  refresh();
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installContractReputationGate(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
