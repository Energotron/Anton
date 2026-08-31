import test from 'node:test';
import assert from 'node:assert/strict';
import { courseSalvageContact, focusSalvageContact } from '../src/salvageRadarRuntime.js';

class FakePointerEvent {
  constructor(type, init) { this.type = type; Object.assign(this, init); }
}

function commandHarness() {
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
  return {
    win: { document: doc, PointerEvent: FakePointerEvent },
    dispatched: () => dispatched,
    followClicks: () => followClicks,
  };
}

test('focusSalvageContact reuses the minimap shift-click camera path', () => {
  const harness = commandHarness();
  const save = { P: { x: 0, y: 0, radar: 700 } };

  assert.equal(focusSalvageContact(harness.win, save, { x: 350, y: -175 }), true);
  const dispatched = harness.dispatched();
  assert.equal(harness.followClicks(), 1);
  assert.equal(dispatched.type, 'pointerdown');
  assert.equal(dispatched.shiftKey, true);
  assert.equal(dispatched.clientX, 394);
  assert.equal(dispatched.clientY, 122);
});

test('courseSalvageContact reuses the normal minimap course path', () => {
  const harness = commandHarness();
  const save = { P: { x: 0, y: 0, radar: 700 } };

  assert.equal(courseSalvageContact(harness.win, save, { x: 350, y: -175 }), true);
  const dispatched = harness.dispatched();
  assert.equal(harness.followClicks(), 1);
  assert.equal(dispatched.type, 'pointerdown');
  assert.equal(dispatched.shiftKey, false);
  assert.equal(dispatched.clientX, 394);
  assert.equal(dispatched.clientY, 122);
});

test('salvage minimap commands fail safely when target cannot map to the minimap', () => {
  const win = { document: { getElementById: () => null }, PointerEvent: FakePointerEvent };
  const save = { P: { x: 0, y: 0, radar: 700 } };
  assert.equal(focusSalvageContact(win, save, { x: 100, y: 0 }), false);
  assert.equal(courseSalvageContact(win, save, { x: 100, y: 0 }), false);
});
