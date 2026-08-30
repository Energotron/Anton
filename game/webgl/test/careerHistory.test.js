import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_KEY, CAREER_HISTORY_KEY, CAREER_HISTORY_LIMIT,
  careerSnapshot, readCareer, readCareerHistory, recordCareerSnapshot,
  formatCareer, formatCareerTimeline,
} from '../src/careerHistory.js';

test('career snapshot exposes ranger progress and reputation from canonical save', () => {
  const save = {
    dateStr: '14.02.3500',
    P: { money: 12500, kills: 7, xp: 240, rep: { fed: 12, pir: -35 } },
    G: { turn: 45, sysId: 2, visited: [0, 2, 5] },
    systems: [{ id: 0, name: 'Альфа' }, { id: 2, name: 'Вега' }, { id: 5, name: 'Тау' }],
  };
  assert.deepEqual(careerSnapshot(save), {
    date: '14.02.3500', turn: 45, system: 'Вега', money: 12500,
    kills: 7, xp: 240, visited: 3, totalSystems: 3,
    reputation: { fed: 12, pir: -35 },
  });
});

test('career reader tolerates missing and corrupt saves', () => {
  assert.equal(readCareer({ getItem: () => null }), null);
  assert.equal(readCareer({ getItem: () => '{bad json' }), null);
  const storage = { getItem: key => key === SAVE_KEY ? JSON.stringify({ P: {}, G: {}, systems: [] }) : null };
  assert.ok(readCareer(storage));
});

test('career formatter gives readable persistent history', () => {
  const text = formatCareer({ date: '01.01.3500', turn: 1, system: 'Терра', money: 8000, xp: 0, kills: 0, visited: 1, totalSystems: 70, reputation: { fed: 10 } }, { fed: 'Федерация' });
  assert.match(text, /Посещено 1\/70/);
  assert.match(text, /Федерация: \+10/);
});

test('career history persists distinct snapshots and deduplicates identical saves', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const first = { date: '01.01.3500', turn: 1, system: 'Терра', money: 8000, xp: 0, kills: 0, visited: 1, totalSystems: 70, reputation: { fed: 10 } };
  const second = { ...first, turn: 2, money: 8100 };
  assert.equal(recordCareerSnapshot(storage, first), true);
  assert.equal(recordCareerSnapshot(storage, first), false);
  assert.equal(recordCareerSnapshot(storage, second), true);
  assert.deepEqual(readCareerHistory(storage), [first, second]);
  assert.ok(values.has(CAREER_HISTORY_KEY));
});

test('career history is bounded and timeline presents newest milestone first', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  for (let turn = 1; turn <= CAREER_HISTORY_LIMIT + 5; turn++) {
    recordCareerSnapshot(storage, { date: `${turn}.01.3500`, turn, system: `S${turn}`, money: turn, xp: turn, kills: 0, visited: 1, totalSystems: 70, reputation: {} });
  }
  const history = readCareerHistory(storage);
  assert.equal(history.length, CAREER_HISTORY_LIMIT);
  assert.equal(history[0].turn, 6);
  assert.match(formatCareerTimeline(history), new RegExp(`ход ${CAREER_HISTORY_LIMIT + 5}`));
  assert.ok(formatCareerTimeline(history).indexOf(`ход ${CAREER_HISTORY_LIMIT + 5}`) < formatCareerTimeline(history).indexOf(`ход ${CAREER_HISTORY_LIMIT + 4}`));
});
