import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from '../js/data.js';

test('gaalian phase resonator extends weapon progression without shifting legacy saves', () => {
  assert.equal(WEAPONS[5].n, 'Фазер «Класс-Х»');
  const resonator = WEAPONS[6];
  assert.equal(resonator.n, 'Гаальский фазовый резонатор');
  assert.ok(resonator.p > WEAPONS[5].p);
  assert.ok(resonator.dmg > WEAPONS[5].dmg);
  assert.ok(resonator.range > WEAPONS[5].range);
});
