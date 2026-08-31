import test from 'node:test';
import assert from 'node:assert/strict';
import { soundButtonState } from '../src/audioRuntimeGuard.js';

test('sound icon describes current state rather than requested action', () => {
  const on = soundButtonState('🔊');
  assert.equal(on.muted, false);
  assert.equal(on.title, 'Выключить звук');
  const off = soundButtonState('🔇');
  assert.equal(off.muted, true);
  assert.equal(off.title, 'Включить звук');
});
