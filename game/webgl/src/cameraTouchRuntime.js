export const CAMERA_PAN_CODES = Object.freeze({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });
export const CAMERA_PAN_HOLD = Object.freeze({ delayMs: 220, repeatMs: 85 });
export const CAMERA_FOLLOW_CODE = 'KeyC';

export function buildCameraControlState(active = false) {
  return {
    minimapCameraMode: Boolean(active),
    modeLabel: active ? '🗺️ Камера' : '🛰️ Курс',
    modeTitle: active ? 'Миникарта управляет камерой' : 'Миникарта задаёт курс кораблю',
  };
}

export function makeCameraKeyEvent(win, code) {
  return new win.KeyboardEvent('keydown', { code, key: code, shiftKey: true, bubbles: true, cancelable: true });
}

export function makeCameraFollowKeyEvent(win) {
  return new win.KeyboardEvent('keydown', { code: CAMERA_FOLLOW_CODE, key: 'c', bubbles: true, cancelable: true });
}

export function shouldFallbackCameraFollow(hasRuntimeFollow, touchCameraFree) {
  return !hasRuntimeFollow && Boolean(touchCameraFree);
}

export function cameraPanPulseCount(heldMs, profile = CAMERA_PAN_HOLD) {
  const duration = Math.max(0, Number(heldMs) || 0);
  const delay = Math.max(0, Number(profile?.delayMs) || 0);
  const repeat = Math.max(1, Number(profile?.repeatMs) || 1);
  if (duration < delay) return 1;
  return 2 + Math.floor((duration - delay) / repeat);
}

export function installCameraTouchControls(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.getElementById('cameraTouchControls')) return false;
  const hud = doc.getElementById('hud');
  const minimap = doc.getElementById('mm');
  if (!hud || !minimap) return false;

  const style = doc.createElement('style');
  style.id = 'cameraTouchControlsStyle';
  style.textContent = `
    #cameraTouchControls{position:fixed;left:max(10px,env(safe-area-inset-left));bottom:max(92px,calc(env(safe-area-inset-bottom) + 78px));z-index:12;display:grid;grid-template-columns:42px 42px 42px;gap:4px;align-items:center;justify-items:center;user-select:none;-webkit-user-select:none;touch-action:none}
    #cameraTouchControls.hidden{display:none}
    #cameraTouchControls button{width:42px;height:42px;border:1px solid rgba(125,216,255,.55);border-radius:10px;background:rgba(5,12,28,.84);color:#d9efff;font-size:18px;box-shadow:0 0 12px rgba(80,150,255,.18);touch-action:none}
    #cameraTouchControls .wide{grid-column:1/4;width:134px;font-size:11px;letter-spacing:.03em}
    #cameraTouchControls .modeOn{border-color:#ffd77a;color:#ffd77a}
    #cameraTouchControls [data-pan].holding{border-color:#7ee787;color:#7ee787;box-shadow:0 0 16px rgba(126,231,135,.28)}
    @media (pointer:fine) and (min-width:900px){#cameraTouchControls{opacity:.42}#cameraTouchControls:hover{opacity:1}}
  `;
  doc.head?.appendChild(style);

  const root = doc.createElement('div');
  root.id = 'cameraTouchControls';
  root.className = hud.classList.contains('hidden') ? 'hidden' : '';
  root.innerHTML = `
    <span></span><button type="button" data-pan="up" aria-label="Камера вверх" title="Камера вверх · удерживайте для непрерывного обзора">▲</button><span></span>
    <button type="button" data-pan="left" aria-label="Камера влево" title="Камера влево · удерживайте для непрерывного обзора">◀</button><button type="button" id="cameraFollowBtn" aria-label="Вернуть камеру к кораблю">◎</button><button type="button" data-pan="right" aria-label="Камера вправо" title="Камера вправо · удерживайте для непрерывного обзора">▶</button>
    <span></span><button type="button" data-pan="down" aria-label="Камера вниз" title="Камера вниз · удерживайте для непрерывного обзора">▼</button><span></span>
    <button type="button" class="wide" id="cameraMinimapModeBtn">🛰️ Курс</button>`;
  doc.body.appendChild(root);

  let state = buildCameraControlState(false);
  let touchCameraFree = false;
  const modeBtn = doc.getElementById('cameraMinimapModeBtn');
  const syncMode = () => {
    modeBtn.textContent = state.modeLabel;
    modeBtn.title = state.modeTitle;
    modeBtn.classList.toggle('modeOn', state.minimapCameraMode);
    modeBtn.setAttribute('aria-pressed', String(state.minimapCameraMode));
  };
  syncMode();

  const activeHolds = new Map();
  const pulseCameraPan = code => {
    if (!code) return;
    touchCameraFree = true;
    win.dispatchEvent(makeCameraKeyEvent(win, code));
    win.dispatchEvent(new win.KeyboardEvent('keyup', { code, key: code, bubbles: true }));
  };
  const stopCameraPan = pointerId => {
    const hold = activeHolds.get(pointerId);
    if (!hold) return;
    if (hold.delayTimer) win.clearTimeout(hold.delayTimer);
    if (hold.repeatTimer) win.clearInterval(hold.repeatTimer);
    hold.button.classList.remove('holding');
    activeHolds.delete(pointerId);
  };

  root.querySelectorAll('[data-pan]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      const code = CAMERA_PAN_CODES[button.dataset.pan];
      if (!code) return;
      const pointerId = event.pointerId ?? 1;
      stopCameraPan(pointerId);
      pulseCameraPan(code);
      button.classList.add('holding');
      try { button.setPointerCapture?.(event.pointerId); } catch (_) {}
      const hold = { button, code, delayTimer: null, repeatTimer: null };
      hold.delayTimer = win.setTimeout(() => {
        pulseCameraPan(code);
        hold.repeatTimer = win.setInterval(() => pulseCameraPan(code), CAMERA_PAN_HOLD.repeatMs);
      }, CAMERA_PAN_HOLD.delayMs);
      activeHolds.set(pointerId, hold);
    });
    const release = event => stopCameraPan(event.pointerId ?? 1);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && event.buttons === 0) release(event);
    });
  });

  doc.getElementById('cameraFollowBtn')?.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    const runtimeFollow = doc.getElementById('ctxCam');
    if (runtimeFollow) {
      runtimeFollow.click();
      touchCameraFree = false;
      return;
    }
    if (shouldFallbackCameraFollow(false, touchCameraFree)) {
      win.dispatchEvent(makeCameraFollowKeyEvent(win));
      touchCameraFree = false;
    }
  });

  modeBtn.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    state = buildCameraControlState(!state.minimapCameraMode);
    syncMode();
  });

  const synthetic = new WeakSet();
  minimap.addEventListener('pointerdown', event => {
    if (!state.minimapCameraMode || synthetic.has(event) || event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    touchCameraFree = true;
    const next = new win.PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, clientX: event.clientX, clientY: event.clientY,
      pointerId: event.pointerId, pointerType: event.pointerType || 'touch', button: 0, buttons: 1, shiftKey: true,
    });
    synthetic.add(next);
    minimap.dispatchEvent(next);
  }, true);

  const syncVisibility = () => root.classList.toggle('hidden', hud.classList.contains('hidden'));
  const observer = new win.MutationObserver(syncVisibility);
  observer.observe(hud, { attributes: true, attributeFilter: ['class'] });
  syncVisibility();
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installCameraTouchControls(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
