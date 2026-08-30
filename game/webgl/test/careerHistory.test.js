import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, careerSnapshot, readCareer, formatCareer } from '../src/careerHistory.js';

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
