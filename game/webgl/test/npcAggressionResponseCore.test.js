import test from 'node:test';
import assert from 'node:assert/strict';

import { NPC_RETREAT_DISTANCE, npcAggressionResponse } from '../src/npcAggressionResponseCore.js';

test('untouched faction ships keep their normal route', () => {
  assert.deepEqual(npcAggressionResponse({ type: 'patrol', fac: 'fed' }, { x: 5, y: 8 }), {
    mode: 'route', overrideNavigation: false, canFire: false,
  });
});

test('attacked patrol pursues the player and may return fire', () => {
  assert.deepEqual(
    npcAggressionResponse({ type: 'patrol', fac: 'fed', playerAggressed: true, x: 100, y: 50 }, { x: -20, y: 30 }),
    { mode: 'retaliate', overrideNavigation: true, canFire: true, targetX: -20, targetY: 30 },
  );
});

test('attacked trader flees directly away from the player', () => {
  const result = npcAggressionResponse(
    { type: 'trader', fac: 'pel', playerAggressed: true, x: 100, y: 0 },
    { x: 0, y: 0 },
  );
  assert.equal(result.mode, 'flee');
  assert.equal(result.canFire, false);
  assert.equal(result.targetX, 100 + NPC_RETREAT_DISTANCE);
  assert.equal(result.targetY, 0);
});

test('co-located trader receives a finite deterministic escape target', () => {
  const result = npcAggressionResponse(
    { type: 'trader', fac: 'mal', playerAggressed: true, x: 40, y: 60 },
    { x: 40, y: 60 },
  );
  assert.equal(result.targetX, 40 + NPC_RETREAT_DISTANCE);
  assert.equal(result.targetY, 60);
  assert.equal(Number.isFinite(result.targetX), true);
});

test('pirates retain their existing hostile AI path', () => {
  assert.deepEqual(
    npcAggressionResponse({ type: 'pirate', fac: 'pir', playerAggressed: true }, { x: 1, y: 2 }),
    { mode: 'route', overrideNavigation: false, canFire: false },
  );
});
