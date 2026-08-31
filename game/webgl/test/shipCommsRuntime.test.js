import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHailProfile, contactDisposition, listRadioContacts } from '../src/shipCommsRuntime.js';

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
