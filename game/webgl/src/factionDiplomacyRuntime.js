export const SAVE_KEY = 'kr3_save_slot0';
export const SUPPORT_MIN_REPUTATION = 20;
export const SUPPORT_REPUTATION_COST = 2;
export const SUPPORT_FUEL = 15;
export const SUPPORT_COOLDOWN_TURNS = 5;

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cloneSave(save) {
  if (!save || typeof save !== 'object') return null;
  return {
    ...save,
    P: {
      ...(save.P || {}),
      rep: { ...(save.P?.rep || {}) },
    },
    G: {
      ...(save.G || {}),
      diplomacySupportUntil: { ...(save.G?.diplomacySupportUntil || {}) },
    },
    systems: Array.isArray(save.systems) ? save.systems.map(s => ({ ...s })) : [],
  };
}

export function currentFactionContext(save = null) {
  if (!save || typeof save !== 'object') return null;
  const systems = Array.isArray(save.systems) ? save.systems : [];
  const systemId = Math.trunc(finiteNumber(save.G?.sysId));
  const system = systems.find(s => s && Number(s.id) === systemId);
  const faction = system?.fac;
  if (!faction) return null;
  const reputation = Math.trunc(finiteNumber(save.P?.rep?.[faction]));
  const turn = Math.max(0, Math.trunc(finiteNumber(save.G?.turn)));
  const cooldownUntil = Math.max(0, Math.trunc(finiteNumber(save.G?.diplomacySupportUntil?.[faction])));
  return {
    faction,
    systemId,
    systemName: system?.name || `Система ${systemId}`,
    reputation,
    turn,
    cooldownUntil,
    cooldownRemaining: Math.max(0, cooldownUntil - turn),
  };
}

export function diplomaticSupportAvailability(save = null) {
  const context = currentFactionContext(save);
  if (!context) return { available: false, reason: 'no_faction', context };
  if (context.reputation < SUPPORT_MIN_REPUTATION) {
    return { available: false, reason: 'reputation', context };
  }
  if (context.cooldownRemaining > 0) {
    return { available: false, reason: 'cooldown', context };
  }
  const fuel = finiteNumber(save.P?.fuel);
  const maxFuel = Math.max(0, finiteNumber(save.P?.maxFuel));
  if (maxFuel <= 0 || fuel >= maxFuel) {
    return { available: false, reason: 'fuel_full', context };
  }
  return { available: true, reason: 'ok', context };
}

export function applyDiplomaticSupport(save = null) {
  const availability = diplomaticSupportAvailability(save);
  if (!availability.available) return { changed: false, ...availability, save };

  const next = cloneSave(save);
  const { faction, turn } = availability.context;
  const fuel = finiteNumber(next.P.fuel);
  const maxFuel = Math.max(0, finiteNumber(next.P.maxFuel));
  const grantedFuel = Math.max(0, Math.min(SUPPORT_FUEL, maxFuel - fuel));
  next.P.fuel = fuel + grantedFuel;
  next.P.rep[faction] = Math.trunc(finiteNumber(next.P.rep[faction])) - SUPPORT_REPUTATION_COST;
  next.G.diplomacySupportUntil[faction] = turn + SUPPORT_COOLDOWN_TURNS;

  return {
    changed: true,
    reason: 'granted',
    faction,
    grantedFuel,
    reputationDelta: -SUPPORT_REPUTATION_COST,
    cooldownUntil: turn + SUPPORT_COOLDOWN_TURNS,
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

function factionName(id) {
  return ({
    fed: 'Федерация Терра',
    mal: 'Малоки',
    pel: 'Пеленгская Лига',
    kla: 'Клиссаны',
    pir: 'Пираты Вольницы',
  })[id] || id || 'Неизвестная сторона';
}

function supportStatusText(availability) {
  const context = availability?.context;
  if (!context) return 'В этой системе нет доступного дипломатического канала.';
  const base = `${factionName(context.faction)} · репутация ${context.reputation >= 0 ? '+' : ''}${context.reputation}`;
  if (availability.available) {
    return `${base}\nДоверие позволяет запросить экстренную топливную поддержку: +${SUPPORT_FUEL} топлива за ${SUPPORT_REPUTATION_COST} очка репутации.`;
  }
  if (availability.reason === 'reputation') return `${base}\nНужно доверие не ниже +${SUPPORT_MIN_REPUTATION}, чтобы администрация одобрила поддержку.`;
  if (availability.reason === 'cooldown') return `${base}\nКанал поддержки восстановится через ${context.cooldownRemaining} ход.`;
  if (availability.reason === 'fuel_full') return `${base}\nТопливные баки уже заполнены.`;
  return `${base}\nПоддержка сейчас недоступна.`;
}

function refreshLiveSave(win) {
  if (!win || typeof win.saveGame !== 'function') return;
  const menu = win.document?.getElementById('menu');
  if (menu && !menu.classList.contains('hidden')) return;
  try { win.saveGame(0); } catch {}
}

function showDiplomacyPanel(win = globalThis?.window) {
  const doc = win?.document;
  const panel = doc?.getElementById?.('panel');
  if (!panel) return;
  refreshLiveSave(win);
  const current = readSave(win.localStorage);
  const availability = diplomaticSupportAvailability(current);
  const disabled = availability.available ? '' : ' disabled';
  panel.innerHTML = `<div class="pbox"><h2>🤝 Дипломатический канал</h2><div class="sub">Локальные отношения дают реальные услуги и ограничения</div><div class="evTxt" style="white-space:pre-line">${supportStatusText(availability)}</div><div class="prow"><button class="btn" id="diplomacySupport"${disabled}>Запросить поддержку</button><button class="btn ghost" id="diplomacyClose">Закрыть</button></div></div>`;
  panel.classList.remove('hidden');

  doc.getElementById('diplomacyClose')?.addEventListener('click', () => {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  });
  doc.getElementById('diplomacySupport')?.addEventListener('click', () => {
    const outcome = applyDiplomaticSupport(readSave(win.localStorage));
    if (!outcome.changed) return showDiplomacyPanel(win);
    win.localStorage.setItem(SAVE_KEY, JSON.stringify(outcome.save));
    if (typeof win.loadGame === 'function') {
      try { win.loadGame(0); } catch {}
    }
    try {
      win.dispatchEvent(new CustomEvent('kr3:diplomacy-support', { detail: outcome }));
    } catch {}
    showDiplomacyPanel(win);
  });
}

export function installFactionDiplomacyButton(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.getElementById('diplomacyBtn')) return false;
  const reputation = doc.getElementById('repIntelBtn');
  const career = doc.getElementById('careerBtn');
  const anchor = reputation || career || doc.getElementById('btnHelp');
  if (!anchor?.parentNode) return false;
  const button = doc.createElement('button');
  button.className = 'mbtn ghost';
  button.id = 'diplomacyBtn';
  button.type = 'button';
  button.textContent = '🤝 ДИПЛОМАТИЯ';
  button.addEventListener('click', () => showDiplomacyPanel(win));
  anchor.parentNode.insertBefore(button, anchor.nextSibling);
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installFactionDiplomacyButton(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
