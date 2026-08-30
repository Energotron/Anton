export const SAVE_KEY = 'kr3_save_slot0';
export const CAREER_HISTORY_KEY = 'kr3_career_history';
export const CAREER_HISTORY_LIMIT = 40;

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function careerSnapshot(save = null) {
  if (!save || typeof save !== 'object') return null;
  const P = save.P || {};
  const G = save.G || {};
  const systems = Array.isArray(save.systems) ? save.systems : [];
  const visited = Array.isArray(G.visited) ? G.visited.length : 0;
  const currentSystem = systems.find(s => s && s.id === G.sysId);
  const rep = P.rep && typeof P.rep === 'object' ? P.rep : {};
  return {
    date: save.dateStr || '—',
    turn: Math.max(0, Math.floor(finiteNumber(G.turn ?? save.turn))),
    system: currentSystem?.name || '—',
    money: Math.max(0, Math.floor(finiteNumber(P.money))),
    kills: Math.max(0, Math.floor(finiteNumber(P.kills))),
    xp: Math.max(0, Math.floor(finiteNumber(P.xp))),
    visited,
    totalSystems: systems.length,
    reputation: { ...rep },
  };
}

export function readCareer(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? careerSnapshot(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function historySignature(snapshot) {
  if (!snapshot) return '';
  return JSON.stringify([
    snapshot.date, snapshot.turn, snapshot.system, snapshot.money,
    snapshot.kills, snapshot.xp, snapshot.visited, snapshot.totalSystems,
    snapshot.reputation || {},
  ]);
}

export function readCareerHistory(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') return [];
  try {
    const raw = storage.getItem(CAREER_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(-CAREER_HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export function recordCareerSnapshot(storage = globalThis?.localStorage, snapshot = readCareer(storage)) {
  if (!snapshot || !storage || typeof storage.setItem !== 'function') return false;
  const history = readCareerHistory(storage);
  const signature = historySignature(snapshot);
  if (history.length && historySignature(history[history.length - 1]) === signature) return false;
  history.push(snapshot);
  const trimmed = history.slice(-CAREER_HISTORY_LIMIT);
  try {
    storage.setItem(CAREER_HISTORY_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    return false;
  }
}

export function formatCareer(snapshot, factionNames = {}) {
  if (!snapshot) return 'Сохранённая карьера пока не найдена.';
  const repEntries = Object.entries(snapshot.reputation || {});
  const repText = repEntries.length
    ? repEntries.map(([id, value]) => `${factionNames[id] || id}: ${finiteNumber(value) >= 0 ? '+' : ''}${finiteNumber(value)}`).join(' · ')
    : 'нет данных';
  return [
    `Дата: ${snapshot.date} · Ход ${snapshot.turn}`,
    `Система: ${snapshot.system} · Посещено ${snapshot.visited}/${snapshot.totalSystems}`,
    `Кредиты: ${snapshot.money} · Опыт: ${snapshot.xp} · Победы: ${snapshot.kills}`,
    `Репутация: ${repText}`,
  ].join('\n');
}

export function formatCareerTimeline(history = []) {
  if (!history.length) return 'История появится после следующих сохранений.';
  return history.slice(-8).reverse().map(snapshot =>
    `${snapshot.date} · ход ${snapshot.turn} · ${snapshot.system} · XP ${snapshot.xp} · побед ${snapshot.kills}`
  ).join('\n');
}

function showCareerModal() {
  const panel = document.getElementById('panel');
  if (!panel) return;
  const snapshot = readCareer();
  recordCareerSnapshot(globalThis?.localStorage, snapshot);
  const history = readCareerHistory();
  const text = formatCareer(snapshot, {
    fed: 'Федерация Терра', mal: 'Малоки', pel: 'Пеленгская Лига',
    kla: 'Клиссаны', pir: 'Пираты Вольницы',
  });
  const timeline = formatCareerTimeline(history);
  panel.innerHTML = `<div class="pbox"><h2>📜 Карьера рейнджера</h2><div class="evTxt" style="white-space:pre-line">${text}</div><h3>Последние вехи</h3><div class="evTxt" style="white-space:pre-line">${timeline}</div><div class="prow"><button class="btn ghost" id="careerClose">Закрыть</button></div></div>`;
  panel.classList.remove('hidden');
  document.getElementById('careerClose')?.addEventListener('click', () => {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  });
}

export function installCareerHistoryButton(doc = globalThis?.document) {
  if (!doc || doc.getElementById('careerBtn')) return false;
  const help = doc.getElementById('btnHelp');
  if (!help?.parentNode) return false;
  const button = doc.createElement('button');
  button.className = 'mbtn ghost';
  button.id = 'careerBtn';
  button.type = 'button';
  button.textContent = '📜 КАРЬЕРА';
  button.addEventListener('click', showCareerModal);
  help.parentNode.insertBefore(button, help.nextSibling);
  return true;
}

export function installCareerRecorder(win = globalThis?.window, storage = globalThis?.localStorage) {
  if (!win || !storage || win.__kr3CareerRecorderInstalled) return false;
  const capture = () => recordCareerSnapshot(storage);
  win.__kr3CareerRecorderInstalled = true;
  win.addEventListener?.('pagehide', capture);
  win.addEventListener?.('beforeunload', capture);
  win.document?.addEventListener?.('visibilitychange', () => {
    if (win.document.visibilityState === 'hidden') capture();
  });
  win.setInterval?.(capture, 15000);
  capture();
  return true;
}

if (typeof document !== 'undefined') {
  const boot = () => {
    installCareerHistoryButton(document);
    installCareerRecorder(window, localStorage);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
