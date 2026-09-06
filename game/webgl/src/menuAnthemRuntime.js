const VIDEO_ID = 'qcmwEXSbQ_U';
const LOCAL_SOURCE = 'music/Песня за краем орбит by космические рейнджеры 2 .mp3';
const PLAYER_ORIGIN = typeof location !== 'undefined' && location.origin !== 'null' ? location.origin : '';
const AUTOPLAY_DELAY_MS = 80;
const MENU_VOLUME = 42;

let localAudio = null;
let youtubeFrame = null;
let mode = null;
let playing = false;
let loading = false;
let localAvailable = null;
let autoplayAttempted = false;
let autoplayTimer = null;
let autoplayMuted = false;
let fallbackRequested = false;

function isPackagedRuntime(win = window) {
  try {
    const params = new URLSearchParams(win.location.search || '');
    return params.get('mode') === 'apk' || win.location.hostname === 'appassets.androidplatform.net';
  } catch (_) {
    return false;
  }
}

function menuVisible(doc = document) {
  const menu = doc.getElementById('menu');
  return Boolean(menu && !menu.classList.contains('hidden'));
}

function sendYoutubeCommand(command, args = []) {
  if (!youtubeFrame || !youtubeFrame.contentWindow) return;
  youtubeFrame.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func: command,
    args
  }), '*');
}

function getUi(doc = document) {
  return {
    button: doc.getElementById('btnMenuAnthem'),
    status: doc.getElementById('kr3AnthemStatus'),
    frameWrap: doc.getElementById('kr3AnthemFrameWrap')
  };
}

function syncUi(doc = document, message = '') {
  const { button, status, frameWrap } = getUi(doc);
  if (!button) return;

  button.disabled = loading;
  if (loading) button.textContent = '⏳ ЗАГРУЗКА ГИМНА…';
  else if (playing && autoplayMuted) button.textContent = '🔊 ВКЛЮЧИТЬ ЗВУК — ЗА КРАЕМ ОРБИТ';
  else if (playing) button.textContent = '⏸ ПАУЗА — ЗА КРАЕМ ОРБИТ';
  else button.textContent = '▶ ГИМН КР3 — ЗА КРАЕМ ОРБИТ';

  if (status) {
    status.textContent = message || (
      playing && autoplayMuted
        ? 'Первое действие восстановит звук'
        : playing
          ? (mode === 'local'
              ? 'Локальный гимн · За краем орбит · играет в главном меню'
              : 'Резервный сетевой источник · За краем орбит')
          : mode === 'local' && localAvailable !== false
            ? 'За краем орбит готова · коснитесь экрана, если браузер запретил autoplay'
            : 'Главная тема Космических Рейнджеров 3'
    );
  }

  if (frameWrap) frameWrap.hidden = mode !== 'youtube' || !youtubeFrame;
}

function ensureLocalAudio(doc = document) {
  if (localAudio) return localAudio;

  const audio = doc.createElement('audio');
  audio.src = LOCAL_SOURCE;
  audio.loop = true;
  audio.autoplay = true;
  audio.preload = 'auto';
  audio.volume = MENU_VOLUME / 100;
  audio.muted = false;
  audio.setAttribute('playsinline', '');

  audio.addEventListener('loadedmetadata', () => {
    localAvailable = true;
  });

  audio.addEventListener('canplay', () => {
    localAvailable = true;
  });

  audio.addEventListener('play', () => {
    localAvailable = true;
    playing = true;
    mode = 'local';
    fallbackRequested = false;
    if (youtubeFrame) {
      sendYoutubeCommand('stopVideo');
      youtubeFrame.remove();
      youtubeFrame = null;
    }
    syncUi(doc);
  });

  audio.addEventListener('pause', () => {
    if (mode === 'local') playing = false;
    syncUi(doc);
  });

  audio.addEventListener('error', () => {
    localAvailable = false;
    if (mode !== 'local' || !menuVisible(doc)) return;
    playing = false;
    autoplayMuted = false;
    syncUi(doc, 'Локальный гимн не загрузился · включаю резервный источник');
    requestYoutubeFallback(doc);
  });

  localAudio = audio;
  return audio;
}

function unmuteAnthem(doc = document) {
  if (mode === 'youtube' && youtubeFrame) {
    sendYoutubeCommand('unMute');
    sendYoutubeCommand('setVolume', [MENU_VOLUME]);
    sendYoutubeCommand('playVideo');
    playing = true;
    autoplayMuted = false;
    syncUi(doc);
    return;
  }

  const audio = ensureLocalAudio(doc);
  mode = 'local';
  audio.muted = false;
  audio.volume = MENU_VOLUME / 100;
  audio.play().then(() => {
    localAvailable = true;
    playing = true;
    autoplayMuted = false;
    syncUi(doc);
  }).catch(() => {
    playing = false;
    syncUi(doc, 'Коснитесь кнопки гимна для запуска звука');
  });
}

