import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELIVERY_ABANDONED_REPUTATION,
  abandonDelivery,
  acceptDelivery,
} from '../src/questDelivery.js';

const OFFER = {
  t: 'del',
  g: 'food',
  q: 5,
  sys: 7,
  pl: 2,
  pay: 900,
  deadline: 14,
  issuerFaction: 'gaal',
};

test('abandoning a faction delivery clears it and lowers issuer reputation', () => {
  const quest = acceptDelivery(OFFER);
  const result = abandonDelivery({ quest, reputation: { gaal: 3, peleng: 1 } });

  assert.equal(result.status, 'abandoned');
  assert.equal(result.quest, null);
  assert.deepEqual(result.reputation, {
    gaal: 3 + DELIVERY_ABANDONED_REPUTATION,
    peleng: 1,
  });
  assert.equal(result.reputationDelta, DELIVERY_ABANDONED_REPUTATION);
});

test('abandoning a factionless delivery does not invent reputation state', () => {
  const quest = acceptDelivery({ ...OFFER, issuerFaction: undefined });
  const result = abandonDelivery({ quest, reputation: { gaal: 3 } });

  assert.equal(result.status, 'abandoned');
  assert.deepEqual(result.reputation, { gaal: 3 });
  assert.equal(result.reputationDelta, 0);
});

test('abandon with no active quest is a no-op', () => {
  assert.deepEqual(abandonDelivery({ reputation: { gaal: 3 } }), {
    status: 'none',
    quest: null,
    reputation: { gaal: 3 },
    reputationDelta: 0,
  });
});
