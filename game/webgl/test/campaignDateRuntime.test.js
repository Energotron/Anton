import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_CAMPAIGN_YEAR,
  migrateLegacyCampaignSave,
  migrateSlot,
  runCanonicalNewGame,
} from '../src/campaignDateRuntime.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

test('migrates a legacy 3500-era save by preserving elapsed campaign time', () => {
  const input = { v: 2, dateStr: '17.04.3502', G: { date: { year: 3502, month: 4, day: 17 }, day: 837 }, P: {} };
  const { data, migrated } = migrateLegacyCampaignSave(input);
  assert.equal(migrated, true);
  assert.deepEqual(data.G.date, { year: 3552, month: 4, day: 17 });
  assert.equal(data.dateStr, '17.04.3552');
  assert.equal(data.G.day, 837);
  assert.equal(data.calendarEpoch, CANONICAL_CAMPAIGN_YEAR);
  assert.equal(input.G.date.year, 3502, 'input must not be mutated');
});

test('does not shift canonical or future saves twice', () => {
  const input = { dateStr: '01.01.3550', G: { date: { year: 3550, month: 1, day: 1 } } };
  const { data, migrated } = migrateLegacyCampaignSave(input);
  assert.equal(migrated, false);
  assert.equal(data.G.date.year, 3550);
});

test('migrateSlot updates save and slot metadata together', () => {
  const storage = memoryStorage({
    kr3_save_slot2: JSON.stringify({ dateStr: '09.02.3501', G: { date: { year: 3501, month: 2, day: 9 } }, P: {} }),
    kr3_save_meta_slot2: JSON.stringify({ dateStr: '09.02.3501', sys: 'Тест' }),
  });
  assert.equal(migrateSlot(storage, 2), true);
  assert.equal(JSON.parse(storage.getItem('kr3_save_slot2')).dateStr, '09.02.3551');
  assert.equal(JSON.parse(storage.getItem('kr3_save_meta_slot2')).dateStr, '09.02.3551');
});

test('new-game bridge reaches canonical date without destroying the previous save', () => {
  const oldSave = JSON.stringify({ dateStr: '05.03.3554', G: { date: { year: 3554, month: 3, day: 5 } }, P: {} });
  const oldMeta = JSON.stringify({ dateStr: '05.03.3554' });
  const storage = memoryStorage({ kr3_save_slot0: oldSave, kr3_save_meta: oldMeta, kr3_active_save_slot: '0' });
  let loadedYear = null;
  const win = {
    localStorage: storage,
    document: {
      getElementById(id) {
        if (id === 'contBtn') return { style: {}, textContent: '' };
        if (id === 'toasts') return { innerHTML: 'temp' };
        return null;
      },
    },
  };
  const temp = { dateStr: '01.01.3500', G: { date: { year: 3500, month: 1, day: 1 } }, P: {} };
  const originals = {
    startNewGame() {},
    saveGame() {
      storage.setItem('kr3_save_slot0', JSON.stringify(temp));
      storage.setItem('kr3_save_meta', JSON.stringify({ dateStr: temp.dateStr }));
    },
    loadGame() {
      loadedYear = JSON.parse(storage.getItem('kr3_save_slot0')).G.date.year;
      return true;
    },
  };
  assert.equal(runCanonicalNewGame(win, originals), true);
  assert.equal(loadedYear, 3550);
  assert.equal(storage.getItem('kr3_save_slot0'), oldSave);
  assert.equal(storage.getItem('kr3_save_meta'), oldMeta);
});
