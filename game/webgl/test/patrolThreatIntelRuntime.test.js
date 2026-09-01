import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPatrolThreatIntel } from '../src/patrolThreatIntelRuntime.js';

function save(ships, radar = 500) {
  return {
    P: { x: 0, y: 0, radar },
    demoShips: ships,
  };
}

test('patrol intel distinguishes player-radar contacts from patrol-only threats', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 1, type: 'patrol', fac: 'fed', x: 100, y: 0, hull: 60 },
    { uid: 2, type: 'pirate', fac: 'pir', x: 300, y: 0, hull: 35 },
    { uid: 3, type: 'raider', fac: 'pir', x: 0, y: 900, hull: 80 },
    { uid: 4, type: 'raider', fac: 'pir', x: 50, y: 0, hull: 0 },
  ]));
  assert.equal(intel.count, 2);
  assert.equal(intel.raiders, 1);
  assert.equal(intel.sensorConfirmed, 1);
  assert.equal(intel.patrolOnly, 1);
  assert.equal(intel.nearest.uid, 2);
  assert.equal(intel.nearest.inPlayerRadar, true);
  assert.equal(intel.nearest.reportedDistance, 300);
  assert.equal(intel.nearest.distanceAccuracy, 'exact');
  assert.match(intel.text, /Ваш радар подтверждает 1, ещё 1 переданы патрулём/);
  assert.match(intel.text, /300 м/);
});

test('patrol-only threat reports an approximate rounded distance', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 7, type: 'pirate', fac: 'pir', x: 746, y: 0, hull: 35 },
  ], 500));
  assert.equal(intel.sensorConfirmed, 0);
  assert.equal(intel.patrolOnly, 1);
  assert.equal(intel.nearest.distance, 746);
  assert.equal(intel.nearest.reportedDistance, 700);
  assert.equal(intel.nearest.distanceAccuracy, 'estimated');
  assert.match(intel.text, /примерно 700 м/);
  assert.match(intel.text, /вне вашего радара, по данным патруля/);
  assert.doesNotMatch(intel.text, /746 м/);
});

test('patrol intel ignores destroyed pirate contacts', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 4, type: 'pirate', fac: 'pir', x: 50, y: 0, hull: 0 },
  ]));
  assert.equal(intel.count, 0);
  assert.equal(intel.raiders, 0);
  assert.equal(intel.sensorConfirmed, 0);
  assert.equal(intel.patrolOnly, 0);
  assert.equal(intel.nearest, null);
  assert.match(intel.text, /не обнаружено/);
});

test('patrol intel rejects malformed save input safely', () => {
  assert.equal(buildPatrolThreatIntel(null), null);
});
