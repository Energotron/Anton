import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_FOLLOW_CODE,
  CAMERA_PAN_CODES,
  CAMERA_PAN_HOLD,
  buildCameraControlState,
  cameraPanPulseCount,
  shouldFallbackCameraFollow
} from '../src/cameraTouchRuntime.js';

test('camera pan directions map to existing runtime navigation keys', () => {
  assert.deepEqual(CAMERA_PAN_CODES, { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });
});

test('minimap mode clearly separates ship course from camera focus', () => {
  const course = buildCameraControlState(false);
  const camera = buildCameraControlState(true);
  assert.equal(course.minimapCameraMode, false);
  assert.match(course.modeLabel, /Курс/);
  assert.equal(camera.minimapCameraMode, true);
  assert.match(camera.modeTitle, /камерой/);
});

test('short camera tap remains exactly one pan pulse', () => {
  assert.equal(cameraPanPulseCount(0), 1);
  assert.equal(cameraPanPulseCount(CAMERA_PAN_HOLD.delayMs - 1), 1);
});

test('holding a camera arrow repeats pan pulses at a bounded cadence', () => {
  assert.equal(cameraPanPulseCount(CAMERA_PAN_HOLD.delayMs), 2);
  assert.equal(cameraPanPulseCount(CAMERA_PAN_HOLD.delayMs + CAMERA_PAN_HOLD.repeatMs), 3);
  assert.equal(cameraPanPulseCount(1000), 11);
});

test('touch follow fallback uses the existing runtime camera-toggle key only after touch free-pan', () => {
  assert.equal(CAMERA_FOLLOW_CODE, 'KeyC');
  assert.equal(shouldFallbackCameraFollow(false, true), true);
  assert.equal(shouldFallbackCameraFollow(false, false), false);
  assert.equal(shouldFallbackCameraFollow(true, true), false);
});
