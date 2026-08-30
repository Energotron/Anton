import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELIVERY_MIN_REPUTATION,
  canAcceptDelivery,
} from '../src/questDelivery.js';

const OFFER = { t: 'del', g: 'food', q: 5, sys: 7, pl: 2, pay: 900, deadline: 14 };

test('hostile issuer reputation blocks new faction delivery contracts', () => {
  const offer = { ...OFFER, issuerFaction: 'gaal' };
  assert.deepEqual(
    canAcceptDelivery({ capacity: 12, offer, reputation: { gaal: DELIVERY_MIN_REPUTATION - 1 } }),
    { ok: false, reason: 'reputation_too_low' },
  );
});

test('issuer reputation at threshold still allows a faction delivery contract', () => {
  const offer = { ...OFFER, faction: 'malok' };
  assert.deepEqual(
    canAcceptDelivery({ capacity: 12, offer, reputation: { malok: DELIVERY_MIN_REPUTATION } }),
    { ok: true, reason: null },
  );
});

test('factionless delivery remains available regardless of reputation map', () => {
  assert.deepEqual(
    canAcceptDelivery({ capacity: 12, offer: OFFER, reputation: { gaal: -99 } }),
    { ok: true, reason: null },
  );
});
