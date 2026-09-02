import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySalvagePickup,
  buildSalvageDrop,
  cargoFree,
  cargoUsed,
  getSalvageRadarContacts,
  planSalvagePickup
} from '../src/salvageCore.js';

test('cargoUsed and cargoFree count cargo units against hold capacity', () => {
  const player = { cap: 10, cargo: { ore: 3, mach: 2 } };
  assert.equal(cargoUsed(player.cargo), 5);
  assert.equal(cargoFree(player), 5);
});

test('cargo helpers recover from missing or malformed legacy cargo state', () => {
  assert.equal(cargoUsed(null), 0);
  assert.equal(cargoUsed('broken'), 0);
  assert.equal(cargoUsed([]), 0);

  const player = { cap: 5, cargo: null };
  const loot = { goodId: 'ore', amount: 2 };
  assert.equal(cargoFree(player), 5);
  assert.deepEqual(applySalvagePickup(player, loot), { take: 2, remaining: 0, reason: 'ok' });
  assert.deepEqual(player.cargo, { ore: 2 });
});

test('salvage pickup normalizes array cargo so hold capacity remains enforceable', () => {
  const player = { cap: 2, cargo: [] };
  const first = { goodId: 'ore', amount: 2 };
  assert.deepEqual(applySalvagePickup(player, first), { take: 2, remaining: 0, reason: 'ok' });
  assert.deepEqual(player.cargo, { ore: 2 });
  assert.equal(cargoUsed(player.cargo), 2);

  const second = { goodId: 'mach', amount: 1 };
  assert.deepEqual(planSalvagePickup(player, second), { take: 0, remaining: 1, reason: 'full' });
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

test('salvage radar contacts include only live drops inside scanner range and sort nearest first', () => {
  const player = { x: 100, y: 50, radar: 300 };
  const contacts = getSalvageRadarContacts(player, [
    { id: 'far', goodId: 'ore', amount: 2, x: 500, y: 50 },
    { id: 'near', goodId: 'mach', amount: 1, x: 130, y: 90 },
    { id: 'mid', goodId: 'weap', amount: 3, x: 250, y: 50 },
    { id: 'empty', goodId: 'ore', amount: 0, x: 110, y: 50 }
  ]);
  assert.deepEqual(contacts.map(item => item.id), ['near', 'mid']);
  assert.equal(Math.round(contacts[0].distance), 50);
  assert.equal(contacts[1].amount, 3);
});

test('salvage radar contacts safely reject invalid player/radar state', () => {
  assert.deepEqual(getSalvageRadarContacts({ x: 0, y: 0, radar: 0 }, [{ amount: 1, x: 1, y: 1 }]), []);
  assert.deepEqual(getSalvageRadarContacts({ x: 'bad', y: 0, radar: 500 }, [{ amount: 1, x: 1, y: 1 }]), []);
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
