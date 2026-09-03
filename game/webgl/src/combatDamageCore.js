export const MISSILE_DAMAGE = 50;

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

export function consumeMissileAmmo(ammo = 0, missileFired = false) {
  const available = Math.trunc(finiteNonNegative(ammo));
  return missileFired && available > 0 ? available - 1 : available;
}

export function applyPlayerHit({ hull = 0, weaponDamage = 0, missile = false } = {}) {
  const previousHull = finiteNonNegative(hull);
  const configuredDamage = finiteNonNegative(weaponDamage);
  const damage = missile ? Math.max(configuredDamage, MISSILE_DAMAGE) : configuredDamage;
  const nextHull = Math.max(0, previousHull - damage);

  return {
    previousHull,
    damage: Math.min(previousHull, damage),
    hull: nextHull,
    destroyed: previousHull > 0 && nextHull === 0,
  };
}
