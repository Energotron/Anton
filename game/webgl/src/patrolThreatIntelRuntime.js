function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bearingLabel(dx, dy) {
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return 'рядом';
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const labels = ['В', 'СВ', 'С', 'СЗ', 'З', 'ЮЗ', 'Ю', 'ЮВ'];
  return labels[(octant + 8) % 8];
}

export function buildPatrolThreatIntel(save = null) {
  if (!save || typeof save !== 'object') return null;
  const player = save.P || {};
  const px = finite(player.x);
  const py = finite(player.y);
  const radar = Math.max(0, finite(player.radar));
  const ships = Array.isArray(save.demoShips) ? save.demoShips : [];

  const contacts = ships
    .filter(ship => ship && finite(ship.hull, 0) > 0)
    .filter(ship => ship.fac === 'pir' || ship.type === 'pirate' || ship.type === 'raider')
    .map(ship => {
      const x = finite(ship.x);
      const y = finite(ship.y);
      const dx = x - px;
      const dy = y - py;
      const distance = Math.round(Math.hypot(dx, dy));
      return {
        uid: ship.uid ?? null,
        type: ship.type === 'raider' ? 'raider' : 'pirate',
        distance,
        bearing: bearingLabel(dx, dy),
        inPlayerRadar: radar > 0 && distance <= radar,
      };
    })
    .sort((a, b) => a.distance - b.distance || finite(a.uid) - finite(b.uid));

  const raiders = contacts.filter(contact => contact.type === 'raider').length;
  const sensorConfirmed = contacts.filter(contact => contact.inPlayerRadar).length;
  const patrolOnly = contacts.length - sensorConfirmed;
  const nearest = contacts[0] || null;
  const nearestSource = nearest
    ? (nearest.inPlayerRadar ? 'подтверждено вашим радаром' : 'вне вашего радара, по данным патруля')
    : '';
  const text = nearest
    ? `Тактическая сводка патруля: пиратских контактов ${contacts.length}, рейдеров ${raiders}. Ваш радар подтверждает ${sensorConfirmed}, ещё ${patrolOnly} переданы патрулём. Ближайшая угроза — ${nearest.type === 'raider' ? 'рейдер' : 'пират'}, ${nearest.distance} м, направление ${nearest.bearing}; ${nearestSource}.`
    : 'Тактическая сводка патруля: активных пиратских контактов в системе не обнаружено.';

  return { contacts, count: contacts.length, raiders, sensorConfirmed, patrolOnly, nearest, text };
}

function readSave(storage) {
  try {
    const raw = storage?.getItem?.('kr3_save_slot0');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function installPatrolThreatIntelRuntime(win = globalThis?.window) {
  if (!win?.document || win.__kr3PatrolThreatIntelInstalled) return false;
  win.__kr3PatrolThreatIntelInstalled = true;
  win.addEventListener('kr3:ship-hail', event => {
    if (event?.detail?.type !== 'patrol') return;
    const doc = win.document;
    if (doc.getElementById('commsThreatIntel')) return;
    const status = doc.getElementById('commsStatus');
    const reply = doc.getElementById('commsReply');
    if (!status || !reply) return;
    const button = doc.createElement('button');
    button.className = 'btn';
    button.id = 'commsThreatIntel';
    button.textContent = '🛡️ Пиратская сводка';
    button.addEventListener('click', () => {
      const intel = buildPatrolThreatIntel(readSave(win.localStorage));
      reply.textContent = intel?.text || 'Патруль не может сформировать тактическую сводку.';
    });
    status.parentElement?.appendChild(button);
  });
  return true;
}

if (typeof window !== 'undefined') installPatrolThreatIntelRuntime(window);
