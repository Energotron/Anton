// Browser-safe mirror of data/diplomacy_rules.json.
// Keep this plain JavaScript so older Android/WebView engines do not need
// JSON import attributes during the initial KR3 module graph evaluation.
export const DIPLOMACY_RULES_DATA = Object.freeze({
  version: 1,
  attitude_range: Object.freeze([-100, 100]),
  actions: Object.freeze({
    trade: 5,
    aid: 10,
    threat: -15,
    attack: -40,
  }),
  clamp_result: true,
  deterministic: true,
});
