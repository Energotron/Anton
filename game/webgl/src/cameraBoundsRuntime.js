import { WebGLRenderer } from '../js/WebGLRenderer.js';
import { clampCameraTarget, deriveCameraBounds } from './cameraBoundsCore.js';

const PATCH_FLAG = Symbol.for('kr3.cameraBoundsRuntime.patched');

export function installCameraBoundsRuntime() {
  const proto = WebGLRenderer.prototype;
  if (proto[PATCH_FLAG]) return false;
  Object.defineProperty(proto, PATCH_FLAG, { value: true, configurable: false });

  const originalBuildSystemFromData = proto.buildSystemFromData;
  const originalSetCameraTarget = proto.setCameraTarget;

  proto.buildSystemFromData = function patchedBuildSystemFromData(systemData) {
    this.__kr3CameraBounds = deriveCameraBounds(systemData);
    return originalBuildSystemFromData.call(this, systemData);
  };

  proto.setCameraTarget = function patchedSetCameraTarget(x, y, shake = 0) {
    const bounds = this.__kr3CameraBounds || deriveCameraBounds(null);
    const target = clampCameraTarget(x, y, bounds);
    return originalSetCameraTarget.call(this, target.x, target.y, shake);
  };
  return true;
}

installCameraBoundsRuntime();
