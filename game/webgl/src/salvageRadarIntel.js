export const SALVAGE_GOOD_NAMES = Object.freeze({
  ore: 'Руда', mach: 'Оборудование', weap: 'Оружие'
});

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bearingLabel(dx, dy) {
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return 'рядом';
  const a = Math.atan2(dy, dx);
  const octant = Math.round(a / (Math.PI / 4));
  const labels = ['В', 'СВ', 'С', 'СЗ', 'З', 'ЮЗ', 'Ю', 'ЮВ'];
  return labels[(octant + 8) % 8];
}

export function listSalvageRadarContacts(save = null) {
  if (!save || typeof save !== 'object') return [];
  const player = save.P || {};
  const systemId = Math.trunc(finite(save?.G?.sysId, -1));
  const radar = Math.max(0, finite(player.radar));
  if (systemId < 0 || radar <= 0) return [];
  const systems = save?.salvagePersistence?.systems;
  const records = systems && typeof systems === 'object' ? systems[String(systemId)] : null;
  if (!Array.isArray(records)) return [];

  return records
    .map(record => {
      const x = finite(record?.x, NaN);
      const y = finite(record?.y, NaN);
      const amount = Math.floor(finite(record?.amount, 0));
      const goodId = String(record?.goodId || '');
      if (!Number.isFinite(x) || !Number.isFinite(y) || amount <= 0 || !SALVAGE_GOOD_NAMES[goodId]) return null;
      const dx = x - finite(player.x);
      const dy = y - finite(player.y);
      const distance = Math.round(Math.hypot(dx, dy));
      return {
        id: record?.id == null ? null : String(record.id),
        goodId,
        goodName: SALVAGE_GOOD_NAMES[goodId],
        amount,
        x,
        y,
        distance,
        bearing: bearingLabel(dx, dy),
        inRadar: distance <= radar,
        sourceType: record?.sourceType == null ? null : String(record.sourceType)
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.inRadar) - Number(a.inRadar) || a.distance - b.distance || a.goodId.localeCompare(b.goodId));
}

export function salvageContactToMinimapPoint(save = null, contact = null) {
  const player = save?.P;
  const x = finite(contact?.x, NaN);
  const y = finite(contact?.y, NaN);
  const px = finite(player?.x, NaN);
  const py = finite(player?.y, NaN);
  if (![x, y, px, py].every(Number.isFinite)) return null;
  const radar = Math.max(700, finite(player?.radar, 900) || 900);
  const scale = 120 / radar;
  const point = { x: 132 + (x - px) * scale, y: 132 + (y - py) * scale };
  return Math.hypot(point.x - 132, point.y - 132) <= 124 ? point : null;
}

export function buildSalvageRadarSummary(save = null) {
  const contacts = listSalvageRadarContacts(save);
  const visible = contacts.filter(c => c.inRadar);
  const hidden = contacts.length - visible.length;
  return {
    contacts,
    visible,
    hidden,
    nearest: visible[0] || null,
    totalAmount: visible.reduce((sum, c) => sum + c.amount, 0)
  };
}
