import test from 'node:test';
import assert from 'node:assert/strict';
import { abandonSavedDelivery, canAcceptDelivery } from '../src/contractAbandonRuntime.js';

function baseSave() {
  return {
    P: { cargo: { food: 8, ore: 2 }, rep: { fed: 4 } },
    G: {
      activeQuest: {
        g: 'food', q: 5, sys: 7, pl: 2, pay: 900, deadline: 14,
        issuerFaction: 'fed',
      },
    },
  };
}

test('abandoning active delivery clears quest and penalizes issuer reputation', () => {
  const outcome = abandonSavedDelivery(baseSave());
  assert.equal(outcome.changed, true);
  assert.equal(outcome.status, 'abandoned');
  assert.equal(outcome.save.G.activeQuest, null);
  assert.equal(outcome.save.P.rep.fed, 3);
  assert.equal(outcome.reputationDelta, -1);
});

test('legacy runtime cargo granted with contract is removed on abandon', () => {
  const outcome = abandonSavedDelivery(baseSave());
  assert.equal(outcome.cargoRemoved, 5);
  assert.deepEqual(outcome.save.P.cargo, { food: 3, ore: 2 });
});

test('missionCargo contracts do not consume ordinary market cargo on abandon', () => {
  const save = baseSave();
  save.G.activeQuest.missionCargo = true;
  const outcome = abandonSavedDelivery(save);
  assert.equal(outcome.cargoRemoved, 0);
  assert.deepEqual(outcome.save.P.cargo, { food: 8, ore: 2 });
});

test('no active contract leaves save untouched', () => {
  const save = baseSave();
  save.G.activeQuest = null;
  const outcome = abandonSavedDelivery(save);
  assert.equal(outcome.changed, false);
  assert.strictEqual(outcome.save, save);
});

test('blocks accepting another delivery while a contract is active', () => {
  assert.equal(canAcceptDelivery(baseSave()), false);
  const save = baseSave();
  save.G.activeQuest = null;
  assert.equal(canAcceptDelivery(save), true);
  assert.equal(canAcceptDelivery(null), true);
});
