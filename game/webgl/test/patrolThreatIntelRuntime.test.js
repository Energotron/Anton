import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPatrolThreatIntel } from '../src/patrolThreatIntelRuntime.js';

function save(ships) {
  return {
    P: { x: 0, y: 0, radar: 500 },
    demoShips: ships,
  };
}

test('patrol intel reports living pirates across the current system beyond player radar', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 1, type: 'patrol', fac: 'fed', x: 100, y: 0, hull: 60 },
    { uid: 2, type: 'pirate', fac: 'pir', x: 700, y: 0, hull: 35 },
    { uid: 3, type: 'raider', fac: 'pir', x: 0, y: 900, hull: 80 },
    { uid: 4, type: 'raider', fac: 'pir', x: 50, y: 0, hull: 0 },
  ]));
  assert.equal(intel.count, 2);
  assert.equal(intel.raiders, 1);
  assert.equal(intel.nearest.uid, 2);
  assert.equal(intel.nearest.distance, 700);
  assert.equal(intel.nearest.bearing, 'В');
  assert.match(intel.text, /пиратских контактов 2/);
});

test('patrol intel ignores destroyed pirate contacts', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 4, type: 'pirate', fac: 'pir', x: 50, y: 0, hull: 0 },
  ]));
  assert.equal(intel.count, 0);
  assert.equal(intel.raiders, 0);
  assert.equal(intel.nearest, null);
  assert.match(intel.text, /не обнаружено/);
});

test('patrol intel rejects malformed save input safely', () => {
  assert.equal(buildPatrolThreatIntel(null), null);
});
