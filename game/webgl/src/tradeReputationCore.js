import { clampDiplomacyAttitude } from './diplomacyRulesCore.js';

export const TRADE_REPUTATION_DELTA = 1;

function normalizedTurn(value) {
  const turn = Number(value);
  return Number.isFinite(turn) ? Math.max(0, Math.trunc(turn)) : 0;
}

export function applyTradeReputation({
  reputation = {},
  faction = null,
  turn = 0,
  rewardedTurns = {},
} = {}) {
  const nextReputation = { ...reputation };
  const nextRewardedTurns = { ...rewardedTurns };
  if (!faction) {
    return { rewarded: false, reason: 'no_faction', delta: 0, reputation: nextReputation, rewardedTurns: nextRewardedTurns };
  }

  const currentTurn = normalizedTurn(turn);
  if (normalizedTurn(nextRewardedTurns[faction]) === currentTurn && Object.hasOwn(nextRewardedTurns, faction)) {
    return { rewarded: false, reason: 'already_rewarded', delta: 0, faction, reputation: nextReputation, rewardedTurns: nextRewardedTurns };
  }

  const previous = clampDiplomacyAttitude(Number(nextReputation[faction] || 0));
  const result = clampDiplomacyAttitude(previous + TRADE_REPUTATION_DELTA);
  nextReputation[faction] = result;
  nextRewardedTurns[faction] = currentTurn;
  return {
    rewarded: true,
    reason: 'trade',
    faction,
    delta: result - previous,
    reputation: nextReputation,
    rewardedTurns: nextRewardedTurns,
  };
}
