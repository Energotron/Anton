export const NPC_RETREAT_DISTANCE = 900;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function npcAggressionResponse(ship = {}, player = {}, context = {}) {
  const wantedPatrol = ship.type === 'patrol' && context.systemWanted === true;
  if ((!ship.playerAggressed && !wantedPatrol) || ship.fac === 'pir') {
    return { mode: 'route', overrideNavigation: false, canFire: false };
  }

  const sx = finite(ship.x);
  const sy = finite(ship.y);
  const px = finite(player.x);
  const py = finite(player.y);

  if (ship.type === 'patrol') {
    return {
      mode: 'retaliate',
      overrideNavigation: true,
      canFire: true,
      targetX: px,
      targetY: py,
    };
  }

  if (ship.type === 'trader') {
    let dx = sx - px;
    let dy = sy - py;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) { dx = 1; dy = 0; }
    const scale = NPC_RETREAT_DISTANCE / (Math.hypot(dx, dy) || 1);
    return {
      mode: 'flee',
      overrideNavigation: true,
      canFire: false,
      targetX: sx + dx * scale,
      targetY: sy + dy * scale,
    };
  }

  return { mode: 'route', overrideNavigation: false, canFire: false };
}
