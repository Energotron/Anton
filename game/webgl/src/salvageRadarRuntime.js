import { buildSalvageRadarSummary, salvageContactToMinimapPoint } from './salvageRadarIntel.js';

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

function dispatchSalvageMinimapCommand(win, save, contact, shiftKey) {
  const doc = win?.document;
  const minimap = doc?.getElementById?.('mm');
  const point = salvageContactToMinimapPoint(save, contact);
  if (!minimap || !point) return false;

  doc.getElementById?.('ctxCam')?.click?.();
  const rect = minimap.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0 || typeof win?.PointerEvent !== 'function') return false;
  const event = new win.PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + (point.x / 264) * rect.width,
    clientY: rect.top + (point.y / 264) * rect.height,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
    shiftKey: Boolean(shiftKey),
  });
  minimap.dispatchEvent(event);
  return true;
}

export function focusSalvageContact(win = globalThis?.window, save = null, contact = null) {
  return dispatchSalvageMinimapCommand(win, save, contact, true);
}

export function courseSalvageContact(win = globalThis?.window, save = null, contact = null) {
  return dispatchSalvageMinimapCommand(win, save, contact, false);
}

export function showSalvageRadarPanel(win = globalThis?.window) {
  const doc = win?.document;
  const panel = doc?.getElementById?.('panel');
  if (!panel) return false;
  const save = readLiveSave(win);
  const summary = buildSalvageRadarSummary(save);
  const rows = summary.visible.length
    ? summary.visible.map((contact, index) => {
      const pickup = contact.pickupReady
        ? ' · <b>✅ В радиусе трактора</b>'
        : ` · до трактора: ${contact.pickupGap} м`;
      return `<div class="evTxt" style="margin:6px 0"><b>🧲 ${esc(contact.goodName)} ×${contact.amount}</b> · ${contact.distance} м · ${esc(contact.bearing)}${pickup}${contact.sourceType ? ` · обломки ${esc(contact.sourceType)}` : ''} <button class="mini" type="button" data-salvage-course="${index}">📍 Курс</button> <button class="mini" type="button" data-salvage-focus="${index}">📷 Фокус</button></div>`;
    }).join('')
    : '<div class="evTxt">В пределах радара нет сохранённых обломков.</div>';
  const nearest = summary.nearest
    ? `Ближайший контакт: ${esc(summary.nearest.goodName)} ×${summary.nearest.amount}, ${summary.nearest.distance} м, курс ${esc(summary.nearest.bearing)}${summary.nearest.pickupReady ? ' — трактор готов.' : `, до захвата ${summary.nearest.pickupGap} м.`}`
    : 'Радар не видит доступного salvage.';
  panel.innerHTML = `<div class="pbox"><h2>🧲 Радар обломков</h2><div class="sub">Локационная сводка по сохранённому salvage текущей системы.</div><div class="evTxt" style="margin-top:10px">${nearest}<br>В зоне радара: ${summary.visible.length} · единиц груза: ${summary.totalAmount}${summary.ready.length ? ` · в радиусе трактора: ${summary.ready.length}` : ''}${summary.hidden ? ` · вне радара: ${summary.hidden}` : ''}</div>${rows}<div class="prow"><button class="btn ghost" id="salvageRadarClose">Закрыть</button></div></div>`;
  panel.classList.remove('hidden');
  const closeAfter = command => button => {
    button.addEventListener('click', () => {
      const contact = summary.visible[Number(button.dataset.salvageCourse ?? button.dataset.salvageFocus)];
      if (!contact || !command(win, save, contact)) return;
      panel.classList.add('hidden');
      panel.innerHTML = '';
    });
  };
  panel.querySelectorAll?.('[data-salvage-course]')?.forEach(closeAfter(courseSalvageContact));
  panel.querySelectorAll?.('[data-salvage-focus]')?.forEach(closeAfter(focusSalvageContact));
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
