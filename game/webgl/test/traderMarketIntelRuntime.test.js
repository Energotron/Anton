import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraderMarketTip } from '../src/traderMarketIntelRuntime.js';

function save(planets) {
  return { G: { sysId: 7 }, systems: [{ id: 7, name: 'Сириус', planets }] };
}

test('selects the strongest real price margin across current-system ports', () => {
  const tip = buildTraderMarketTip(save([
    { name: 'Агрос', hasPort: true, prices: { food: 30, ore: 80 } },
    { name: 'Фордж', hasPort: true, prices: { food: 75, ore: 100 } },
  ]));
  assert.equal(tip.goodId, 'food');
  assert.equal(tip.buyPlanet, 'Агрос');
  assert.equal(tip.sellPlanet, 'Фордж');
  assert.equal(tip.profitPerUnit, 45);
  assert.equal(tip.marginPercent, 150);
  assert.match(tip.text, /Продовольствие/);
});

test('ignores non-port planets even when they have attractive prices', () => {
  const tip = buildTraderMarketTip(save([
    { name: 'Дикий мир', hasPort: false, prices: { ore: 1 } },
    { name: 'Шахта', hasPort: true, prices: { ore: 60 } },
    { name: 'Верфь', hasPort: true, prices: { ore: 90 } },
  ]));
  assert.equal(tip.goodId, 'ore');
  assert.equal(tip.buyPrice, 60);
  assert.equal(tip.sellPrice, 90);
});

test('returns null when fewer than two priced ports are available', () => {
  assert.equal(buildTraderMarketTip(save([{ name: 'Один', hasPort: true, prices: { food: 40 } }])), null);
});

test('returns null when no profitable inter-port spread exists', () => {
  assert.equal(buildTraderMarketTip(save([
    { name: 'А', hasPort: true, prices: { food: 40 } },
    { name: 'Б', hasPort: true, prices: { food: 40 } },
  ])), null);
});
