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

export function WebGLRenderer(canvas) {
  try {
    return new CanonicalWebGLRenderer(canvas);
  } catch (primaryError) {
    if (!canvas || typeof canvas.getContext !== 'function') throw primaryError;

    const nativeGetContext = canvas.getContext.bind(canvas);
    canvas.getContext = (type, attrs) => nativeGetContext(type, {
      ...(attrs || {}),
      antialias: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false,
    });

    try {
      const renderer = new CanonicalWebGLRenderer(canvas);
      console.warn('KR3: WebGL started in compatibility mode after primary context failure.', primaryError);
      return renderer;
    } catch (fallbackError) {
      startupError(fallbackError?.message || String(fallbackError));
      throw fallbackError;
    } finally {
      canvas.getContext = nativeGetContext;
    }
  }
}
