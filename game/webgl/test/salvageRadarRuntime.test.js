import test from 'node:test';
import assert from 'node:assert/strict';
import { focusSalvageContact } from '../src/salvageRadarRuntime.js';

class FakePointerEvent {
  constructor(type, init) { this.type = type; Object.assign(this, init); }
}

test('focusSalvageContact reuses the minimap shift-click camera path', () => {
  let followClicks = 0;
  let dispatched = null;
  const minimap = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 528, height: 264 }),
    dispatchEvent: event => { dispatched = event; }
  };
  const doc = {
    getElementById(id) {
      if (id === 'mm') return minimap;
      if (id === 'ctxCam') return { click: () => { followClicks++; } };
      return null;
    }
  };
  const win = { document: doc, PointerEvent: FakePointerEvent };
  const save = { P: { x: 0, y: 0, radar: 700 } };

  assert.equal(focusSalvageContact(win, save, { x: 350, y: -175 }), true);
  assert.equal(followClicks, 1);
  assert.equal(dispatched.type, 'pointerdown');
  assert.equal(dispatched.shiftKey, true);
  assert.equal(dispatched.clientX, 394);
  assert.equal(dispatched.clientY, 122);
});

test('focusSalvageContact fails safely when target cannot map to the minimap', () => {
  const win = { document: { getElementById: () => null }, PointerEvent: FakePointerEvent };
  assert.equal(focusSalvageContact(win, { P: { x: 0, y: 0, radar: 700 } }, { x: 100, y: 0 }), false);
});
