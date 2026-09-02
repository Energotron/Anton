import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  applyDiplomacyAction,
  normalizeDiplomacyRules,
  parseDiplomacyRules,
} from '../src/diplomacyRulesCore.js';

const rulesUrl = new URL('../../../data/diplomacy_rules.json', import.meta.url);
const rules = parseDiplomacyRules(await readFile(fileURLToPath(rulesUrl), 'utf8'));

test('loads the canonical diplomacy rules data', () => {
  assert.deepEqual(rules.attitudeRange, [-100, 100]);
  assert.deepEqual(rules.actions, { trade: 5, aid: 10, threat: -15, attack: -40 });
  assert.equal(rules.deterministic, true);
});

test('applies every configured diplomatic action deterministically', () => {
  assert.equal(applyDiplomacyAction(0, 'trade', rules).result, 5);
  assert.equal(applyDiplomacyAction(0, 'aid', rules).result, 10);
  assert.equal(applyDiplomacyAction(0, 'threat', rules).result, -15);
  assert.equal(applyDiplomacyAction(0, 'attack', rules).result, -40);
  assert.deepEqual(applyDiplomacyAction(12, 'aid', rules), applyDiplomacyAction(12, 'aid', rules));
});

test('clamps positive and negative results to the configured range', () => {
  assert.equal(applyDiplomacyAction(99, 'aid', rules).result, 100);
  assert.equal(applyDiplomacyAction(-80, 'attack', rules).result, -100);
});

test('does not mutate normalized rules between calculations', () => {
  applyDiplomacyAction(20, 'trade', rules);
  assert.deepEqual(rules.actions, { trade: 5, aid: 10, threat: -15, attack: -40 });
  assert.equal(Object.isFrozen(rules), true);
  assert.equal(Object.isFrozen(rules.actions), true);
});

test('rejects unknown actions and non-finite attitudes', () => {
  assert.throws(() => applyDiplomacyAction(0, 'bribe', rules), /unknown diplomacy action/);
  assert.throws(() => applyDiplomacyAction(Number.NaN, 'trade', rules), /attitude must be finite/);
});

test('validates malformed rule ranges and action deltas', () => {
  assert.throws(
    () => normalizeDiplomacyRules({ attitude_range: [100, -100], actions: { trade: 5 } }),
    /attitude_range/,
  );
  assert.throws(
    () => normalizeDiplomacyRules({ attitude_range: [-100, 100], actions: { trade: 'unknown' } }),
    /invalid diplomacy action/,
  );
});
