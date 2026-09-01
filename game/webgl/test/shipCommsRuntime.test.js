import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHailProfile, contactDisposition, listRadioContacts, nearestSystemSalvage, summarizeSystemSalvage } from '../src/shipCommsRuntime.js';

function save(overrides = {}) {
  return {
    P: { x: 0, y: 0, radar: 500, rep: { fed: 25, pel: 5, pir: -40 }, ...(overrides.P || {}) },
    G: { sysId: 2, ...(overrides.G || {}) },
    systems: overrides.systems || [
      { id: 2, name: 'Арктур', danger: 4, planets: [{ hasPort: true }, { hasPort: false }, { hasPort: true }] },
    ],
    demoShips: overrides.demoShips || [
      { uid: 1001, type: 'patrol', fac: 'fed', x: 300, y: 0, hull: 55 },
      { uid: 1002, type: 'trader', fac: 'pel', x: 100, y: 0, hull: 40 },
      { uid: 1003, type: 'pirate', fac: 'pir', x: 700, y: 0, hull: 35 },
      { uid: 1004, type: 'raider', fac: 'pir', x: 50, y: 0, hull: 0 },
    ],
    salvagePersistence: overrides.salvagePersistence,
  };
}

test('radio contact list includes only living ships inside radar and sorts by distance', () => {
  const contacts = listRadioContacts(save());
  assert.deepEqual(contacts.map(c => c.uid), [1002, 1001]);
  assert.equal(contacts[0].distance, 100);
  assert.equal(contacts[1].distance, 300);
});

test('disposition is driven by faction hostility and player reputation', () => {
  assert.equal(contactDisposition({ fac: 'fed', type: 'patrol' }, 25), 'friendly');
  assert.equal(contactDisposition({ fac: 'pel', type: 'trader' }, 5), 'neutral');
  assert.equal(contactDisposition({ fac: 'fed', type: 'patrol' }, -5), 'cold');
  assert.equal(contactDisposition({ fac: 'pir', type: 'pirate' }, 99), 'hostile');
});

test('hail profile exposes real system danger and role-specific information', () => {
  const input = save();
  const patrol = listRadioContacts(input).find(c => c.uid === 1001);
  const profile = buildHailProfile(patrol, input);
  assert.equal(profile.systemName, 'Арктур');
  assert.equal(profile.danger, 4);
  assert.equal(profile.portCount, 2);
  assert.match(profile.identity, /Федерация Терра/);
  assert.match(profile.status, /Патруль/);
  assert.match(profile.status, /4\/5/);
});

test('trader hail reports active ports from current system data', () => {
  const input = save();
  const trader = listRadioContacts(input).find(c => c.uid === 1002);
  const profile = buildHailProfile(trader, input);
  assert.match(profile.status, /Доступных портов: 2/);
  assert.equal(profile.disposition, 'neutral');
});

test('system salvage summary ignores invalid records and counts recoverable cargo units', () => {
  const input = save({
    salvagePersistence: {
      systems: {
        2: [
          { goodId: 'ore', amount: 3, x: 10, y: 20 },
          { goodId: 'mach', amount: 2, x: 30, y: 40 },
          { goodId: 'weap', amount: 0, x: 50, y: 60 },
        ],
      },
    },
  });
  assert.deepEqual(summarizeSystemSalvage(input, 2), { fields: 2, units: 5 });
  assert.deepEqual(summarizeSystemSalvage(input, 3), { fields: 0, units: 0 });
});

test('nearest salvage intel uses player position, cargo names and compass bearing while ignoring unusable records', () => {
  const input = save({
    P: { x: 10, y: 10 },
    salvagePersistence: {
      systems: {
        2: [
          { goodId: 'ore', amount: 3, x: 13, y: 14 },
          { goodId: 'mach', amount: 2, x: 40, y: 50 },
          { goodId: 'weap', amount: 0, x: 11, y: 11 },
          { goodId: 'ore', amount: 4, x: 'bad', y: 12 },
        ],
      },
    },
  });
  assert.deepEqual(nearestSystemSalvage(input, 2), { goodId: 'ore', goodName: 'Руда', amount: 3, distance: 5, bearing: 143 });
  assert.equal(nearestSystemSalvage(input, 3), null);
});

test('nearest salvage uses a safe label for unknown cargo ids', () => {
  const input = save({
    P: { x: 0, y: 0 },
    salvagePersistence: {
      systems: {
        2: [{ goodId: 'future_loot', amount: 1, x: 3, y: 4 }],
      },
    },
  });
  assert.deepEqual(nearestSystemSalvage(input, 2), {
    goodId: 'future_loot',
    goodName: 'неизвестный груз',
    amount: 1,
    distance: 5,
    bearing: 143,
  });
});

test('hail status reports persisted salvage intel, nearest range, cargo identity and compass bearing', () => {
  const input = save({
    salvagePersistence: {
      systems: {
        2: [
          { goodId: 'ore', amount: 3, x: 10, y: 20 },
          { goodId: 'mach', amount: 2, x: 30, y: 40 },
        ],
      },
    },
  });
  const patrol = listRadioContacts(input).find(c => c.uid === 1001);
  const profile = buildHailProfile(patrol, input);
  assert.equal(profile.salvageFields, 2);
  assert.equal(profile.salvageUnits, 5);
  assert.equal(profile.nearestSalvageDistance, 22);
  assert.equal(profile.nearestSalvageGoodId, 'ore');
  assert.equal(profile.nearestSalvageGoodName, 'Руда');
  assert.equal(profile.nearestSalvageAmount, 3);
  assert.equal(profile.nearestSalvageBearing, 153);
  assert.match(profile.status, /Обломки на сенсорах: 2 пол\., 5 ед\. груза/);
  assert.match(profile.status, /Ближайшее поле: 22 м — Руда ×3, курс 153°\./);
});
