import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatReputationIntel,
  readReputation,
  reputationSnapshot,
  reputationStanding,
} from '../src/reputationIntel.js';

test('reputationStanding maps scores to stable diplomatic bands', () => {
  assert.equal(reputationStanding(-30).id, 'hostile');
  assert.equal(reputationStanding(-10).id, 'distrusted');
  assert.equal(reputationStanding(0).id, 'neutral');
  assert.equal(reputationStanding(20).id, 'trusted');
  assert.equal(reputationStanding(50).id, 'allied');
});

test('reputationSnapshot reads and sorts persisted faction reputation', () => {
  const snapshot = reputationSnapshot({ P: { rep: { pir: -40, fed: 10, pel: 25 } } });
  assert.deepEqual(snapshot.map(x => [x.faction, x.score, x.standing.id]), [
    ['pel', 25, 'trusted'],
    ['fed', 10, 'neutral'],
    ['pir', -40, 'hostile'],
  ]);
});

test('readReputation tolerates absent or corrupt saves', () => {
  assert.equal(readReputation({ getItem: () => null }), null);
  assert.equal(readReputation({ getItem: () => '{bad json' }), null);
});

test('formatReputationIntel presents readable standings', () => {
  const text = formatReputationIntel(
    reputationSnapshot({ P: { rep: { fed: 55, pir: -5 } } }),
    { fed: 'Федерация', pir: 'Пираты' },
  );
  assert.match(text, /Федерация: \+55 — Союзник/);
  assert.match(text, /Пираты: -5 — Недоверие/);
});
