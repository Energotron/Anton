import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_BOUNDS_MIN_RADIUS, clampCameraTarget, deriveCameraBounds } from '../src/cameraBoundsCore.js';

test('deriveCameraBounds covers the farthest planet plus margin', () => {
  const bounds = deriveCameraBounds({ planets: [{ orbit: 420, size: 30 }, { orbit: 1180, size: 55 }] }, { minRadius: 500, margin: 240 });
  assert.equal(bounds.radius, 1475);
  assert.equal(bounds.minX, -1475);
  assert.equal(bounds.maxY, 1475);
});

test('deriveCameraBounds keeps a safe minimum for sparse systems', () => {
  assert.equal(deriveCameraBounds({ planets: [] }).radius, CAMERA_BOUNDS_MIN_RADIUS);
});

test('deriveCameraBounds honors an explicit zero margin', () => {
  const bounds = deriveCameraBounds({ planets: [{ orbit: 1180, size: 55 }] }, { minRadius: 500, margin: 0 });
  assert.equal(bounds.radius, 1235);
});

test('clampCameraTarget preserves in-bounds coordinates', () => {
  assert.deepEqual(clampCameraTarget(200, -300, { minX: -900, maxX: 900, minY: -800, maxY: 800 }), { x: 200, y: -300 });
});

test('clampCameraTarget clamps overshoot and sanitizes invalid coordinates', () => {
  const bounds = { minX: -900, maxX: 900, minY: -800, maxY: 800 };
  assert.deepEqual(clampCameraTarget(5000, -5000, bounds), { x: 900, y: -800 });
  assert.deepEqual(clampCameraTarget(Number.NaN, Infinity, bounds), { x: 0, y: 0 });
});
