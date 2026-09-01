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

function reportBearing(dx, dy, inPlayerRadar) {
  const exact = bearingLabel(dx, dy);
  if (inPlayerRadar || exact === 'рядом') return { bearing: exact, bearingAccuracy: 'exact' };
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { bearing: dx >= 0 ? 'восточный сектор' : 'западный сектор', bearingAccuracy: 'sector' };
  }
  return { bearing: dy >= 0 ? 'северный сектор' : 'южный сектор', bearingAccuracy: 'sector' };
}

function reportDistance(distance, inPlayerRadar) {
  if (inPlayerRadar) return distance;
  return Math.max(100, Math.round(distance / 100) * 100);
}

function reportThreatType(type, inPlayerRadar) {
  if (!inPlayerRadar) return { reportedType: 'pirate_contact', typeAccuracy: 'generic' };
  return { reportedType: type, typeAccuracy: 'exact' };
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
      const inPlayerRadar = radar > 0 && distance <= radar;
      const type = ship.type === 'raider' ? 'raider' : 'pirate';
      const bearingReport = reportBearing(dx, dy, inPlayerRadar);
      const typeReport = reportThreatType(type, inPlayerRadar);
      return {
        uid: ship.uid ?? null,
        type,
        reportedType: typeReport.reportedType,
        typeAccuracy: typeReport.typeAccuracy,
        distance,
        reportedDistance: reportDistance(distance, inPlayerRadar),
        distanceAccuracy: inPlayerRadar ? 'exact' : 'estimated',
        bearing: bearingReport.bearing,
        bearingAccuracy: bearingReport.bearingAccuracy,
        inPlayerRadar,
      };
    })
    .sort((a, b) => a.distance - b.distance || finite(a.uid) - finite(b.uid));

  const confirmedRaiders = contacts.filter(contact => contact.inPlayerRadar && contact.type === 'raider').length;
  const sensorConfirmed = contacts.filter(contact => contact.inPlayerRadar).length;
  const patrolOnly = contacts.length - sensorConfirmed;
  const nearest = contacts[0] || null;
  const nearestSource = nearest
    ? (nearest.inPlayerRadar ? 'подтверждено вашим радаром' : 'вне вашего радара, по данным патруля')
    : '';
  const nearestDistance = nearest
    ? `${nearest.distanceAccuracy === 'estimated' ? 'примерно ' : ''}${nearest.reportedDistance} м`
    : '';
  const nearestLabel = nearest
    ? (nearest.reportedType === 'raider' ? 'рейдер' : nearest.reportedType === 'pirate' ? 'пират' : 'пиратский контакт')
    : '';
  const classification = sensorConfirmed
    ? ` Среди подтверждённых целей рейдеров ${confirmedRaiders}.`
    : '';
  const text = nearest
    ? `Тактическая сводка патруля: пиратских контактов ${contacts.length}. Ваш радар подтверждает ${sensorConfirmed}, ещё ${patrolOnly} переданы патрулём.${classification} Ближайшая угроза — ${nearestLabel}, ${nearestDistance}, направление ${nearest.bearing}; ${nearestSource}.`
    : 'Тактическая сводка патруля: активных пиратских контактов в системе не обнаружено.';

  return { contacts, count: contacts.length, raiders: confirmedRaiders, confirmedRaiders, sensorConfirmed, patrolOnly, nearest, text };
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
