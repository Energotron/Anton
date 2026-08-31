import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SALVAGE_PERSISTENCE_VERSION,
  attachSalvagePersistenceToSave,
  createSalvagePersistence,
  extractSalvagePersistenceFromSave,
  normalizeSalvagePersistence,
  normalizeSalvageRecord,
  serializeSalvageRecords
} from '../src/salvagePersistenceCore.js';

test('normalizeSalvageRecord keeps only serializable live salvage fields', () => {
  const record = normalizeSalvageRecord({
    id: 'salvage-7', goodId: 'mach', amount: 3.9, sourceUid: 17, sourceType: 'raider',
    x: 120.5, y: -44, mesh: { shouldNotPersist: true }, pulse: 9
  });
  assert.deepEqual(record, {
    id: 'salvage-7', goodId: 'mach', amount: 3, sourceUid: 17, sourceType: 'raider', x: 120.5, y: -44
  });
});

test('serializeSalvageRecords rejects exhausted, malformed and unknown drops', () => {
  const records = serializeSalvageRecords([
    { id: 'ok', goodId: 'ore', amount: 2, x: 10, y: 20 },
    { id: 'empty', goodId: 'ore', amount: 0, x: 1, y: 2 },
    { id: 'bad-good', goodId: 'contraband', amount: 1, x: 1, y: 2 },
    { id: 'bad-pos', goodId: 'weap', amount: 1, x: 'nope', y: 2 }
  ]);
  assert.deepEqual(records, [
    { id: 'ok', goodId: 'ore', amount: 2, sourceUid: null, sourceType: null, x: 10, y: 20 }
  ]);
});

test('normalizeSalvagePersistence sanitizes systems and keeps per-system separation', () => {
  const state = normalizeSalvagePersistence({
    version: 99,
    systems: {
      2: [{ id: 'a', goodId: 'weap', amount: 1, x: 5, y: 6 }],
      7: [{ id: 'b', goodId: 'ore', amount: 4, x: -8, y: 12 }],
      nope: [{ id: 'x', goodId: 'ore', amount: 1, x: 0, y: 0 }],
      9: [{ id: 'dead', goodId: 'mach', amount: 0, x: 0, y: 0 }]
    }
  });
  assert.equal(state.version, SALVAGE_PERSISTENCE_VERSION);
  assert.deepEqual(Object.keys(state.systems), ['2', '7']);
  assert.equal(state.systems['7'][0].amount, 4);
});

test('createSalvagePersistence produces a compact versioned save payload', () => {
  const state = createSalvagePersistence({
    3: [{ id: 'c', goodId: 'mach', amount: 2, sourceUid: 55, sourceType: 'pirate', x: 1, y: 2 }]
  });
  assert.deepEqual(state, {
    version: SALVAGE_PERSISTENCE_VERSION,
    systems: {
      3: [{ id: 'c', goodId: 'mach', amount: 2, sourceUid: 55, sourceType: 'pirate', x: 1, y: 2 }]
    }
  });
});

test('attachSalvagePersistenceToSave adds sanitized salvage without mutating the save object', () => {
  const save = { savedAt: 123, G: { sysId: 4 } };
  const attached = attachSalvagePersistenceToSave(save, {
    systems: {
      4: [{ id: 'live', goodId: 'ore', amount: 2, x: 8, y: 9 }],
      5: [{ id: 'bad', goodId: 'ore', amount: 0, x: 1, y: 2 }]
    }
  });
  assert.equal(save.salvagePersistence, undefined);
  assert.deepEqual(attached.salvagePersistence.systems, {
    4: [{ id: 'live', goodId: 'ore', amount: 2, sourceUid: null, sourceType: null, x: 8, y: 9 }]
  });
});

test('extractSalvagePersistenceFromSave tolerates legacy and malformed saves', () => {
  assert.deepEqual(extractSalvagePersistenceFromSave({ v: 2 }), {
    version: SALVAGE_PERSISTENCE_VERSION,
    systems: {}
  });
  assert.deepEqual(extractSalvagePersistenceFromSave({
    salvagePersistence: {
      version: 999,
      systems: { 2: [{ goodId: 'weap', amount: 1, x: -3, y: 6 }] }
    }
  }).systems, {
    2: [{ id: null, goodId: 'weap', amount: 1, sourceUid: null, sourceType: null, x: -3, y: 6 }]
  });
});
