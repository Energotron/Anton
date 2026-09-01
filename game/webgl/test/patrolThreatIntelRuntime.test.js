import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPatrolThreatIntel } from '../src/patrolThreatIntelRuntime.js';

function save(ships, radar = 500) {
  return { P: { x: 0, y: 0, radar }, demoShips: ships };
}

test('patrol intel distinguishes player-radar contacts from patrol-only threats', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 1, type: 'patrol', fac: 'fed', x: 100, y: 0, hull: 60 },
    { uid: 2, type: 'pirate', fac: 'pir', x: 300, y: 0, hull: 35 },
    { uid: 3, type: 'raider', fac: 'pir', x: 0, y: 900, hull: 80 },
    { uid: 4, type: 'raider', fac: 'pir', x: 50, y: 0, hull: 0 },
  ]));
  assert.equal(intel.count, 2);
  assert.equal(intel.raiders, 0);
  assert.equal(intel.sensorConfirmed, 1);
  assert.equal(intel.patrolOnly, 1);
  assert.equal(intel.nearest.uid, 2);
  assert.equal(intel.nearest.reportedType, 'pirate');
  assert.equal(intel.nearest.typeAccuracy, 'exact');
  assert.match(intel.text, /Среди подтверждённых целей рейдеров 0/);
  assert.doesNotMatch(intel.text, /рейдеров 1/);
});

test('patrol-only threat reports approximate distance, coarse bearing and generic classification', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 7, type: 'raider', fac: 'pir', x: 746, y: 120, hull: 35 },
  ], 500));
  assert.equal(intel.sensorConfirmed, 0);
  assert.equal(intel.patrolOnly, 1);
  assert.equal(intel.raiders, 0);
  assert.equal(intel.nearest.reportedType, 'pirate_contact');
  assert.equal(intel.nearest.typeAccuracy, 'generic');
  assert.equal(intel.nearest.reportedDistance, 800);
  assert.equal(intel.nearest.bearing, 'восточный сектор');
  assert.match(intel.text, /пиратский контакт, примерно 800 м/);
  assert.doesNotMatch(intel.text, /рейдер/);
});

test('sensor-confirmed raider keeps exact classification', () => {
  const intel = buildPatrolThreatIntel(save([
    { uid: 8, type: 'raider', fac: 'pir', x: 120, y: 80, hull: 55 },
  ], 400));
  assert.equal(intel.raiders, 1);
  assert.equal(intel.confirmedRaiders, 1);
  assert.equal(intel.nearest.reportedType, 'raider');
  assert.equal(intel.nearest.typeAccuracy, 'exact');
  assert.match(intel.text, /Ближайшая угроза — рейдер/);
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
