import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELIVERY_EXPIRED_REPUTATION,
  acceptDelivery,
  resolveDeliveryOnDayAdvance,
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

test('delivery remains active through its deadline day', () => {
  const quest = acceptDelivery(OFFER);
  const result = resolveDeliveryOnDayAdvance({ quest, day: 14, reputation: { gaal: 4 } });

  assert.equal(result.status, 'active');
  assert.equal(result.quest, quest);
  assert.deepEqual(result.reputation, { gaal: 4 });
  assert.equal(result.reputationDelta, 0);
});

test('day advance expires overdue delivery and applies issuer penalty', () => {
  const quest = acceptDelivery(OFFER);
  const result = resolveDeliveryOnDayAdvance({ quest, day: 15, reputation: { gaal: 4 } });

  assert.equal(result.status, 'expired');
  assert.equal(result.quest, null);
  assert.deepEqual(result.reputation, { gaal: 4 + DELIVERY_EXPIRED_REPUTATION });
  assert.equal(result.reputationDelta, DELIVERY_EXPIRED_REPUTATION);
});

test('factionless expiry clears quest without inventing reputation', () => {
  const quest = acceptDelivery({ ...OFFER, issuerFaction: undefined });
  const result = resolveDeliveryOnDayAdvance({ quest, day: 15, reputation: { gaal: 4 } });

  assert.equal(result.status, 'expired');
  assert.equal(result.quest, null);
  assert.deepEqual(result.reputation, { gaal: 4 });
  assert.equal(result.reputationDelta, 0);
});

test('day advance without a quest is a no-op', () => {
  assert.deepEqual(resolveDeliveryOnDayAdvance({ day: 99, reputation: { gaal: 4 } }), {
    status: 'none',
    quest: null,
    reputation: { gaal: 4 },
    reputationDelta: 0,
  });
});
