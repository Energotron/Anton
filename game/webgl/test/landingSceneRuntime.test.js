import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlanetType, isDockReturnTarget, isTapGesture, landingSceneForType, returnQuestPanelToDock } from '../src/landingSceneRuntime.js';

test('detectPlanetType reads runtime dock detail tokens', () => {
  assert.equal(detectPlanetType('Система Тау · промышленная · ice'), 'ice');
  assert.equal(detectPlanetType('Система Эльтан · техномир · tech'), 'tech');
  assert.equal(detectPlanetType('Система Крон · шахтёрская · lava'), 'lava');
});

test('unknown landing type safely falls back to rock scene', () => {
  assert.equal(detectPlanetType('Система — неизвестный тип'), 'rock');
  assert.match(landingSceneForType('unknown').asset, /\/landing\/rock\.svg$/);
});

test('every supported landing scene points at authored SVG art', () => {
  for (const type of ['rock', 'ice', 'lava', 'tech']) {
    const scene = landingSceneForType(type);
    assert.match(scene.asset, new RegExp(`/landing/${type}\\.svg$`));
    assert.ok(scene.title.length > 3);
    assert.ok(scene.ambience.length > 3);
  }
});

test('dock return fallback recognizes quest, market, equipment and info-center exits', () => {
  const target = id => ({ closest: selector => selector.split(',').includes(`#${id}`) ? { id } : null });
  assert.equal(isDockReturnTarget(target('questBack')), true);
  assert.equal(isDockReturnTarget(target('tradeBack')), true);
  assert.equal(isDockReturnTarget(target('shipClose')), true);
  assert.equal(isDockReturnTarget(target('infoClose')), true);
  assert.equal(isDockReturnTarget(target('helpClose')), false);
});

test('dock return fallback accepts a tap but rejects drag and mismatched pointers', () => {
  const start = { pointerId: 7, clientX: 100, clientY: 80 };
  assert.equal(isTapGesture(start, { pointerId: 7, clientX: 108, clientY: 86 }), true);
  assert.equal(isTapGesture(start, { pointerId: 7, clientX: 130, clientY: 80 }), false);
  assert.equal(isTapGesture(start, { pointerId: 8, clientX: 100, clientY: 80 }), false);
});

test('dock return fallback returns through the live dock context action', () => {
  let clicks = 0;
  const doc = {
    getElementById(id) {
      return id === 'ctxDock' ? { click: () => { clicks += 1; } } : null;
    }
  };
  assert.equal(returnQuestPanelToDock(doc), true);
  assert.equal(clicks, 1);
  assert.equal(returnQuestPanelToDock({ getElementById: () => null }), false);
});
