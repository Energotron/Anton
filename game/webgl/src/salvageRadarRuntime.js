import { buildSalvageRadarSummary } from './salvageRadarIntel.js';

const SAVE_KEY = 'kr3_save_slot0';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readLiveSave(win) {
  const menu = win?.document?.getElementById?.('menu');
  if (!menu || menu.classList.contains('hidden')) {
    try { win?.saveGame?.(0); } catch {}
  }
  try {
    const raw = win?.localStorage?.getItem?.(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function showSalvageRadarPanel(win = globalThis?.window) {
  const doc = win?.document;
  const panel = doc?.getElementById?.('panel');
  if (!panel) return false;
  const summary = buildSalvageRadarSummary(readLiveSave(win));
  const rows = summary.visible.length
    ? summary.visible.map(contact => `<div class="evTxt" style="margin:6px 0"><b>🧲 ${esc(contact.goodName)} ×${contact.amount}</b> · ${contact.distance} м · ${esc(contact.bearing)}${contact.sourceType ? ` · обломки ${esc(contact.sourceType)}` : ''}</div>`).join('')
    : '<div class="evTxt">В пределах радара нет сохранённых обломков.</div>';
  const nearest = summary.nearest
    ? `Ближайший контакт: ${esc(summary.nearest.goodName)} ×${summary.nearest.amount}, ${summary.nearest.distance} м, курс ${esc(summary.nearest.bearing)}.`
    : 'Радар не видит доступного salvage.';
  panel.innerHTML = `<div class="pbox"><h2>🧲 Радар обломков</h2><div class="sub">Локационная сводка по сохранённому salvage текущей системы.</div><div class="evTxt" style="margin-top:10px">${nearest}<br>В зоне радара: ${summary.visible.length} · единиц груза: ${summary.totalAmount}${summary.hidden ? ` · вне радара: ${summary.hidden}` : ''}</div>${rows}<div class="prow"><button class="btn ghost" id="salvageRadarClose">Закрыть</button></div></div>`;
  panel.classList.remove('hidden');
  doc.getElementById('salvageRadarClose')?.addEventListener('click', () => {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  });
  return true;
}

export function installSalvageRadarButton(win = globalThis?.window) {
  const doc = win?.document;
  const turnButtons = doc?.getElementById?.('tbtns');
  if (!turnButtons || doc.getElementById('bSalvageRadar')) return false;
  const button = doc.createElement('button');
  button.id = 'bSalvageRadar';
  button.type = 'button';
  button.textContent = '🧲 ОБЛОМКИ';
  button.title = 'Показать salvage-контакты в пределах радара';
  button.addEventListener('pointerdown', event => {
    event.stopPropagation();
    showSalvageRadarPanel(win);
  });
  turnButtons.insertBefore(button, turnButtons.firstChild || null);
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installSalvageRadarButton(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
