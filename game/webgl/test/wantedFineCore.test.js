import test from 'node:test';
import assert from 'node:assert/strict';

import { WANTED_FINE_PER_TURN, payWantedFine, wantedFineAvailability } from '../src/wantedFineCore.js';

function save(overrides = {}) {
  return {
    P: { money: 5000, ...(overrides.P || {}) },
    G: { sysId: 2, turn: 12, systemWantedUntil: { 2: 17, 3: 30 }, ...(overrides.G || {}) },
    demoShips: overrides.demoShips || [
      { uid: 1, type: 'patrol', fac: 'fed', playerAggressed: true },
      { uid: 2, type: 'trader', fac: 'fed', playerAggressed: true },
    ],
    systemShips: overrides.systemShips || {
      2: [{ uid: 1, type: 'patrol', fac: 'fed', playerAggressed: true }],
      3: [{ uid: 3, type: 'patrol', fac: 'mal', playerAggressed: true }],
    },
  };
}

test('wanted fine scales deterministically with remaining alert time', () => {
  assert.deepEqual(wantedFineAvailability(save()), {
    available: true,
    reason: 'ok',
    fine: 5 * WANTED_FINE_PER_TURN,
    remainingTurns: 5,
    systemId: 2,
  });
});

test('wanted fine remains quoted when the player cannot afford it', () => {
  const result = wantedFineAvailability(save({ P: { money: 1999 } }));
  assert.equal(result.available, false);
  assert.equal(result.reason, 'funds');
  assert.equal(result.fine, 2000);
});

test('paying clears the local warrant and official patrol aggression', () => {
  const input = save();
  const result = payWantedFine(input);

  assert.equal(result.changed, true);
  assert.equal(result.save.P.money, 3000);
  assert.equal(result.save.G.systemWantedUntil['2'], undefined);
  assert.equal(result.save.G.systemWantedUntil['3'], 30);
  assert.equal(result.save.demoShips[0].playerAggressed, false);
  assert.equal(result.save.systemShips['2'][0].playerAggressed, false);
  assert.equal(result.save.systemShips['3'][0].playerAggressed, true);
  assert.equal(input.P.money, 5000);
});

test('paying a fine does not erase the victim trader memory', () => {
  const result = payWantedFine(save());
  assert.equal(result.save.demoShips[1].playerAggressed, true);
});

test('no active local warrant is a safe no-op', () => {
  const input = save({ G: { sysId: 2, turn: 17, systemWantedUntil: { 2: 17 } } });
  const result = payWantedFine(input);
  assert.equal(result.changed, false);
  assert.equal(result.reason, 'no_wanted');
  assert.equal(result.save, input);
});
