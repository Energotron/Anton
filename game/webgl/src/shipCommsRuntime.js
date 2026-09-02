import { GOODS } from '../js/data.js';

export const SAVE_KEY = 'kr3_save_slot0';

const ROLE_NAMES = Object.freeze({
  trader: 'торговец',
  patrol: 'патруль',
  pirate: 'пират',
  raider: 'рейдер',
});

const FACTION_NAMES = Object.freeze({
  fed: 'Федерация Терра',
  mal: 'Малоки',
  pel: 'Пеленгская Лига',
  kla: 'Клиссаны',
  pir: 'Пираты Вольницы',
});

const COMPASS_DIRECTIONS = Object.freeze([
  'север',
  'северо-восток',
  'восток',
  'юго-восток',
  'юг',
  'юго-запад',
  'запад',
  'северо-запад',
]);

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(finite(ax) - finite(bx), finite(ay) - finite(by));
}

function compassBearing(ax, ay, bx, by) {
  const dx = finite(bx) - finite(ax);
  const dy = finite(by) - finite(ay);
  const degrees = Math.atan2(dx, -dy) * 180 / Math.PI;
  return Math.round((degrees + 360) % 360);
}

export function compassDirection(bearing) {
  const normalized = ((finite(bearing) % 360) + 360) % 360;
  return COMPASS_DIRECTIONS[Math.round(normalized / 45) % COMPASS_DIRECTIONS.length];
}

function salvageGoodName(goodId) {
  const id = String(goodId || '');
  return GOODS.find(good => good.id === id)?.n || 'неизвестный груз';
}

export function contactDisposition(contact = {}, reputation = 0) {
  if (contact.fac === 'pir' || contact.type === 'pirate' || contact.type === 'raider') return 'hostile';
  if (contact.playerAggressed) return 'hostile';
  if (reputation < -20) return 'hostile';
  if (reputation < 0) return 'cold';
  if (reputation >= 20) return 'friendly';
  return 'neutral';
}

export function listRadioContacts(save = null) {
  if (!save || typeof save !== 'object') return [];
  const player = save.P || {};
  const radar = Math.max(0, finite(player.radar));
  const rep = player.rep || {};
  const ships = Array.isArray(save.demoShips) ? save.demoShips : [];

  return ships
    .filter(ship => ship && finite(ship.hull, 0) > 0)
    .map(ship => {
      const d = distance(player.x, player.y, ship.x, ship.y);
      const reputation = Math.trunc(finite(rep[ship.fac], 0));
      return {
        uid: ship.uid,
        type: ship.type || 'ship',
        roleName: ROLE_NAMES[ship.type] || 'корабль',
        fac: ship.fac || 'unknown',
        factionName: FACTION_NAMES[ship.fac] || ship.fac || 'неизвестная сторона',
        hull: Math.max(0, Math.round(finite(ship.hull))),
        distance: Math.round(d),
        reputation,
        playerAggressed: !!ship.playerAggressed,
        disposition: contactDisposition(ship, reputation),
      };
    })
    .filter(contact => radar > 0 && contact.distance <= radar)
    .sort((a, b) => a.distance - b.distance || finite(a.uid) - finite(b.uid));
}

export function summarizeSystemSalvage(save = null, systemId = null) {
  const id = Number(systemId);
  if (!save || typeof save !== 'object' || !Number.isInteger(id) || id < 0) {
    return { fields: 0, units: 0 };
  }
  const raw = save.salvagePersistence?.systems?.[String(id)];
  if (!Array.isArray(raw)) return { fields: 0, units: 0 };
  let fields = 0;
  let units = 0;
  for (const record of raw) {
    const amount = Math.floor(Number(record?.amount));
    const x = Number(record?.x);
    const y = Number(record?.y);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    fields++;
    units += amount;
  }
  return { fields, units };
}

