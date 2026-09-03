import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SYSTEM_WANTED_MAX_TURNS,
  SYSTEM_WANTED_REPEAT_TURNS,
  SYSTEM_WANTED_TURNS,
  normalizeSystemWanted,
  recordSystemWanted,
  shouldRecordSystemWanted,
  systemWantedStatus,
  wantedPortAccess,
} from '../src/systemWantedCore.js';

test('faction aggression creates a five-turn local wanted status', () => {
  const wanted = recordSystemWanted({}, 7, 12);

  assert.deepEqual(wanted, { 7: 12 + SYSTEM_WANTED_TURNS });
  assert.deepEqual(systemWantedStatus(wanted, 7, 12), {
    active: true, remainingTurns: 5, expiresTurn: 17,
  });
});

test('wanted status counts down and expires deterministically', () => {
  const wanted = { 7: 17 };

  assert.equal(systemWantedStatus(wanted, 7, 16).remainingTurns, 1);
  assert.deepEqual(systemWantedStatus(wanted, 7, 17), {
    active: false, remainingTurns: 0, expiresTurn: 17,
  });
});

test('wanted status remains isolated to the system where the crime occurred', () => {
  const wanted = recordSystemWanted({}, 7, 12);

  assert.equal(systemWantedStatus(wanted, 8, 12).active, false);
});

test('active local wanted status blocks authority port access', () => {
  assert.deepEqual(wantedPortAccess({ 7: 17 }, 7, 12), {
    allowed: false, reason: 'wanted', remainingTurns: 5,
  });
});

test('port access returns when the local wanted status expires', () => {
  assert.deepEqual(wantedPortAccess({ 7: 17 }, 7, 17), {
    allowed: true, reason: null, remainingTurns: 0,
  });
});

test('a warrant from another system does not block the current port', () => {
  assert.deepEqual(wantedPortAccess({ 7: 17 }, 8, 12), {
    allowed: true, reason: null, remainingTurns: 0,
  });
});

test('attacking a remembered victim after paying a fine starts a new warrant', () => {
  assert.equal(shouldRecordSystemWanted({
    faction: 'fed', alreadyAggressed: true, wantedActive: false,
  }), true);
});

test('repeat hits on the same victim do not escalate an active warrant', () => {
  assert.equal(shouldRecordSystemWanted({
    faction: 'fed', alreadyAggressed: true, wantedActive: true,
  }), false);
});

test('a new faction victim escalates an active warrant', () => {
  assert.equal(shouldRecordSystemWanted({
    faction: 'mal', alreadyAggressed: false, wantedActive: true,
  }), true);
});

test('pirate and malformed targets never create an authority warrant', () => {
  assert.equal(shouldRecordSystemWanted({ faction: 'pir' }), false);
  assert.equal(shouldRecordSystemWanted({ faction: null }), false);
});

test('a repeated crime extends but never shortens an existing alert', () => {
  const existing = { 7: 30 };

  assert.deepEqual(recordSystemWanted(existing, 7, 12), { 7: 30 });
  assert.deepEqual(recordSystemWanted(existing, 7, 28), { 7: 35 });
  assert.deepEqual(existing, { 7: 30 });
});

test('a new victim during the same turn escalates an active warrant', () => {
  const initial = recordSystemWanted({}, 7, 12);

  assert.deepEqual(recordSystemWanted(initial, 7, 12), {
    7: 12 + SYSTEM_WANTED_TURNS + SYSTEM_WANTED_REPEAT_TURNS,
  });
});

test('repeat offense escalation is capped without shortening legacy warrants', () => {
  let wanted = { 7: 24 };

  wanted = recordSystemWanted(wanted, 7, 12);
  assert.deepEqual(wanted, { 7: 26 });
  wanted = recordSystemWanted(wanted, 7, 12);
  assert.deepEqual(wanted, { 7: 12 + SYSTEM_WANTED_MAX_TURNS });
  assert.deepEqual(recordSystemWanted(wanted, 7, 12), wanted);
  assert.deepEqual(recordSystemWanted({ 7: 40 }, 7, 12), { 7: 40 });
});

test('a crime after warrant expiry starts a fresh base duration', () => {
  assert.deepEqual(recordSystemWanted({ 7: 12 }, 7, 12), {
    7: 12 + SYSTEM_WANTED_TURNS,
  });
});

test('normalization keeps only serializable system alert entries', () => {
  assert.deepEqual(normalizeSystemWanted({ 2: '9', bad: 12, 3: -1, 4: Infinity }), { 2: 9 });
  assert.deepEqual(normalizeSystemWanted(null), {});
});

test('invalid crime context fails safely without inventing an alert', () => {
  assert.deepEqual(recordSystemWanted({ 2: 9 }, -1, 4), { 2: 9 });
  assert.deepEqual(recordSystemWanted({ 2: 9 }, 2, 4, 0), { 2: 9 });
  assert.equal(systemWantedStatus({ 2: 9 }, 2, 'bad').active, false);
});
