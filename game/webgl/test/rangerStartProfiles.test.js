import test from 'node:test';
import assert from 'node:assert/strict';

import { RANGER_CLASSES, RANGER_RACES, buildRangerStartProfile } from '../src/rangerStartProfiles.js';

test('offers five playable races and four ranger classes', () => {
  assert.equal(RANGER_RACES.length, 5);
  assert.equal(RANGER_CLASSES.length, 4);
  assert.deepEqual(RANGER_RACES.map(item => item.id), ['fed', 'mal', 'pel', 'fei', 'gaal']);
  assert.deepEqual(RANGER_CLASSES.map(item => item.id), ['trader', 'warrior', 'mercenary', 'pirate']);
});

test('every race and class combination builds a complete start profile', () => {
  for (const race of RANGER_RACES) {
    for (const rangerClass of RANGER_CLASSES) {
      const profile = buildRangerStartProfile({ raceId: race.id, classId: rangerClass.id });
      assert.equal(profile.raceId, race.id);
      assert.equal(profile.classId, rangerClass.id);
      assert.ok(profile.money >= 0);
      assert.ok(profile.missiles >= 0);
      assert.equal(typeof profile.eq.w, 'number');
      assert.equal(typeof profile.eq.e, 'number');
      assert.equal(typeof profile.eq.s, 'number');
      assert.equal(typeof profile.eq.h, 'number');
      assert.equal(typeof profile.eq.c, 'number');
      assert.equal(typeof profile.eq.r, 'number');
      assert.equal(typeof profile.reputation[race.faction], 'number');
    }
  }
});

test('classes materially change equipment and starting conditions', () => {
  const trader = buildRangerStartProfile({ raceId: 'fed', classId: 'trader' });
  const warrior = buildRangerStartProfile({ raceId: 'fed', classId: 'warrior' });
  const mercenary = buildRangerStartProfile({ raceId: 'fed', classId: 'mercenary' });
  const pirate = buildRangerStartProfile({ raceId: 'fed', classId: 'pirate' });

  assert.notDeepEqual(trader.eq, warrior.eq);
  assert.notEqual(trader.money, warrior.money);
  assert.notEqual(mercenary.startMode, trader.startMode);
  assert.equal(pirate.reputation.pir, 25);
  assert.ok(pirate.reputation.fed < trader.reputation.fed);
});

test('race changes home faction and diplomatic baseline', () => {
  const human = buildRangerStartProfile({ raceId: 'fed', classId: 'mercenary' });
  const gaalian = buildRangerStartProfile({ raceId: 'gaal', classId: 'mercenary' });
  assert.equal(human.faction, 'fed');
  assert.equal(gaalian.faction, 'gaal');
  assert.notDeepEqual(human.reputation, gaalian.reputation);
  assert.ok(gaalian.reputation.gaal > human.reputation.gaal);
});
