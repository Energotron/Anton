export const DISTRESS_CALL_RANGE = 1200;

function finiteCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stableUid(ship = {}) {
  return String(ship.uid ?? '');
}

export function findDistressResponder(source = {}, ships = [], maxRange = DISTRESS_CALL_RANGE) {
  if (source.type !== 'trader' || !source.playerAggressed || !Array.isArray(ships)) return null;

  const sx = finiteCoordinate(source.x);
  const sy = finiteCoordinate(source.y);
  const range = Number(maxRange);
  if (sx === null || sy === null || !Number.isFinite(range) || range < 0) return null;

  const candidates = ships
    .filter(ship => ship && ship !== source && ship.type === 'patrol' && ship.fac !== 'pir')
    .filter(ship => ship.hull == null || (Number.isFinite(Number(ship.hull)) && Number(ship.hull) > 0))
    .map(ship => {
      const x = finiteCoordinate(ship.x);
      const y = finiteCoordinate(ship.y);
      return x === null || y === null ? null : { ship, distance: Math.hypot(x - sx, y - sy) };
    })
    .filter(candidate => candidate && candidate.distance <= range)
    .sort((a, b) => a.distance - b.distance || stableUid(a.ship).localeCompare(stableUid(b.ship)));

  return candidates[0]?.ship ?? null;
}
