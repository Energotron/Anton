import { systemWantedStatus } from './systemWantedCore.js';

export const WANTED_FINE_PER_TURN = 400;

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

export function wantedFineAvailability(save = null) {
  if (!save || typeof save !== 'object') {
    return { available: false, reason: 'invalid_save', fine: 0, remainingTurns: 0 };
  }
  const systemId = integer(save.G?.sysId, -1);
  const turn = integer(save.G?.turn, -1);
  const wanted = systemWantedStatus(save.G?.systemWantedUntil, systemId, turn);
  if (!wanted.active) {
    return { available: false, reason: 'no_wanted', fine: 0, remainingTurns: 0, systemId };
  }
  const fine = wanted.remainingTurns * WANTED_FINE_PER_TURN;
  const money = Math.max(0, integer(save.P?.money));
  return {
    available: money >= fine,
    reason: money >= fine ? 'ok' : 'funds',
    fine,
    remainingTurns: wanted.remainingTurns,
    systemId,
  };
}

function pardonPatrol(ship) {
  if (!ship || ship.type !== 'patrol' || ship.fac === 'pir') return ship;
  return { ...ship, playerAggressed: false };
}

export function payWantedFine(save = null) {
  const availability = wantedFineAvailability(save);
  if (!availability.available) return { changed: false, ...availability, save };

  const key = String(availability.systemId);
  const next = {
    ...save,
    P: { ...(save.P || {}), money: Math.max(0, integer(save.P?.money) - availability.fine) },
    G: {
      ...(save.G || {}),
      systemWantedUntil: { ...(save.G?.systemWantedUntil || {}) },
    },
    demoShips: Array.isArray(save.demoShips) ? save.demoShips.map(pardonPatrol) : [],
    systemShips: { ...(save.systemShips || {}) },
  };
  delete next.G.systemWantedUntil[key];
  if (Array.isArray(next.systemShips[key])) {
    next.systemShips[key] = next.systemShips[key].map(pardonPatrol);
  }
  return { ...availability, changed: true, reason: 'paid', save: next };
}
