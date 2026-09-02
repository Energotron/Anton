const FALLBACK_RANGE = Object.freeze([-100, 100]);

export const DIPLOMACY_ATTITUDE_RANGE = FALLBACK_RANGE;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeDiplomacyRules(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('diplomacy rules must be an object');
  }

  const rawRange = Array.isArray(data.attitude_range) ? data.attitude_range : FALLBACK_RANGE;
  const min = finiteNumber(rawRange[0]);
  const max = finiteNumber(rawRange[1]);
  if (min === null || max === null || min >= max) {
    throw new RangeError('attitude_range must contain an ordered finite pair');
  }

  if (!data.actions || typeof data.actions !== 'object' || Array.isArray(data.actions)) {
    throw new TypeError('diplomacy rules must define actions');
  }

  const actions = {};
  for (const [action, rawDelta] of Object.entries(data.actions)) {
    const delta = finiteNumber(rawDelta);
    if (!action || delta === null) throw new TypeError(`invalid diplomacy action: ${action || '<empty>'}`);
    actions[action] = delta;
  }
  if (!Object.keys(actions).length) throw new TypeError('diplomacy rules must define at least one action');

  return Object.freeze({
    version: Math.max(1, Math.trunc(finiteNumber(data.version) ?? 1)),
    attitudeRange: Object.freeze([min, max]),
    actions: Object.freeze(actions),
    clampResult: data.clamp_result !== false,
    deterministic: data.deterministic !== false,
  });
}

export function parseDiplomacyRules(json) {
  if (typeof json !== 'string') throw new TypeError('diplomacy rules JSON must be a string');
  return normalizeDiplomacyRules(JSON.parse(json));
}

export function clampDiplomacyAttitude(attitude, range = FALLBACK_RANGE) {
  const current = finiteNumber(attitude);
  const min = finiteNumber(range?.[0]);
  const max = finiteNumber(range?.[1]);
  if (current === null) throw new TypeError('attitude must be finite');
  if (min === null || max === null || min >= max) {
    throw new RangeError('attitude range must contain an ordered finite pair');
  }
  return Math.min(max, Math.max(min, current));
}

export function applyDiplomacyAction(attitude, action, rules) {
  const normalized = rules?.attitudeRange && rules?.actions
    ? rules
    : normalizeDiplomacyRules(rules);
  const current = finiteNumber(attitude);
  if (current === null) throw new TypeError('attitude must be finite');
  if (!Object.hasOwn(normalized.actions, action)) throw new RangeError(`unknown diplomacy action: ${action}`);

  const delta = normalized.actions[action];
  const rawResult = current + delta;
  const [min, max] = normalized.attitudeRange;
  const result = normalized.clampResult
    ? clampDiplomacyAttitude(rawResult, [min, max])
    : rawResult;

  return Object.freeze({ action, previous: current, delta, result });
}
