import test from 'node:test';
import assert from 'node:assert/strict';
import { installModalEscapeRuntime, routeModalEscape } from '../src/modalEscapeRuntime.js';

function panel(hidden = false) {
  return { classList: { contains: name => hidden && name === 'hidden' } };
}

test('Escape routing prefers the task back action when multiple modal controls exist', () => {
  const clicks = [];
  const nodes = {
    panel: panel(false),
    questBack: { click: () => clicks.push('quest') },
    commsClose: { click: () => clicks.push('comms') },
  };
  const doc = { getElementById: id => nodes[id] || null };
  assert.equal(routeModalEscape(doc), true);
  assert.deepEqual(clicks, ['quest']);
});

test('Escape routing does nothing while the shared panel is hidden', () => {
  let clicked = false;
  const doc = {
    getElementById: id => id === 'panel' ? panel(true) : id === 'questBack' ? { click: () => { clicked = true; } } : null,
  };
  assert.equal(routeModalEscape(doc), false);
  assert.equal(clicked, false);
});

test('installed key handler consumes Escape only after a modal recovery action succeeds', () => {
  let handler = null;
  let clicked = 0;
  const nodes = { panel: panel(false), commsClose: { click: () => { clicked++; } } };
  const doc = {
    documentElement: { dataset: {} },
    getElementById: id => nodes[id] || null,
    addEventListener: (type, fn) => { if (type === 'keydown') handler = fn; },
  };
  assert.equal(installModalEscapeRuntime({ document: doc }), true);
  const event = {
    key: 'Escape',
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
  };
  handler(event);
  assert.equal(clicked, 1);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
});
