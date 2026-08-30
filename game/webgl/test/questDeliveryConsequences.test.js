import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELIVERY_EXPIRED_REPUTATION,
  DELIVERY_REPUTATION,
  deliveryQuestPresentation,
} from '../src/questDelivery.js';

const QUEST = { g: 'food', q: 5, sys: 7, pl: 2, pay: 900, deadline: 14, issuerFaction: 'gaal' };

test('faction delivery presentation exposes projected reputation consequences', () => {
  assert.deepEqual(deliveryQuestPresentation({ quest: QUEST, day: 10 }).reputation, {
    faction: 'gaal',
    completionDelta: DELIVERY_REPUTATION,
    failureDelta: DELIVERY_EXPIRED_REPUTATION,
  });
});

test('legacy faction key is normalized in projected reputation consequences', () => {
  const state = deliveryQuestPresentation({ quest: { ...QUEST, issuerFaction: undefined, faction: 'malok' }, day: 10 });
  assert.equal(state.reputation.faction, 'malok');
});

test('factionless delivery does not fabricate reputation consequences', () => {
  const { issuerFaction, ...factionless } = QUEST;
  assert.equal(deliveryQuestPresentation({ quest: factionless, day: 10 }).reputation, null);
});
