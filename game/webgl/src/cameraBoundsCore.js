export const CAMERA_BOUNDS_MIN_RADIUS = 980;
export const CAMERA_BOUNDS_MARGIN = 360;

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function deriveCameraBounds(systemData, options = {}) {
  const minRadius = Math.max(200, finiteOr(options.minRadius, CAMERA_BOUNDS_MIN_RADIUS));
  const margin = Math.max(0, finiteOr(options.margin, CAMERA_BOUNDS_MARGIN));
  const planets = Array.isArray(systemData?.planets) ? systemData.planets : [];
  let extent = 0;
  for (const planet of planets) {
    const orbit = Math.abs(Number(planet?.orbit));
    const size = Math.max(0, finiteOr(planet?.size, 0));
    if (Number.isFinite(orbit)) extent = Math.max(extent, orbit + size);
  }
  const radius = Math.max(minRadius, extent + margin);
  return { minX: -radius, maxX: radius, minY: -radius, maxY: radius, radius };
}

export function clampCameraTarget(x, y, bounds) {
  const bx = bounds || deriveCameraBounds(null);
  const nx = Number(x);
  const ny = Number(y);
  const safeX = Number.isFinite(nx) ? nx : 0;
  const safeY = Number.isFinite(ny) ? ny : 0;
  return {
    x: Math.min(bx.maxX, Math.max(bx.minX, safeX)),
    y: Math.min(bx.maxY, Math.max(bx.minY, safeY))
  };
}
