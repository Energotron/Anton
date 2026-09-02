import test from 'node:test';
import assert from 'node:assert/strict';
import { TRADE_REPUTATION_DELTA, applyTradeReputation } from '../src/tradeReputationCore.js';

test('first successful faction trade in a turn earns reputation', () => {
  const result = applyTradeReputation({ reputation: { fed: 10 }, faction: 'fed', turn: 7 });
  assert.equal(result.rewarded, true);
  assert.equal(result.delta, TRADE_REPUTATION_DELTA);
  assert.deepEqual(result.reputation, { fed: 11 });
  assert.deepEqual(result.rewardedTurns, { fed: 7 });
});

test('repeat trades with the same faction in one turn cannot farm reputation', () => {
  const result = applyTradeReputation({
    reputation: { fed: 11 },
    faction: 'fed',
    turn: 7,
    rewardedTurns: { fed: 7 },
  });
  assert.equal(result.rewarded, false);
  assert.equal(result.reason, 'already_rewarded');
  assert.equal(result.reputation.fed, 11);
});

test('another turn allows one new faction trade reward', () => {
  const result = applyTradeReputation({
    reputation: { fed: 11 },
    faction: 'fed',
    turn: 8,
    rewardedTurns: { fed: 7 },
  });
  assert.equal(result.rewarded, true);
  assert.equal(result.reputation.fed, 12);
  assert.equal(result.rewardedTurns.fed, 8);
});

test('trade rewards are tracked independently per faction', () => {
  const result = applyTradeReputation({
    reputation: { fed: 11, pel: 5 },
    faction: 'pel',
    turn: 7,
    rewardedTurns: { fed: 7 },
  });
  assert.equal(result.reputation.pel, 6);
  assert.deepEqual(result.rewardedTurns, { fed: 7, pel: 7 });
});

test('trade reputation obeys diplomacy bounds and tolerates missing faction', () => {
  const capped = applyTradeReputation({ reputation: { gaal: 100 }, faction: 'gaal', turn: 2 });
  assert.equal(capped.reputation.gaal, 100);
  assert.equal(capped.delta, 0);
  assert.equal(applyTradeReputation({ reputation: { fed: 4 }, turn: 2 }).reason, 'no_faction');
});
