import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELIVERY_XP,
  acceptDelivery,
  canAcceptDelivery,
  cargoUsed,
  isQuestExpired,
  questDaysLeft,
  resolveDeliveryAtDock,
} from '../src/questDelivery.js';

const OFFER = { t: 'del', g: 'food', q: 5, sys: 7, pl: 2, pay: 900, deadline: 14 };

test('mission cargo reserves hold capacity without becoming market cargo', () => {
  const quest = acceptDelivery(OFFER, { day: 3, systemId: 1, planetIdx: 0 });
  assert.equal(cargoUsed({ ore: 4 }, quest), 9);
  assert.equal(quest.missionCargo, true);
  assert.equal(quest.acceptedDay, 3);
  assert.equal(quest.originSys, 1);
});

test('a second delivery cannot be accepted while one is active', () => {
  const activeQuest = acceptDelivery(OFFER);
  assert.deepEqual(
    canAcceptDelivery({ activeQuest, cargo: {}, capacity: 20, offer: OFFER }),
    { ok: false, reason: 'active_quest' },
  );
});

test('delivery acceptance respects hold capacity', () => {
  assert.deepEqual(
    canAcceptDelivery({ cargo: { ore: 8 }, capacity: 12, offer: OFFER }),
    { ok: false, reason: 'cargo_full' },
  );
  assert.equal(canAcceptDelivery({ cargo: { ore: 7 }, capacity: 12, offer: OFFER }).ok, true);
});

test('deadline is valid through the final day and expires after it', () => {
  assert.equal(questDaysLeft(OFFER, 10), 4);
  assert.equal(isQuestExpired(OFFER, 14), false);
  assert.equal(isQuestExpired(OFFER, 15), true);
});

test('new mission cargo completes at the destination and pays reward plus XP', () => {
  const quest = acceptDelivery(OFFER);
  const result = resolveDeliveryAtDock({
    quest,
    day: 10,
    systemId: 7,
    planetIdx: 2,
    cargo: { ore: 3 },
    money: 100,
    xp: 4,
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.quest, null);
  assert.deepEqual(result.cargo, { ore: 3 });
  assert.equal(result.money, 1000);
  assert.equal(result.xp, 4 + DELIVERY_XP);
});

test('legacy quest cargo is consumed instead of becoming free market goods', () => {
  const legacy = { ...OFFER, missionCargo: false };
  const result = resolveDeliveryAtDock({
    quest: legacy,
    day: 10,
    systemId: 7,
    planetIdx: 2,
    cargo: { food: 7 },
  });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.cargo, { food: 2 });
});

test('legacy quest cannot complete when cargo was sold before arrival', () => {
  const legacy = { ...OFFER, missionCargo: false };
  const result = resolveDeliveryAtDock({
    quest: legacy,
    day: 10,
    systemId: 7,
    planetIdx: 2,
    cargo: { food: 2 },
  });
  assert.equal(result.status, 'missing_cargo');
  assert.equal(result.quest, legacy);
});

test('expired delivery is cleared without paying the player', () => {
  const quest = acceptDelivery(OFFER);
  const result = resolveDeliveryAtDock({
    quest,
    day: 15,
    systemId: 7,
    planetIdx: 2,
    money: 500,
    xp: 8,
  });
  assert.equal(result.status, 'expired');
  assert.equal(result.quest, null);
  assert.equal(result.money, 500);
  assert.equal(result.xp, 8);
});
