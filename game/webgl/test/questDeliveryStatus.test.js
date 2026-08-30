import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryQuestPresentation } from '../src/questDelivery.js';

const QUEST = { g: 'food', q: 5, sys: 7, pl: 2, pay: 900, deadline: 14 };

test('active delivery exposes remaining time and mission details', () => {
  assert.deepEqual(deliveryQuestPresentation({ quest: QUEST, day: 10 }), {
    status: 'active', daysLeft: 4, dueToday: false, expired: false,
    destination: { systemId: 7, planetIdx: 2 }, cargo: { good: 'food', quantity: 5 }, reward: 900,
    reputation: null,
  });
});

test('final valid day is exposed as due today rather than expired', () => {
  const state = deliveryQuestPresentation({ quest: QUEST, day: 14 });
  assert.equal(state.status, 'active');
  assert.equal(state.daysLeft, 0);
  assert.equal(state.dueToday, true);
  assert.equal(state.expired, false);
});

test('day after deadline is exposed as expired', () => {
  const state = deliveryQuestPresentation({ quest: QUEST, day: 15 });
  assert.equal(state.status, 'expired');
  assert.equal(state.daysLeft, 0);
  assert.equal(state.dueToday, false);
  assert.equal(state.expired, true);
});

test('missing quest produces an inert presentation state', () => {
  assert.equal(deliveryQuestPresentation().status, 'none');
});
