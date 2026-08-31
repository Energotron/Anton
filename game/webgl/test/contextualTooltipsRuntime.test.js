import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_TOOLTIPS,
  tooltipForControl,
  applyTooltipToElement
} from '../src/contextualTooltipsRuntime.js';

test('core gameplay controls have explanatory tooltips', () => {
  for (const id of ['mm', 'bTurn', 'bWait', 'bMis', 'barHull', 'barShield', 'res', 'dayRank']) {
    assert.equal(typeof CORE_TOOLTIPS[id], 'string');
    assert.ok(CORE_TOOLTIPS[id].length > 35, `${id} should explain behavior, not just label it`);
  }
});

test('dynamic market and equipment controls resolve contextual effects', () => {
  assert.match(tooltipForControl({ dataset: { buyg: 'food' } }), /трюм/i);
  assert.match(tooltipForControl({ dataset: { sellg: 'ore' } }), /продать/i);
  assert.match(tooltipForControl({ dataset: { buy: '2,1' } }), /установ/i);
  assert.match(tooltipForControl({ dataset: { take: '0' } }), /дедлайн|срок/i);
});

test('dynamic service buttons explain their gameplay consequence', () => {
  assert.match(tooltipForControl({ text: '🛠️ Ремонт — 120 кр.' }), /корпус/i);
  assert.match(tooltipForControl({ text: '⛽ Полный бак — 90 кр.' }), /гиперпрыж/i);
  assert.match(tooltipForControl({ text: '🗺 Гиперкарта (M)' }), /топлив/i);
  assert.match(tooltipForControl({ text: '🚀 Взлёт' }), /обычный космос/i);
});

test('applyTooltipToElement sets title, tooltip data and accessible button label', () => {
  const attrs = new Map();
  const el = {
    id: 'bTurn',
    tagName: 'BUTTON',
    textContent: 'ХОД ▶',
    dataset: {},
    setAttribute(key, value) { attrs.set(key, value); },
    getAttribute(key) { return attrs.get(key) || null; }
  };
  assert.equal(applyTooltipToElement(el), true);
  assert.equal(attrs.get('title'), CORE_TOOLTIPS.bTurn);
  assert.equal(attrs.get('data-kr3-tooltip'), CORE_TOOLTIPS.bTurn);
  assert.match(attrs.get('aria-label'), /ХОД.*заверш/i);
});
