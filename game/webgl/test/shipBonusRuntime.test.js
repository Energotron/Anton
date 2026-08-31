import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShipBonusBreakdown, formatBonus, renderShipBonusHtml } from '../src/shipBonusRuntime.js';

test('breakdown compares equipped modules against starter equipment', () => {
  const result = buildShipBonusBreakdown({ P: { eq: { w: 1, e: 1, s: 1, h: 1, c: 1, r: 1 } } });
  assert.equal(result.rows.find(r => r.key === 'hull').bonus, 60);
  assert.equal(result.rows.find(r => r.key === 'engine').bonus, 30);
  assert.equal(result.rows.find(r => r.key === 'weapon').bonus, 3);
});

test('equipment value sums equipped catalog prices', () => {
  const result = buildShipBonusBreakdown({ P: { eq: { w: 1, e: 1, s: 1, h: 1, c: 1, r: 1 } } });
  assert.equal(result.equipmentValue, 8800);
});

test('invalid equipment indices safely fall back to starter modules', () => {
  const result = buildShipBonusBreakdown({ P: { eq: { w: 999, e: -2 } } });
  assert.equal(result.rows.find(r => r.key === 'weapon').bonus, 0);
  assert.equal(result.rows.find(r => r.key === 'engine').bonus, 0);
});

test('bonus formatter distinguishes starter baseline and positive upgrades', () => {
  assert.equal(formatBonus(0), 'база');
  assert.equal(formatBonus(15), '+15');
  assert.equal(formatBonus(-2), '-2');
});

test('rendered passport exposes equipment categories and total value', () => {
  const html = renderShipBonusHtml({ P: { eq: { w: 1, e: 1, s: 1, h: 1, c: 1, r: 1 } } });
  assert.match(html, /стоимость/);
  assert.match(html, /Корпус:/);
  assert.match(html, /Оружие:/);
});
