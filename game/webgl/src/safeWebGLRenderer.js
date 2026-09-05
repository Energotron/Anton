import { WebGLRenderer as CanonicalWebGLRenderer } from '../js/WebGLRenderer.js?kr3-canonical=1';

function startupError(message) {
  try {
    const box = document.getElementById('errBox');
    if (box) {
      box.style.display = 'block';
      box.textContent = 'Ошибка WebGL: ' + message;
    }
  } catch (_) {}
}

function isMobileRuntime(win = globalThis?.window) {
  try {
    const ua = String(win?.navigator?.userAgent || '');
    const coarse = Boolean(win?.matchMedia?.('(pointer: coarse)')?.matches);
    const narrow = Number(win?.innerWidth || 0) > 0 && Number(win?.innerWidth || 0) <= 900;
    return /Android|Mobile|iPhone|iPad|iPod/i.test(ua) || (coarse && narrow);
  } catch (_) {
    return false;
  }
}

function isApkRuntime(win = globalThis?.window) {
  try {
    const mode = new URLSearchParams(win?.location?.search || '').get('mode');
    return mode === 'apk' || /KR3Android/i.test(String(win?.navigator?.userAgent || ''));
  } catch (_) {
    return false;
  }
}

function installCompatibilityContext(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  const nativeGetContext = canvas.getContext.bind(canvas);
  canvas.getContext = (type, attrs) => nativeGetContext(type, {
    ...(attrs || {}),
    antialias: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,
    desynchronized: false,
  });
  return nativeGetContext;
}

function installMobilePixelRatio(win = globalThis?.window) {
  if (!win || !isMobileRuntime(win)) return null;
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(win, 'devicePixelRatio');
    const nativeDpr = Number(win.devicePixelRatio || 1);
    const preferredDpr = isApkRuntime(win)
      ? Math.min(1.5, Math.max(1, nativeDpr))
      : 1;
    Object.defineProperty(win, 'devicePixelRatio', {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,
      value: preferredDpr,
    });
    return descriptor || { value: undefined };
  } catch (_) {
    return null;
  }
}

function restoreMobilePixelRatio(win, descriptor) {
  if (!win || !descriptor) return;
  try {
    if (descriptor.value === undefined && !descriptor.get && !descriptor.set) {
      delete win.devicePixelRatio;
    } else {
      Object.defineProperty(win, 'devicePixelRatio', descriptor);
    }
  } catch (_) {}
}

function constructRenderer(canvas, { compatibility = false, mobile = false } = {}) {
  const win = globalThis?.window;
  const nativeGetContext = compatibility ? installCompatibilityContext(canvas) : null;
  const originalPixelRatio = mobile ? installMobilePixelRatio(win) : null;
  try {
    return new CanonicalWebGLRenderer(canvas);
  } finally {
    if (nativeGetContext) canvas.getContext = nativeGetContext;
    restoreMobilePixelRatio(win, originalPixelRatio);
  }
}

export function WebGLRenderer(canvas) {
  const mobile = isMobileRuntime();

  // Mobile/WebView gets the conservative profile on the first attempt.
  // APK mode keeps compatibility settings but renders up to 1.5 DPR so the
  // fullscreen image stays noticeably sharper without exploding GPU memory.
  if (mobile) {
    try {
      const renderer = constructRenderer(canvas, { compatibility: true, mobile: true });
      console.info('KR3: WebGL started with mobile compatibility profile.');
      return renderer;
    } catch (mobileError) {
      startupError(mobileError?.message || String(mobileError));
      throw mobileError;
    }
  }

  try {
    return constructRenderer(canvas);
  } catch (primaryError) {
    if (!canvas || typeof canvas.getContext !== 'function') throw primaryError;

    try {
      const renderer = constructRenderer(canvas, { compatibility: true });
      console.warn('KR3: WebGL started in compatibility mode after primary context failure.', primaryError);
      return renderer;
    } catch (fallbackError) {
      startupError(fallbackError?.message || String(fallbackError));
      throw fallbackError;
    }
  }
}
