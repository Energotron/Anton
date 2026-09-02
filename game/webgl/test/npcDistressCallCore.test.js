import test from 'node:test';
import assert from 'node:assert/strict';

import { DISTRESS_CALL_RANGE, findDistressResponder } from '../src/npcDistressCallCore.js';

test('attacked trader calls the nearest living patrol', () => {
  const trader = { uid: 1, type: 'trader', fac: 'pel', playerAggressed: true, x: 0, y: 0 };
  const far = { uid: 2, type: 'patrol', fac: 'fed', x: 500, y: 0, hull: 55 };
  const near = { uid: 3, type: 'patrol', fac: 'mal', x: 100, y: 0, hull: 55 };

  assert.equal(findDistressResponder(trader, [far, near]), near);
});

test('distress call ignores pirates, destroyed patrols, and ships outside range', () => {
  const trader = { uid: 1, type: 'trader', playerAggressed: true, x: 0, y: 0 };
  const ships = [
    { uid: 2, type: 'patrol', fac: 'pir', x: 10, y: 0, hull: 55 },
    { uid: 3, type: 'patrol', fac: 'fed', x: 20, y: 0, hull: 0 },
    { uid: 4, type: 'patrol', fac: 'fed', x: DISTRESS_CALL_RANGE + 1, y: 0, hull: 55 },
  ];

  assert.equal(findDistressResponder(trader, ships), null);
});

test('distress call is deterministic when patrols are equally close', () => {
  const trader = { uid: 1, type: 'trader', playerAggressed: true, x: 0, y: 0 };
  const patrolB = { uid: 'b', type: 'patrol', fac: 'fed', x: -100, y: 0, hull: 55 };
  const patrolA = { uid: 'a', type: 'patrol', fac: 'fed', x: 100, y: 0, hull: 55 };

  assert.equal(findDistressResponder(trader, [patrolB, patrolA]), patrolA);
});

test('untouched traders and non-traders cannot dispatch a patrol', () => {
  const patrol = { uid: 2, type: 'patrol', fac: 'fed', x: 10, y: 0, hull: 55 };

  assert.equal(findDistressResponder({ type: 'trader', x: 0, y: 0 }, [patrol]), null);
  assert.equal(findDistressResponder({ type: 'patrol', playerAggressed: true, x: 0, y: 0 }, [patrol]), null);
});

test('invalid coordinates and range fail safely', () => {
  const trader = { type: 'trader', playerAggressed: true, x: 'unknown', y: 0 };
  const patrol = { uid: 2, type: 'patrol', fac: 'fed', x: 10, y: 0, hull: 55 };

  assert.equal(findDistressResponder(trader, [patrol]), null);
  assert.equal(findDistressResponder({ ...trader, x: 0 }, [patrol], -1), null);
});
