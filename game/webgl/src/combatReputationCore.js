import diplomacyRulesData from '../../../data/diplomacy_rules.json' with { type: 'json' };
import { applyDiplomacyAction, normalizeDiplomacyRules } from './diplomacyRulesCore.js';

const DIPLOMACY_RULES = normalizeDiplomacyRules(diplomacyRulesData);
export const ATTACK_REPUTATION_DELTA = DIPLOMACY_RULES.actions.attack;

export function applyAttackReputation({
  reputation = {},
  faction = null,
  alreadyAggressed = false,
} = {}) {
  const nextReputation = { ...reputation };
  if (!faction) return { applied: false, reason: 'no_faction', delta: 0, reputation: nextReputation };
  if (faction === 'pir') return { applied: false, reason: 'hostile_target', faction, delta: 0, reputation: nextReputation };
  if (alreadyAggressed) return { applied: false, reason: 'already_recorded', faction, delta: 0, reputation: nextReputation };

  const outcome = applyDiplomacyAction(Number(nextReputation[faction] || 0), 'attack', DIPLOMACY_RULES);
  nextReputation[faction] = outcome.result;
  return {
    applied: true,
    reason: 'attack',
    faction,
    delta: outcome.result - outcome.previous,
    reputation: nextReputation,
  };
}
