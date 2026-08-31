import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_PAN_CODES, buildCameraControlState } from '../src/cameraTouchRuntime.js';

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
