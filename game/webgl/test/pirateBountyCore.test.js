import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPirateBounty, calculatePirateBounty, normalizeSystemDanger } from '../src/pirateBountyCore.js';

test('pays only for pirate faction ships', () => {
  assert.equal(calculatePirateBounty({ fac: 'pir', type: 'pirate' }, 1), 90);
  assert.equal(calculatePirateBounty({ fac: 'fed', type: 'patrol' }, 5), 0);
});

test('raiders pay more than ordinary pirates', () => {
  assert.equal(calculatePirateBounty({ fac: 'pir', type: 'raider' }, 1), 150);
  assert.ok(calculatePirateBounty({ fac: 'pir', type: 'raider' }, 3) > calculatePirateBounty({ fac: 'pir', type: 'pirate' }, 3));
});

test('danger bonus is bounded to canonical 1..5 range', () => {
  assert.equal(normalizeSystemDanger(-8), 1);
  assert.equal(normalizeSystemDanger(99), 5);
  assert.equal(calculatePirateBounty({ fac: 'pir', type: 'pirate' }, 5), 133);
});

test('applying bounty mutates the live player balance exactly once per call', () => {
  const player = { money: 8000 };
  const result = applyPirateBounty(player, { fac: 'pir', type: 'raider' }, 2);
  assert.deepEqual(result, { amount: 168, balance: 8168 });
  assert.equal(player.money, 8168);
});
