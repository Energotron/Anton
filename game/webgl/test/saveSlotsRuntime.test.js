import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSlot, saveKey, metaKey, formatSlotMeta, slotHasSave, syncSelectedSlotToLegacy, activateSlotForLoad, ACTIVE_SLOT_KEY, LEGACY_SAVE_KEY, LEGACY_META_KEY } from '../src/saveSlotsRuntime.js';

test('normalizes save slots safely', () => {
  assert.equal(normalizeSlot(0), 0);
  assert.equal(normalizeSlot('4'), 4);
  assert.equal(normalizeSlot(5), 0);
  assert.equal(normalizeSlot(-1), 0);
});

test('preserves legacy slot zero keys', () => {
  assert.equal(saveKey(0), 'kr3_save_slot0');
  assert.equal(metaKey(0), 'kr3_save_meta');
});

test('uses independent keys for extra slots', () => {
  assert.equal(saveKey(3), 'kr3_save_slot3');
  assert.equal(metaKey(3), 'kr3_save_meta_slot3');
});

test('formats empty and populated slot summaries', () => {
  assert.match(formatSlotMeta(1, null), /пусто/);
  assert.match(formatSlotMeta(1, { dateStr: '01.01.3500', sys: 'Солнце', money: 9000 }), /Солнце/);
});

test('recognizes save payload even when metadata is missing', () => {
  const values = new Map([[saveKey(2), '{"sys":4,"day":18}']]);
  const storage = { getItem: key => values.has(key) ? values.get(key) : null };
  assert.equal(slotHasSave(2, storage), true);
  assert.equal(slotHasSave(3, storage), false);
  assert.match(formatSlotMeta(2, {}), /неизвестная система/);
});

test('rejects malformed and non-object save payloads', () => {
  for (const raw of ['{broken', 'null', '42', '"save"', '[1,2]']) {
    const values = new Map([[saveKey(2), raw]]);
    const storage = { getItem: key => values.has(key) ? values.get(key) : null };
    assert.equal(slotHasSave(2, storage), false, raw);
  }
});

test('does not mirror a corrupt extra slot into legacy continue state', () => {
  const values = new Map([
    [saveKey(2), '{broken'],
    [metaKey(2), '{"sys":"Солнце"}'],
    [LEGACY_SAVE_KEY, '{"stale":true}'],
    [LEGACY_META_KEY, '{"sys":"Старая"}']
  ]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  assert.equal(syncSelectedSlotToLegacy(2, storage), false);
  assert.equal(storage.getItem(LEGACY_SAVE_KEY), null);
  assert.equal(storage.getItem(LEGACY_META_KEY), null);
});

test('clears stale legacy mirror when selected extra slot has no save', () => {
  const values = new Map([
    [LEGACY_SAVE_KEY, '{"stale":true}'],
    [LEGACY_META_KEY, '{"sys":"Солнце"}']
  ]);
  const storage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };

  assert.equal(syncSelectedSlotToLegacy(2, storage), false);
  assert.equal(storage.getItem(LEGACY_SAVE_KEY), null);
  assert.equal(storage.getItem(LEGACY_META_KEY), null);
});

test('clears corrupt legacy slot zero before continue can consume it', () => {
  const values = new Map([
    [LEGACY_SAVE_KEY, '{broken'],
    [LEGACY_META_KEY, '{"sys":"Старая"}']
  ]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };

  assert.equal(syncSelectedSlotToLegacy(0, storage), false);
  assert.equal(storage.getItem(LEGACY_SAVE_KEY), null);
  assert.equal(storage.getItem(LEGACY_META_KEY), null);
});

test('switching loads does not overwrite the previously active extra slot', () => {
  const slotOneSave = '{"slot":1,"credits":111}';
  const slotTwoSave = '{"slot":2,"credits":222}';
  const values = new Map([
    [ACTIVE_SLOT_KEY, '1'],
    [saveKey(1), slotOneSave],
    [metaKey(1), '{"sys":"Старая"}'],
    [saveKey(2), slotTwoSave],
    [metaKey(2), '{"sys":"Новая"}']
  ]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => {
      values.set(key, String(value));
      const active = normalizeSlot(values.get(ACTIVE_SLOT_KEY));
      if (active === 0) return;
      if (key === LEGACY_SAVE_KEY) values.set(saveKey(active), String(value));
      if (key === LEGACY_META_KEY) values.set(metaKey(active), String(value));
    },
    removeItem: key => values.delete(key)
  };

  assert.equal(activateSlotForLoad(2, storage), true);
  assert.equal(storage.getItem(ACTIVE_SLOT_KEY), '2');
  assert.equal(storage.getItem(LEGACY_SAVE_KEY), slotTwoSave);
  assert.equal(storage.getItem(saveKey(1)), slotOneSave);
  assert.equal(storage.getItem(saveKey(2)), slotTwoSave);
});
