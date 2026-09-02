import test from 'node:test';
import assert from 'node:assert/strict';

import { ATTACK_REPUTATION_DELTA, applyAttackReputation } from '../src/combatReputationCore.js';

test('first successful attack on a faction ship applies canonical aggression penalty', () => {
  const result = applyAttackReputation({ reputation: { fed: 15 }, faction: 'fed' });
  assert.equal(ATTACK_REPUTATION_DELTA, -40);
  assert.equal(result.applied, true);
  assert.equal(result.delta, -40);
  assert.deepEqual(result.reputation, { fed: -25 });
});

test('repeat hits on the same recorded victim do not stack aggression penalties', () => {
  const result = applyAttackReputation({ reputation: { fed: -25 }, faction: 'fed', alreadyAggressed: true });
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'already_recorded');
  assert.deepEqual(result.reputation, { fed: -25 });
});

test('pirate combat does not penalize faction reputation', () => {
  const result = applyAttackReputation({ reputation: { pir: -40 }, faction: 'pir' });
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'hostile_target');
  assert.deepEqual(result.reputation, { pir: -40 });
});

test('aggression respects diplomacy lower bound and reports actual delta', () => {
  const result = applyAttackReputation({ reputation: { mal: -85 }, faction: 'mal' });
  assert.equal(result.reputation.mal, -100);
  assert.equal(result.delta, -15);
});

test('missing faction leaves reputation unchanged without mutating input', () => {
  const reputation = { fed: 3 };
  const result = applyAttackReputation({ reputation });
  assert.equal(result.applied, false);
  assert.deepEqual(result.reputation, reputation);
  assert.notEqual(result.reputation, reputation);
});
