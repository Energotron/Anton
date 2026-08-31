export const PIRATE_BOUNTY_BASE = Object.freeze({
  pirate: 90,
  raider: 150
});

export function normalizeSystemDanger(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : 1;
}

export function calculatePirateBounty(ship, systemDanger = 1) {
  if (!ship || ship.fac !== 'pir') return 0;
  const base = PIRATE_BOUNTY_BASE[ship.type] || PIRATE_BOUNTY_BASE.pirate;
  const danger = normalizeSystemDanger(systemDanger);
  return Math.floor(base * (1 + (danger - 1) * 0.12));
}

export function applyPirateBounty(player, ship, systemDanger = 1) {
  const amount = calculatePirateBounty(ship, systemDanger);
  if (!player || amount <= 0) return { amount: 0, balance: Number(player?.money) || 0 };
  const balance = Math.max(0, Number(player.money) || 0) + amount;
  player.money = balance;
  return { amount, balance };
}
