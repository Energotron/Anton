export const SALVAGE_PICKUP_RADIUS = 72;

export const SALVAGE_GOODS = Object.freeze({
  ore: { id: 'ore', name: 'Руда', icon: '⛏️' },
  mach: { id: 'mach', name: 'Оборудование', icon: '⚙️' },
  weap: { id: 'weap', name: 'Оружие', icon: '🔫' }
});

const DROP_TABLE = Object.freeze({
  pirate: ['ore', 'mach', 'weap'],
  raider: ['weap', 'ore', 'mach']
});

export function cargoUsed(cargo = {}) {
  if (!cargo || typeof cargo !== 'object' || Array.isArray(cargo)) return 0;
  return Object.values(cargo).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

export function cargoFree(player = {}) {
  return Math.max(0, (Number(player.cap) || 0) - cargoUsed(player.cargo));
}

export function buildSalvageDrop(ship, roll = Math.random(), amountRoll = Math.random()) {
  if (!ship || ship.fac !== 'pir') return null;
  const table = DROP_TABLE[ship.type] || DROP_TABLE.pirate;
  const idx = Math.min(table.length - 1, Math.max(0, Math.floor(Math.max(0, Math.min(0.999999, roll)) * table.length)));
  const goodId = table[idx];
  const amount = 1 + Math.floor(Math.max(0, Math.min(0.999999, amountRoll)) * (ship.type === 'raider' ? 4 : 3));
  return {
    goodId,
    amount,
    sourceUid: ship.uid ?? null,
    sourceType: ship.type || 'pirate'
  };
}

export function getSalvageRadarContacts(player = {}, loot = []) {
  const px = Number(player.x);
  const py = Number(player.y);
  const radar = Math.max(0, Number(player.radar) || 0);
  if (!Number.isFinite(px) || !Number.isFinite(py) || radar <= 0 || !Array.isArray(loot)) return [];

  return loot
    .filter(item => item && Number(item.amount) > 0 && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)))
    .map(item => ({
      id: item.id ?? null,
      goodId: item.goodId,
      amount: Number(item.amount),
      x: Number(item.x),
      y: Number(item.y),
      distance: Math.hypot(Number(item.x) - px, Number(item.y) - py)
    }))
    .filter(item => item.distance <= radar)
    .sort((a, b) => a.distance - b.distance);
}

export function planSalvagePickup(player, loot) {
  if (!loot || !loot.goodId || !Number.isFinite(Number(loot.amount)) || Number(loot.amount) <= 0) {
    return { take: 0, remaining: 0, reason: 'invalid' };
  }
  const free = cargoFree(player);
  if (free <= 0) return { take: 0, remaining: Number(loot.amount), reason: 'full' };
  const take = Math.min(free, Number(loot.amount));
  return {
    take,
    remaining: Math.max(0, Number(loot.amount) - take),
    reason: take < Number(loot.amount) ? 'partial' : 'ok'
  };
}

export function applySalvagePickup(player, loot) {
  const plan = planSalvagePickup(player, loot);
  if (plan.take <= 0) return plan;
  if (!player.cargo || typeof player.cargo !== 'object' || Array.isArray(player.cargo)) player.cargo = {};
  player.cargo[loot.goodId] = (Number(player.cargo[loot.goodId]) || 0) + plan.take;
  loot.amount = plan.remaining;
  return plan;
}
