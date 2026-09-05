let deferredInstallPrompt = null;
let wakeLock = null;
let installButton = null;

function isApkRuntime(win = window) {
  try {
    const mode = new URLSearchParams(win.location?.search || '').get('mode');
    return mode === 'apk' || /KR3Android/i.test(String(win.navigator?.userAgent || ''));
  } catch (_) {
    return false;
  }
}

function isStandalone(win = window) {
  return Boolean(
    isApkRuntime(win) ||
    win.matchMedia?.('(display-mode: standalone)').matches ||
    win.matchMedia?.('(display-mode: fullscreen)').matches ||
    win.navigator?.standalone === true
  );
}

function markAppMode(doc = document, win = window) {
  const apk = isApkRuntime(win);
  const standalone = isStandalone(win);
  doc.documentElement.classList.toggle('kr3-app-mode', standalone);
  doc.body?.classList.toggle('kr3-app-mode', standalone);
  doc.documentElement.classList.toggle('kr3-apk-mode', apk);
  doc.body?.classList.toggle('kr3-apk-mode', apk);
  doc.documentElement.dataset.kr3DisplayMode = apk ? 'apk' : (standalone ? 'app' : 'browser');
  return standalone;
}

function syncViewport(doc = document, win = window) {
  const viewport = win.visualViewport;
  const width = Math.max(1, Math.round(viewport?.width || win.innerWidth || doc.documentElement.clientWidth || 1));
  const height = Math.max(1, Math.round(viewport?.height || win.innerHeight || doc.documentElement.clientHeight || 1));
  doc.documentElement.style.setProperty('--kr3-app-width', `${width}px`);
  doc.documentElement.style.setProperty('--kr3-app-height', `${height}px`);
}

async function requestWakeLock(doc = document, nav = navigator) {
  if (!isStandalone(window) || doc.hidden || !nav.wakeLock?.request) return null;
  if (wakeLock && !wakeLock.released) return wakeLock;

  try {
    wakeLock = await nav.wakeLock.request('screen');
    wakeLock.addEventListener?.('release', () => {
      wakeLock = null;
    });
    return wakeLock;
  } catch (error) {
    console.debug('KR3 wake lock unavailable:', error);
    return null;
  }
}

async function requestLandscape(win = window) {
  if (!isStandalone(win) || !win.screen?.orientation?.lock) return;
  try {
    await win.screen.orientation.lock('landscape');
  } catch (error) {
    console.debug('KR3 orientation lock unavailable:', error);
  }
}

function removeInstallButton() {
  installButton?.remove();
  installButton = null;
}

function mountInstallButton(doc = document) {
  if (!deferredInstallPrompt || isStandalone(window) || installButton) return;

  const menuInner = doc.getElementById('menuInner');
  if (!menuInner) return;

  const button = doc.createElement('button');
  button.type = 'button';
  button.id = 'btnInstallKr3';
  button.className = 'mbtn ghost';
  button.textContent = '📲 УСТАНОВИТЬ КР3';
  button.title = 'Установить Космические Рейнджеры 3 как приложение';

  const help = doc.getElementById('btnHelp');
  if (help) menuInner.insertBefore(button, help);
  else menuInner.appendChild(button);

  button.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    const prompt = deferredInstallPrompt;
    if (!prompt) return;

    deferredInstallPrompt = null;
    await prompt.prompt();
    try {
      await prompt.userChoice;
    } finally {
      removeInstallButton();
    }
  });

  installButton = button;
}

async function registerServiceWorker(win = window) {
  if (isApkRuntime(win) || !('serviceWorker' in win.navigator) || !win.isSecureContext) return null;

  try {
    const registration = await win.navigator.serviceWorker.register('./sw.js', { scope: './' });
    registration.update?.().catch(() => {});
    return registration;
  } catch (error) {
    console.warn('KR3 service worker registration failed:', error);
    return null;
  }
}

function bindFirstGesture(doc = document, win = window) {
  let armed = true;

  const activateAppFeatures = () => {
    if (!armed) return;
    armed = false;
    if (isStandalone(win)) {
      requestLandscape(win);
      requestWakeLock(doc, win.navigator);
    }
  };

  doc.addEventListener('pointerdown', activateAppFeatures, { capture: true, once: true });
  doc.addEventListener('keydown', activateAppFeatures, { capture: true, once: true });
}

function bindViewportSync(doc = document, win = window) {
  const sync = () => syncViewport(doc, win);
  sync();
  win.addEventListener('resize', sync, { passive: true });
  win.addEventListener('orientationchange', () => {
    win.setTimeout(sync, 80);
    win.setTimeout(sync, 350);
  }, { passive: true });
  win.visualViewport?.addEventListener?.('resize', sync, { passive: true });
  win.visualViewport?.addEventListener?.('scroll', sync, { passive: true });
}

export function bindPwaRuntime(doc = document, win = window) {
  markAppMode(doc, win);
  bindViewportSync(doc, win);
  registerServiceWorker(win);
  bindFirstGesture(doc, win);

  win.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    mountInstallButton(doc);
  });

  win.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    removeInstallButton();
    markAppMode(doc, win);
    syncViewport(doc, win);
  });

  doc.addEventListener('visibilitychange', () => {
    if (!doc.hidden && isStandalone(win)) {
      requestWakeLock(doc, win.navigator);
      syncViewport(doc, win);
    }
  });

  const displayQueries = ['(display-mode: standalone)', '(display-mode: fullscreen)'];
  for (const query of displayQueries) {
    const media = win.matchMedia?.(query);
    media?.addEventListener?.('change', () => {
      markAppMode(doc, win);
      syncViewport(doc, win);
    });
  }

  if (deferredInstallPrompt) mountInstallButton(doc);

  win.KR3AppMode = Object.freeze({
    isStandalone: () => isStandalone(win),
    isApk: () => isApkRuntime(win),
    install: async () => {
      if (!deferredInstallPrompt) return false;
      const prompt = deferredInstallPrompt;
      deferredInstallPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      removeInstallButton();
      return choice?.outcome === 'accepted';
    },
    lockLandscape: () => requestLandscape(win),
    keepAwake: () => requestWakeLock(doc, win.navigator),
    syncViewport: () => syncViewport(doc, win)
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  bindPwaRuntime(document, window);
}
