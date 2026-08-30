export const TAU = Math.PI * 2;
export function rnd(a, b) { return a + Math.random() * (b - a); }
export function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
export function pick(a) { return (a && a.length) ? a[Math.floor(Math.random() * a.length)] : null; }
export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
export function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
export function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
export function mulberry(s) {
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