export function nearestSystemSalvage(save = null, systemId = null) {
  const id = Number(systemId);
  if (!save || typeof save !== 'object' || !Number.isInteger(id) || id < 0) return null;
  const raw = save.salvagePersistence?.systems?.[String(id)];
  if (!Array.isArray(raw)) return null;
  const px = Number(save.P?.x);
  const py = Number(save.P?.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  let nearest = null;
  for (const record of raw) {
    const amount = Math.floor(Number(record?.amount));
    const x = Number(record?.x);
    const y = Number(record?.y);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    const range = Math.round(distance(px, py, x, y));
    if (!nearest || range < nearest.distance) {
      const bearing = compassBearing(px, py, x, y);
      nearest = {
        goodId: String(record?.goodId || ''),
        goodName: salvageGoodName(record?.goodId),
        amount,
        distance: range,
        bearing,
        direction: compassDirection(bearing),
      };
    }
  }
  return nearest;
}

export function buildHailProfile(contact, save = null) {
  if (!contact) return null;
  const systems = Array.isArray(save?.systems) ? save.systems : [];
  const systemId = Math.trunc(finite(save?.G?.sysId, -1));
  const system = systems.find(s => Number(s?.id) === systemId) || null;
  const danger = Math.max(1, Math.min(5, Math.trunc(finite(system?.danger, 1))));
  const portCount = Array.isArray(system?.planets) ? system.planets.filter(p => p?.hasPort).length : 0;
  const systemName = system?.name || `Система ${systemId >= 0 ? systemId : '—'}`;
  const salvage = summarizeSystemSalvage(save, systemId);
  const nearestSalvage = nearestSystemSalvage(save, systemId);
  const salvageIntel = salvage.fields > 0
    ? ` Обломки на сенсорах: ${salvage.fields} пол., ${salvage.units} ед. груза.${nearestSalvage ? ` Ближайшее поле: ${nearestSalvage.distance} м — ${nearestSalvage.goodName} ×${nearestSalvage.amount}, курс ${nearestSalvage.bearing}° (${nearestSalvage.direction}).` : ''}`
    : ' Обломков на сенсорах нет.';

  const openingByDisposition = {
    friendly: 'Канал открыт. Рад видеть рейнджера на этой частоте.',
    neutral: 'Связь установлена. Передавайте запрос.',
    cold: 'Канал открыт в ограниченном режиме. Без лишних манёвров.',
    hostile: 'Частота захвачена. Говори быстро, рейнджер.',
  };

  let status = `Мы держим курс в системе ${systemName}. Уровень угрозы ${danger}/5.${salvageIntel}`;
  if (contact.type === 'trader') {
    status = `Торговый маршрут через ${systemName} активен. Доступных портов: ${portCount}. Угроза ${danger}/5.${salvageIntel}`;
  } else if (contact.type === 'patrol') {
    status = `Патруль контролирует ${systemName}. Тактическая оценка угрозы: ${danger}/5.${salvageIntel}`;
  } else if (contact.type === 'pirate' || contact.type === 'raider') {
    status = danger >= 4
      ? `Здесь опасный сектор, и это нам нравится. ${systemName} сейчас оценивается в ${danger}/5.${salvageIntel}`
      : `Мы работаем на этой трассе. ${systemName}: риск ${danger}/5.${salvageIntel}`;
  }

  if (contact.playerAggressed && contact.type === 'patrol') {
    status = `Вы опознаны как агрессор. Патруль ведёт перехват в системе ${systemName}; остановите корабль и прекратите огонь.`;
  } else if (contact.playerAggressed && contact.type === 'trader') {
    status = `Нападение зарегистрировано. Торговое судно уходит из зоны огня и передало патрулю сигнал SOS в системе ${systemName}.`;
  }

  return {
    ...contact,
    systemId,
    systemName,
    danger,
    portCount,
    salvageFields: salvage.fields,
    salvageUnits: salvage.units,
    nearestSalvageDistance: nearestSalvage?.distance ?? null,
    nearestSalvageGoodId: nearestSalvage?.goodId ?? null,
    nearestSalvageGoodName: nearestSalvage?.goodName ?? null,
    nearestSalvageAmount: nearestSalvage?.amount ?? null,
    nearestSalvageBearing: nearestSalvage?.bearing ?? null,
    nearestSalvageDirection: nearestSalvage?.direction ?? null,
    opening: openingByDisposition[contact.disposition] || openingByDisposition.neutral,
    identity: `${contact.factionName} · ${contact.roleName} · борт #${contact.uid}`,
    status,
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
  if (menu && !menu.classList.contains('hidden')) return;
  if (typeof win?.saveGame === 'function') {
    try { win.saveGame(0); } catch {}
  }
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function closePanel(win) {
  const panel = win?.document?.getElementById?.('panel');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.innerHTML = '';
}

function renderConversation(win, contact) {
  refreshLiveSave(win);
  const save = readSave(win.localStorage);
  const liveContact = listRadioContacts(save).find(c => String(c.uid) === String(contact.uid));
  const panel = win.document.getElementById('panel');
  if (!panel) return;
  if (!liveContact) {
    panel.innerHTML = '<div class="pbox"><h2>📡 Канал потерян</h2><div class="evTxt">Корабль вышел за пределы радара или больше не отвечает.</div><div class="prow"><button class="btn ghost" id="commsBack">← Контакты</button></div></div>';
    win.document.getElementById('commsBack')?.addEventListener('click', () => showShipCommsPanel(win));
    return;
  }
  const profile = buildHailProfile(liveContact, save);
  panel.innerHTML = `<div class="pbox"><h2>📡 Канал связи</h2><div class="sub">${esc(profile.identity)} · ${profile.distance} м · репутация ${profile.reputation >= 0 ? '+' : ''}${profile.reputation}</div><div class="evTxt" style="margin-top:10px"><b>Входящий ответ:</b><br>${esc(profile.opening)}</div><div class="prow"><button class="btn" id="commsIdentify">Идентификация</button><button class="btn" id="commsStatus">Обстановка</button></div><div class="evTxt" id="commsReply">Выберите запрос.</div><div class="prow"><button class="btn ghost" id="commsBack">← Контакты</button><button class="btn ghost" id="commsClose">Закрыть</button></div></div>`;
  win.document.getElementById('commsIdentify')?.addEventListener('click', () => {
    const reply = win.document.getElementById('commsReply');
    if (reply) reply.textContent = profile.identity;
  });
  win.document.getElementById('commsStatus')?.addEventListener('click', () => {
    const reply = win.document.getElementById('commsReply');
    if (reply) reply.textContent = profile.status;
  });
  win.document.getElementById('commsBack')?.addEventListener('click', () => showShipCommsPanel(win));
  win.document.getElementById('commsClose')?.addEventListener('click', () => closePanel(win));
  try { win.dispatchEvent(new CustomEvent('kr3:ship-hail', { detail: profile })); } catch {}
}

export function showShipCommsPanel(win = globalThis?.window) {
  const doc = win?.document;
  const panel = doc?.getElementById?.('panel');
  if (!panel) return false;
  refreshLiveSave(win);
  const save = readSave(win.localStorage);
  const contacts = listRadioContacts(save);
  const rows = contacts.length
    ? contacts.map(c => `<button class="btn" data-comms-uid="${esc(c.uid)}">${esc(c.factionName)} · ${esc(c.roleName)} · ${c.distance} м</button>`).join('')
    : '<div class="evTxt">В пределах радара нет отвечающих кораблей.</div>';
  panel.innerHTML = `<div class="pbox"><h2>📡 Связь с пилотами</h2><div class="sub">Корабли в пределах текущего радара. Ответ зависит от роли, фракции и репутации.</div><div class="prow" style="align-items:stretch;flex-direction:column">${rows}</div><div class="prow"><button class="btn ghost" id="commsClose">Закрыть</button></div></div>`;
  panel.classList.remove('hidden');
  doc.querySelectorAll?.('[data-comms-uid]').forEach(button => {
    button.addEventListener('click', () => {
      const contact = contacts.find(c => String(c.uid) === String(button.dataset.commsUid));
      if (contact) renderConversation(win, contact);
    });
  });
  doc.getElementById('commsClose')?.addEventListener('click', () => closePanel(win));
  return true;
}

export function installShipCommsButton(win = globalThis?.window) {
  const doc = win?.document;
  const turnButtons = doc?.getElementById?.('tbtns');
  if (!turnButtons || doc.getElementById('bComms')) return false;
  const button = doc.createElement('button');
  button.id = 'bComms';
  button.type = 'button';
  button.textContent = '📡 СВЯЗЬ';
  button.title = 'Вызвать на связь корабли в пределах радара';
  button.addEventListener('pointerdown', event => {
    event.stopPropagation();
    showShipCommsPanel(win);
  });
  turnButtons.insertBefore(button, turnButtons.firstChild || null);
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installShipCommsButton(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
