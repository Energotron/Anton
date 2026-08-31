export const SAVE_KEY = 'kr3_save_slot0';

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function reputationStanding(score = 0) {
  const value = finiteNumber(score);
  if (value <= -30) return { id: 'hostile', label: 'Враждебность', icon: '☠️' };
  if (value < 0) return { id: 'distrusted', label: 'Недоверие', icon: '⚠️' };
  if (value < 20) return { id: 'neutral', label: 'Нейтралитет', icon: '◌' };
  if (value < 50) return { id: 'trusted', label: 'Доверие', icon: '🤝' };
  return { id: 'allied', label: 'Союзник', icon: '⭐' };
}

export function reputationSnapshot(save = null) {
  if (!save || typeof save !== 'object') return null;
  const rep = save.P?.rep;
  if (!rep || typeof rep !== 'object' || Array.isArray(rep)) return null;
  return Object.entries(rep)
    .map(([faction, rawScore]) => {
      const score = Math.trunc(finiteNumber(rawScore));
      return { faction, score, standing: reputationStanding(score) };
    })
    .sort((a, b) => b.score - a.score || a.faction.localeCompare(b.faction));
}

export function readReputation(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? reputationSnapshot(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function formatReputationIntel(entries = null, factionNames = {}) {
  if (!entries?.length) return 'Данные о репутации появятся после сохранения игры.';
  return entries.map(({ faction, score, standing }) => {
    const sign = score >= 0 ? '+' : '';
    return `${standing.icon} ${factionNames[faction] || faction}: ${sign}${score} — ${standing.label}`;
  }).join('\n');
}

function refreshLiveSave(win = globalThis?.window) {
  if (!win || typeof win.saveGame !== 'function') return;
  const menu = win.document?.getElementById('menu');
  if (menu && !menu.classList.contains('hidden')) return;
  try { win.saveGame(0); } catch {}
}

function showReputationModal() {
  refreshLiveSave();
  const panel = document.getElementById('panel');
  if (!panel) return;
  const entries = readReputation();
  const text = formatReputationIntel(entries, {
    fed: 'Федерация Терра',
    mal: 'Малоки',
    pel: 'Пеленгская Лига',
    kla: 'Клиссаны',
    pir: 'Пираты Вольницы',
  });
  panel.innerHTML = `<div class="pbox"><h2>📡 Репутация и отношения</h2><div class="sub">Текущая дипломатическая сводка рейнджера</div><div class="evTxt" style="white-space:pre-line">${text}</div><div class="prow"><button class="btn ghost" id="repIntelClose">Закрыть</button></div></div>`;
  panel.classList.remove('hidden');
  document.getElementById('repIntelClose')?.addEventListener('click', () => {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  });
}

export function installReputationIntelButton(doc = globalThis?.document) {
  if (!doc || doc.getElementById('repIntelBtn')) return false;
  const career = doc.getElementById('careerBtn');
  const help = doc.getElementById('btnHelp');
  const anchor = career || help;
  if (!anchor?.parentNode) return false;
  const button = doc.createElement('button');
  button.className = 'mbtn ghost';
  button.id = 'repIntelBtn';
  button.type = 'button';
  button.textContent = '📡 РЕПУТАЦИЯ';
  button.addEventListener('click', showReputationModal);
  anchor.parentNode.insertBefore(button, anchor.nextSibling);
  return true;
}

if (typeof document !== 'undefined') {
  const boot = () => installReputationIntelButton(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
