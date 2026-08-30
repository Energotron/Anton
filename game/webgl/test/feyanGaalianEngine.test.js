import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINES, SHOPCATS } from '../js/data.js';

test('Feyan-Gaalian probability drive extends late-game engine progression without shifting prior tiers', () => {
  assert.equal(ENGINES.length, 7);
  assert.deepEqual(
    ENGINES.slice(0, 6).map(engine => engine.n),
    [
      'Ионный двигатель',
      'Плазменный двигатель',
      'Термоядерный двигатель',
      'Гиперпоточный двигатель',
      'Гравитонный двигатель',
      'Двигатель «Шторм»',
    ],
  );

  const drive = ENGINES[6];
  assert.equal(drive.n, 'Фейян-гаальский вероятностный привод');
  assert.equal(drive.spd, 430);
  assert.equal(drive.p, 76000);
  assert.ok(drive.spd > ENGINES[5].spd);
  assert.ok(drive.p > ENGINES[5].p);

  const engineShop = SHOPCATS.find(category => category.key === 'e');
  assert.equal(engineShop.arr, ENGINES);
  assert.equal(engineShop.arr.at(-1), drive);
});
