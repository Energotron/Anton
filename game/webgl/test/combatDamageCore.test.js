import test from 'node:test';
import assert from 'node:assert/strict';

import { MISSILE_DAMAGE, applyPlayerHit, consumeMissileAmmo } from '../src/combatDamageCore.js';

test('missile ammo is consumed when a missile is fired even if the shot later misses', () => {
  assert.equal(consumeMissileAmmo(8, true), 7);
});

test('laser fire does not consume missile ammo', () => {
  assert.equal(consumeMissileAmmo(8, false), 8);
});

test('missile ammo consumption is bounded and sanitizes malformed saves', () => {
  assert.equal(consumeMissileAmmo(0, true), 0);
  assert.equal(consumeMissileAmmo(-4, true), 0);
  assert.equal(consumeMissileAmmo('bad', true), 0);
});

test('laser damage reduces hull without destroying a healthy target', () => {
  assert.deepEqual(applyPlayerHit({ hull: 35, weaponDamage: 5 }), {
    previousHull: 35,
    damage: 5,
    hull: 30,
    destroyed: false,
  });
});

test('a lethal hit clamps hull to zero and marks the target destroyed', () => {
  assert.deepEqual(applyPlayerHit({ hull: 8, weaponDamage: 14 }), {
    previousHull: 8,
    damage: 8,
    hull: 0,
    destroyed: true,
  });
});

test('missiles retain a meaningful minimum damage', () => {
  const result = applyPlayerHit({ hull: 80, weaponDamage: 5, missile: true });
  assert.equal(result.damage, MISSILE_DAMAGE);
  assert.equal(result.hull, 30);
  assert.equal(result.destroyed, false);
});

test('stronger weapons are not weakened when firing missiles', () => {
  assert.equal(applyPlayerHit({ hull: 100, weaponDamage: 58, missile: true }).hull, 42);
});

test('invalid or negative damage cannot heal or destroy a target', () => {
  assert.deepEqual(applyPlayerHit({ hull: 35, weaponDamage: -10 }), {
    previousHull: 35,
    damage: 0,
    hull: 35,
    destroyed: false,
  });
});
