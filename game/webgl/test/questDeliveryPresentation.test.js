import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELIVERY_MIN_REPUTATION,
  deliveryOfferPresentation,
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

test('presentation exposes reputation lock metadata for hostile issuer', () => {
  assert.deepEqual(
    deliveryOfferPresentation({
      offer: OFFER,
      capacity: 20,
      reputation: { gaal: DELIVERY_MIN_REPUTATION - 3 },
    }),
    {
      ok: false,
      reason: 'reputation_too_low',
      faction: 'gaal',
      reputation: DELIVERY_MIN_REPUTATION - 3,
      minimumReputation: DELIVERY_MIN_REPUTATION,
      reputationLocked: true,
    },
  );
});

test('presentation keeps faction metadata when another rule blocks the offer', () => {
  assert.deepEqual(
    deliveryOfferPresentation({
      activeQuest: { t: 'del' },
      offer: OFFER,
      capacity: 20,
      reputation: { gaal: 5 },
    }),
    {
      ok: false,
      reason: 'active_quest',
      faction: 'gaal',
      reputation: 5,
      minimumReputation: DELIVERY_MIN_REPUTATION,
      reputationLocked: false,
    },
  );
});

test('factionless offer exposes no reputation requirement', () => {
  const offer = { ...OFFER };
  delete offer.issuerFaction;
  assert.deepEqual(
    deliveryOfferPresentation({
      offer,
      capacity: 20,
      reputation: { gaal: -99 },
    }),
    {
      ok: true,
      reason: null,
      faction: null,
      reputation: null,
      minimumReputation: null,
      reputationLocked: false,
    },
  );
});
