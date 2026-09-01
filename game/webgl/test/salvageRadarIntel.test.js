import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSalvageRadarSummary, listSalvageRadarContacts, salvageContactToMinimapPoint } from '../src/salvageRadarIntel.js';

function saveWith(records, radar = 500) {
  return {
    P: { x: 0, y: 0, radar },
    G: { sysId: 2 },
    salvagePersistence: { systems: { 2: records, 7: [{ goodId: 'ore', amount: 99, x: 1, y: 1 }] } }
  };
}

test('lists only current-system valid salvage and sorts visible contacts by distance', () => {
  const contacts = listSalvageRadarContacts(saveWith([
    { id: 'far', goodId: 'weap', amount: 1, x: 800, y: 0 },
    { id: 'near', goodId: 'ore', amount: 3, x: 30, y: 40 },
    { id: 'mid', goodId: 'mach', amount: 2, x: 120, y: 0 }
  ]));
  assert.deepEqual(contacts.map(c => [c.id, c.distance, c.inRadar]), [
    ['near', 50, true], ['mid', 120, true], ['far', 800, false]
  ]);
});

test('derives compact compass bearing labels from relative salvage position', () => {
  const contacts = listSalvageRadarContacts(saveWith([
    { id: 'north', goodId: 'ore', amount: 1, x: 0, y: 100 },
    { id: 'southwest', goodId: 'mach', amount: 1, x: -100, y: -100 }
  ]));
  assert.equal(contacts.find(c => c.id === 'north').bearing, 'С');
  assert.equal(contacts.find(c => c.id === 'southwest').bearing, 'ЮЗ');
});

test('summary reports visible cargo amount, hidden contacts and nearest salvage', () => {
  const summary = buildSalvageRadarSummary(saveWith([
    { id: 'a', goodId: 'ore', amount: 4, x: 100, y: 0 },
    { id: 'b', goodId: 'mach', amount: 2, x: 200, y: 0 },
    { id: 'c', goodId: 'weap', amount: 7, x: 900, y: 0 }
  ], 300));
  assert.equal(summary.visible.length, 2);
  assert.equal(summary.hidden, 1);
  assert.equal(summary.totalAmount, 6);
  assert.equal(summary.nearest.id, 'a');
});

test('marks contacts inside tractor range and reports remaining approach distance', () => {
  const contacts = listSalvageRadarContacts(saveWith([
    { id: 'ready', goodId: 'ore', amount: 1, x: 30, y: 40 },
    { id: 'edge', goodId: 'mach', amount: 1, x: 72, y: 0 },
    { id: 'approach', goodId: 'weap', amount: 1, x: 100, y: 0 }
  ]));
  assert.deepEqual(contacts.map(c => [c.id, c.pickupReady, c.pickupGap, c.pickupRadius]), [
    ['ready', true, 0, 72], ['edge', true, 0, 72], ['approach', false, 28, 72]
  ]);
});

test('summary exposes currently tractor-ready contacts', () => {
  const summary = buildSalvageRadarSummary(saveWith([
    { id: 'a', goodId: 'ore', amount: 4, x: 50, y: 0 },
    { id: 'b', goodId: 'mach', amount: 2, x: 72, y: 0 },
    { id: 'c', goodId: 'weap', amount: 7, x: 100, y: 0 }
  ]));
  assert.deepEqual(summary.ready.map(c => c.id), ['a', 'b']);
});

test('invalid, exhausted and unsupported salvage entries are ignored safely', () => {
  const contacts = listSalvageRadarContacts(saveWith([
    { goodId: 'ore', amount: 0, x: 1, y: 1 },
    { goodId: 'contraband', amount: 2, x: 1, y: 1 },
    { goodId: 'weap', amount: 1, x: 'bad', y: 1 }
  ]));
  assert.deepEqual(contacts, []);
});

test('maps a visible salvage contact onto the canonical 264px minimap space', () => {
  const save = saveWith([], 700);
  const point = salvageContactToMinimapPoint(save, { x: 350, y: -175 });
  assert.deepEqual(point, { x: 192, y: 102 });
});

test('rejects malformed or off-minimap salvage navigation points', () => {
  const save = saveWith([], 700);
  assert.equal(salvageContactToMinimapPoint(save, { x: 'bad', y: 0 }), null);
  assert.equal(salvageContactToMinimapPoint(save, { x: 1000, y: 0 }), null);
});