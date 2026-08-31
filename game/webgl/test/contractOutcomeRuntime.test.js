import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSavedDeliveryState } from '../src/contractOutcomeRuntime.js';

function baseSave() {
  return {
    P: {
      docked: 2,
      cargo: { food: 5 },
      money: 1000,
      xp: 7,
      rep: { fed: 4 },
    },
    G: {
      day: 10,
      sysId: 7,
      activeQuest: {
        g: 'food',
        q: 5,
        sys: 7,
        pl: 2,
        pay: 900,
        deadline: 14,
        issuerFaction: 'fed',
      },
    },
  };
}

test('docking at delivery destination completes contract and applies rewards', () => {
  const outcome = resolveSavedDeliveryState(baseSave());
  assert.equal(outcome.changed, true);
  assert.equal(outcome.status, 'completed');
  assert.equal(outcome.save.G.activeQuest, null);
  assert.equal(outcome.save.P.money, 1900);
  assert.equal(outcome.save.P.xp, 19);
  assert.equal(outcome.save.P.rep.fed, 6);
  assert.equal(outcome.save.P.cargo.food, undefined);
});

test('expired contract is removed and penalizes issuer reputation', () => {
  const save = baseSave();
  save.P.docked = null;
  save.G.day = 15;
  const outcome = resolveSavedDeliveryState(save);
  assert.equal(outcome.changed, true);
  assert.equal(outcome.status, 'expired');
  assert.equal(outcome.save.G.activeQuest, null);
  assert.equal(outcome.save.P.rep.fed, 3);
  assert.equal(outcome.save.P.money, 1000);
});

test('contract remains untouched before deadline away from destination', () => {
  const save = baseSave();
  save.P.docked = 1;
  const outcome = resolveSavedDeliveryState(save);
  assert.equal(outcome.changed, false);
  assert.equal(outcome.status, 'not_here');
  assert.strictEqual(outcome.save, save);
});
