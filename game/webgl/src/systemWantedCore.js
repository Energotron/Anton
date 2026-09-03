export const SYSTEM_WANTED_TURNS = 5;
export const SYSTEM_WANTED_REPEAT_TURNS = 2;
export const SYSTEM_WANTED_MAX_TURNS = 15;

function integer(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

export function normalizeSystemWanted(wantedBySystem = {}) {
  if (!wantedBySystem || typeof wantedBySystem !== 'object' || Array.isArray(wantedBySystem)) return {};
  const normalized = {};
  for (const [systemId, expiry] of Object.entries(wantedBySystem)) {
    const id = integer(systemId);
    const expiresTurn = integer(expiry);
    if (id === null || id < 0 || expiresTurn === null || expiresTurn < 1) continue;
    normalized[String(id)] = expiresTurn;
  }
  return normalized;
}

export function systemWantedStatus(wantedBySystem = {}, systemId, currentTurn) {
  const id = integer(systemId);
  const turn = integer(currentTurn);
  if (id === null || id < 0 || turn === null || turn < 1) {
    return { active: false, remainingTurns: 0, expiresTurn: null };
  }
  const expiresTurn = integer(normalizeSystemWanted(wantedBySystem)[String(id)]);
  const remainingTurns = expiresTurn === null ? 0 : Math.max(0, expiresTurn - turn);
  return { active: remainingTurns > 0, remainingTurns, expiresTurn };
}

export function wantedPortAccess(wantedBySystem = {}, systemId, currentTurn) {
  const wanted = systemWantedStatus(wantedBySystem, systemId, currentTurn);
  return {
    allowed: !wanted.active,
    reason: wanted.active ? 'wanted' : null,
    remainingTurns: wanted.remainingTurns,
  };
}

export function recordSystemWanted(wantedBySystem = {}, systemId, currentTurn, duration = SYSTEM_WANTED_TURNS) {
  const normalized = normalizeSystemWanted(wantedBySystem);
  const id = integer(systemId);
  const turn = integer(currentTurn);
  const turns = integer(duration);
  if (id === null || id < 0 || turn === null || turn < 1 || turns === null || turns < 1) return normalized;

  const key = String(id);
  const existingExpiry = normalized[key] || 0;
  const baseExpiry = turn + turns;
  if (existingExpiry > turn) {
    const escalatedExpiry = Math.min(
      Math.max(existingExpiry, baseExpiry) + SYSTEM_WANTED_REPEAT_TURNS,
      turn + SYSTEM_WANTED_MAX_TURNS,
    );
    normalized[key] = Math.max(existingExpiry, escalatedExpiry);
  } else {
    normalized[key] = Math.max(existingExpiry, baseExpiry);
  }
  return normalized;
}
