import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSlot, saveKey, metaKey, formatSlotMeta } from '../src/saveSlotsRuntime.js';

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
