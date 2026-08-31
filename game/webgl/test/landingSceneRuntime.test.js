import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlanetType, landingSceneForType } from '../src/landingSceneRuntime.js';

test('detectPlanetType reads runtime dock detail tokens', () => {
  assert.equal(detectPlanetType('Система Тау · промышленная · ice'), 'ice');
  assert.equal(detectPlanetType('Система Эльтан · техномир · tech'), 'tech');
  assert.equal(detectPlanetType('Система Крон · шахтёрская · lava'), 'lava');
});

test('unknown landing type safely falls back to rock scene', () => {
  assert.equal(detectPlanetType('Система — неизвестный тип'), 'rock');
  assert.equal(landingSceneForType('unknown').asset, 'assets/landing/rock.svg');
});

test('every supported landing scene points at authored SVG art', () => {
  for (const type of ['rock', 'ice', 'lava', 'tech']) {
    const scene = landingSceneForType(type);
    assert.match(scene.asset, new RegExp(`/landing/${type}\\.svg$`));
    assert.ok(scene.title.length > 3);
    assert.ok(scene.ambience.length > 3);
  }
});
