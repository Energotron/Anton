import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySalvagePickup,
  buildSalvageDrop,
  cargoFree,
  cargoUsed,
  planSalvagePickup
} from '../src/salvageCore.js';

test('cargoUsed and cargoFree count cargo units against hold capacity', () => {
  const player = { cap: 10, cargo: { ore: 3, mach: 2 } };
  assert.equal(cargoUsed(player.cargo), 5);
  assert.equal(cargoFree(player), 5);
});

test('buildSalvageDrop only creates loot for pirate faction ships', () => {
  assert.equal(buildSalvageDrop({ uid: 1, fac: 'fed', type: 'trader' }, 0, 0), null);
  assert.deepEqual(
    buildSalvageDrop({ uid: 7, fac: 'pir', type: 'pirate' }, 0, 0),
    { goodId: 'ore', amount: 1, sourceUid: 7, sourceType: 'pirate' }
  );
  assert.deepEqual(
    buildSalvageDrop({ uid: 8, fac: 'pir', type: 'raider' }, 0, 0.999),
    { goodId: 'weap', amount: 4, sourceUid: 8, sourceType: 'raider' }
  );
});

test('applySalvagePickup transfers loot into cargo and consumes the drop', () => {
  const player = { cap: 8, cargo: { ore: 2 } };
  const loot = { goodId: 'mach', amount: 3 };
  const result = applySalvagePickup(player, loot);
  assert.deepEqual(result, { take: 3, remaining: 0, reason: 'ok' });
  assert.equal(player.cargo.mach, 3);
  assert.equal(loot.amount, 0);
});

test('pickup respects a full or partially full cargo hold', () => {
  const player = { cap: 5, cargo: { ore: 4 } };
  const loot = { goodId: 'weap', amount: 3 };
  assert.deepEqual(planSalvagePickup(player, loot), { take: 1, remaining: 2, reason: 'partial' });
  assert.deepEqual(applySalvagePickup(player, loot), { take: 1, remaining: 2, reason: 'partial' });
  assert.equal(player.cargo.weap, 1);
  assert.equal(loot.amount, 2);
  assert.deepEqual(planSalvagePickup(player, loot), { take: 0, remaining: 2, reason: 'full' });
});