function ensureYoutubePlayer(doc = document, { mutedAutoplay = false } = {}) {
  if (localAvailable !== false) return null;

  if (youtubeFrame) {
    if (mutedAutoplay) sendYoutubeCommand('mute');
    else sendYoutubeCommand('unMute');
    sendYoutubeCommand('setVolume', [MENU_VOLUME]);
    sendYoutubeCommand('playVideo');
    playing = true;
    autoplayMuted = mutedAutoplay;
    mode = 'youtube';
    syncUi(doc);
    return youtubeFrame;
  }

  const { frameWrap } = getUi(doc);
  if (!frameWrap) return null;

  const frame = doc.createElement('iframe');
  frame.id = 'kr3AnthemYoutube';
  frame.title = 'Гимн КР3 — За краем орбит';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.loading = 'eager';

  const originParam = PLAYER_ORIGIN ? `&origin=${encodeURIComponent(PLAYER_ORIGIN)}` : '';
  const muteParam = mutedAutoplay ? 1 : 0;
  frame.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=${muteParam}&loop=1&playlist=${VIDEO_ID}&playsinline=1&rel=0&controls=1&enablejsapi=1${originParam}`;
  frame.style.cssText = 'width:min(360px,82vw);aspect-ratio:16/9;border:1px solid rgba(255,215,122,.45);border-radius:10px;display:block;margin:8px auto 0;background:#000;box-shadow:0 10px 28px rgba(0,0,0,.45)';

  frame.addEventListener('load', () => {
    if (!menuVisible(doc) || localAvailable !== false) return;
    if (mutedAutoplay) sendYoutubeCommand('mute');
    else sendYoutubeCommand('unMute');
    sendYoutubeCommand('setVolume', [MENU_VOLUME]);
    sendYoutubeCommand('playVideo');
  });

  frameWrap.replaceChildren(frame);
  frameWrap.hidden = false;
  youtubeFrame = frame;
  mode = 'youtube';
  playing = true;
  autoplayMuted = mutedAutoplay;
  syncUi(doc, 'Резервный источник гимна');
  return frame;
}

function requestYoutubeFallback(doc = document) {
  if (fallbackRequested || localAvailable !== false || !menuVisible(doc)) return;
  fallbackRequested = true;
  ensureYoutubePlayer(doc, { mutedAutoplay: false });
}

async function playLocalAnthem(doc = document, { autoplay = false } = {}) {
  if (!menuVisible(doc)) return false;

  const audio = ensureLocalAudio(doc);
  mode = 'local';
  audio.muted = false;
  audio.volume = MENU_VOLUME / 100;

  try {
    await audio.play();
    localAvailable = true;
    playing = true;
    autoplayMuted = false;
    fallbackRequested = false;
    return true;
  } catch (error) {
    playing = false;

    // A NotAllowedError means the browser rejected automatic sound, not that
    // our bundled/local MP3 is missing. Keep the local source selected so the
    // very first pointer/key gesture can start it instead of showing YouTube.
    if (error?.name === 'NotAllowedError') {
      syncUi(doc, autoplay
        ? 'За краем орбит готова · первое касание включит звук'
        : 'Коснитесь кнопки гимна ещё раз для запуска звука');
      return false;
    }

    // In the Android APK the track is bundled with the app. Do not race an
    // HTTP HEAD probe against startup: WebView can take longer than the old
    // 180 ms timeout even though the MP3 is present and playable.
    if (isPackagedRuntime()) {
      syncUi(doc, 'Загружаю локальный гимн из APK…');
      return false;
    }

    if (localAvailable === false || audio.error) {
      localAvailable = false;
      requestYoutubeFallback(doc);
    }
    return false;
  }
}

async function playAnthem(doc = document, options = {}) {
  if (loading || !menuVisible(doc)) return;

  const autoplay = options.autoplay === true;
  loading = true;
  syncUi(doc, autoplay ? '🚀 Запуск За краем орбит…' : 'Подключаю главную тему…');

  try {
    // Local-first, always. The actual audio element decides availability.
    // This removes the first-launch race where a slow HEAD request caused a
    // YouTube placeholder even though the MP3 was already bundled locally.
    if (localAvailable !== false) {
      await playLocalAnthem(doc, { autoplay });
      return;
    }

    requestYoutubeFallback(doc);
  } finally {
    loading = false;
    syncUi(doc);
  }
}

function pauseAnthem(doc = document) {
  if (mode === 'local' && localAudio) localAudio.pause();
  if (mode === 'youtube' && youtubeFrame) sendYoutubeCommand('pauseVideo');
  playing = false;
  syncUi(doc);
}

function stopAnthem(doc = document) {
  if (autoplayTimer) {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }

  if (localAudio) {
    localAudio.pause();
    try { localAudio.currentTime = 0; } catch (_) {}
    localAudio.muted = false;
  }
  if (youtubeFrame) {
    sendYoutubeCommand('stopVideo');
    youtubeFrame.remove();
    youtubeFrame = null;
  }

  playing = false;
  mode = null;
  autoplayMuted = false;
  fallbackRequested = false;
  syncUi(doc);
}

async function toggleAnthem(doc = document) {
  if (playing && autoplayMuted) {
    unmuteAnthem(doc);
    return;
  }
  if (playing) pauseAnthem(doc);
  else await playAnthem(doc);
}

function scheduleAutoplay(doc = document, win = window) {
  if (autoplayAttempted || !menuVisible(doc)) return;
  autoplayAttempted = true;
  if (autoplayTimer) win.clearTimeout(autoplayTimer);
  autoplayTimer = win.setTimeout(() => {
    autoplayTimer = null;
    playAnthem(doc, { autoplay: true }).catch(error => {
      console.warn('KR3 menu anthem autoplay:', error);
      playing = false;
      autoplayMuted = false;
      syncUi(doc, 'За краем орбит готова · коснитесь экрана для запуска');
    });
  }, AUTOPLAY_DELAY_MS);
}

function mountAnthemUi(doc = document) {
  const menuInner = doc.getElementById('menuInner');
  if (!menuInner || doc.getElementById('kr3AnthemPanel')) return;

  const panel = doc.createElement('section');
  panel.id = 'kr3AnthemPanel';
  panel.setAttribute('aria-label', 'Гимн Космических Рейнджеров 3');
  panel.style.cssText = 'display:grid;justify-items:center;gap:4px;margin-top:8px';
  panel.innerHTML = `
    <button class="mbtn ghost" id="btnMenuAnthem" type="button">▶ ГИМН КР3 — ЗА КРАЕМ ОРБИТ</button>
    <div id="kr3AnthemStatus" style="font-size:11px;letter-spacing:.08em;color:#ffd77a;opacity:.84;text-align:center">Автовоспроизведение локальной главной темы</div>
    <div id="kr3AnthemFrameWrap" hidden></div>`;

  const version = menuInner.querySelector('.ver');
  if (version) menuInner.insertBefore(panel, version);
  else menuInner.appendChild(panel);

  panel.querySelector('#btnMenuAnthem')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleAnthem(doc);
  });

  syncUi(doc);
}

function bindGestureRecovery(doc = document) {
  const recover = event => {
    if (!menuVisible(doc)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('#kr3SetupLaunch, #contBtn')) return;

    if (mode === 'youtube' && youtubeFrame) {
      sendYoutubeCommand('unMute');
      sendYoutubeCommand('setVolume', [MENU_VOLUME]);
      sendYoutubeCommand('playVideo');
      playing = true;
      autoplayMuted = false;
      syncUi(doc);
      return;
    }

    if (localAvailable !== false) {
      const audio = ensureLocalAudio(doc);
      mode = 'local';
      audio.muted = false;
      audio.volume = MENU_VOLUME / 100;
      audio.play().then(() => {
        localAvailable = true;
        playing = true;
        autoplayMuted = false;
        syncUi(doc);
      }).catch(() => {});
      return;
    }

    if (!playing) requestYoutubeFallback(doc);
  };

  doc.addEventListener('pointerdown', recover, { capture: true });
  doc.addEventListener('keydown', recover, { capture: true });
}

export function bindMenuAnthem(doc = document, win = window) {
  mountAnthemUi(doc);

  // In the APK the MP3 is part of assets/www and WebView explicitly allows
  // media playback without a user gesture. Mark it available immediately so
  // first-launch playback never waits on a network-style HEAD probe.
  if (isPackagedRuntime(win)) localAvailable = true;

  doc.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('#kr3SetupLaunch, #contBtn')) stopAnthem(doc);
  }, true);

  const menu = doc.getElementById('menu');
  if (menu) {
    new MutationObserver(() => {
      if (!menuVisible(doc)) {
        stopAnthem(doc);
        autoplayAttempted = false;
      } else {
        scheduleAutoplay(doc, win);
      }
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden && playing) pauseAnthem(doc);
    else if (!doc.hidden && menuVisible(doc) && !playing) {
      autoplayAttempted = false;
      scheduleAutoplay(doc, win);
    }
  });

  win.addEventListener('pagehide', () => stopAnthem(doc));
  bindGestureRecovery(doc);

  // Prime the actual local media element instead of probing it with fetch().
  ensureLocalAudio(doc).load();
  scheduleAutoplay(doc, win);

  win.KR3MenuAnthem = Object.freeze({
    play: () => playAnthem(doc),
    pause: () => pauseAnthem(doc),
    stop: () => stopAnthem(doc),
    toggle: () => toggleAnthem(doc),
    unmute: () => unmuteAnthem(doc),
    autoplay: () => {
      autoplayAttempted = false;
      scheduleAutoplay(doc, win);
    }
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  bindMenuAnthem(document, window);
}
