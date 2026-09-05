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
let localProbe = null;
let localAvailable = null;
let autoplayAttempted = false;
let autoplayTimer = null;
let autoplayMuted = false;

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
        ? 'Браузер заблокировал звук · первое действие восстановит его'
        : playing
          ? (mode === 'local'
              ? 'Автовоспроизведение со звуком · локальный гимн · 4:14'
              : 'Автовоспроизведение со звуком · гимн КР3 · 4:14')
          : 'Главная тема Космических Рейнджеров 3'
    );
  }

  if (frameWrap) frameWrap.hidden = mode !== 'youtube' || !youtubeFrame;
}

function hasLocalAnthem() {
  if (!localProbe) {
    localProbe = fetch(LOCAL_SOURCE, { method: 'HEAD', cache: 'no-store' })
      .then(response => {
        localAvailable = response.ok;
        return localAvailable;
      })
      .catch(() => {
        localAvailable = false;
        return false;
      });
  }
  return localProbe;
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

  audio.addEventListener('play', () => {
    playing = true;
    mode = 'local';
    syncUi(doc);
  });
  audio.addEventListener('pause', () => {
    if (mode === 'local') playing = false;
    syncUi(doc);
  });
  audio.addEventListener('error', () => {
    localAvailable = false;
    localProbe = Promise.resolve(false);
    if (mode === 'local') {
      mode = null;
      playing = false;
      autoplayMuted = false;
      syncUi(doc, 'Локальный файл недоступен — используется сетевой гимн');
    }
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
  } else if (mode === 'local' && localAudio) {
    localAudio.muted = false;
    localAudio.volume = MENU_VOLUME / 100;
    localAudio.play().then(() => {
      playing = true;
      syncUi(doc);
    }).catch(() => {});
  }

  autoplayMuted = false;
  syncUi(doc);
}

function ensureYoutubePlayer(doc = document, { mutedAutoplay = false } = {}) {
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
    if (!menuVisible(doc)) return;

    const requestSoundPlayback = () => {
      if (!menuVisible(doc) || !youtubeFrame) return;
      sendYoutubeCommand('unMute');
      sendYoutubeCommand('setVolume', [MENU_VOLUME]);
      sendYoutubeCommand('playVideo');
    };

    if (mutedAutoplay) {
      sendYoutubeCommand('mute');
      sendYoutubeCommand('playVideo');
    } else {
      requestSoundPlayback();
      setTimeout(requestSoundPlayback, 250);
      setTimeout(requestSoundPlayback, 800);
      setTimeout(requestSoundPlayback, 1600);
    }
  });

  frameWrap.replaceChildren(frame);
  frameWrap.hidden = false;
  youtubeFrame = frame;
  mode = 'youtube';
  playing = true;
  autoplayMuted = mutedAutoplay;
  syncUi(doc, mutedAutoplay
    ? 'Видео запущено без звука · браузер ограничил autoplay'
    : '🚀 Запрашиваю автозапуск гимна сразу со звуком');
  return frame;
}

async function playAnthem(doc = document, options = {}) {
  if (loading || !menuVisible(doc)) return;

  const autoplay = options.autoplay === true;
  loading = true;
  syncUi(doc, autoplay ? '🚀 Запуск гимна главного меню со звуком…' : 'Подключаю главную тему…');

  try {
    if (localAvailable === null) {
      if (autoplay) {
        const probeResult = await Promise.race([
          hasLocalAnthem(),
          new Promise(resolve => setTimeout(() => resolve(false), 180))
        ]);
        if (probeResult === true) localAvailable = true;
      } else {
        await hasLocalAnthem();
      }
    }

    if (localAvailable === true) {
      mode = 'local';
      if (youtubeFrame) {
        sendYoutubeCommand('stopVideo');
        youtubeFrame.remove();
        youtubeFrame = null;
      }

      const audio = ensureLocalAudio(doc);
      audio.muted = false;
      autoplayMuted = false;

      try {
        await audio.play();
        playing = true;
        return;
      } catch (error) {
        console.warn('KR3 local menu anthem autoplay with sound:', error);
        if (!autoplay || error?.name !== 'NotAllowedError') {
          localAvailable = false;
        }
      }
    }

    // Sound-first: request unmuted YouTube autoplay. Browsers that have granted
    // autoplay permission (prior interaction / installed PWA / engagement) will
    // start the anthem immediately with sound.
    ensureYoutubePlayer(doc, { mutedAutoplay: false });
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
    localAudio.currentTime = 0;
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
      syncUi(doc, 'Автозапуск звука заблокирован браузером · нажмите для запуска');
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
    <div id="kr3AnthemStatus" style="font-size:11px;letter-spacing:.08em;color:#ffd77a;opacity:.84;text-align:center">Автовоспроизведение главной темы со звуком</div>
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

    if (mode === 'local' && localAudio) {
      localAudio.muted = false;
      localAudio.volume = MENU_VOLUME / 100;
      localAudio.play().then(() => {
        playing = true;
        autoplayMuted = false;
        syncUi(doc);
      }).catch(() => {});
      return;
    }

    if (!playing) playAnthem(doc).catch(() => {});
  };

  doc.addEventListener('pointerdown', recover, { capture: true });
  doc.addEventListener('keydown', recover, { capture: true });
}

export function bindMenuAnthem(doc = document, win = window) {
  mountAnthemUi(doc);

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

  hasLocalAnthem().catch(() => false);
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
