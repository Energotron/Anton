const VIDEO_ID = 'qcmwEXSbQ_U';
const LOCAL_SOURCE = 'music/menu-anthem.mp3';
const PLAYER_ORIGIN = typeof location !== 'undefined' ? location.origin : '';

let localAudio = null;
let youtubeFrame = null;
let mode = null;
let playing = false;
let loading = false;
let localProbe = null;

function menuVisible(doc = document) {
  const menu = doc.getElementById('menu');
  return Boolean(menu && !menu.classList.contains('hidden'));
}

function sendYoutubeCommand(command) {
  if (!youtubeFrame || !youtubeFrame.contentWindow) return;
  youtubeFrame.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func: command,
    args: []
  }), '*');
}

function getUi(doc = document) {
  return {
    panel: doc.getElementById('kr3AnthemPanel'),
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
  else if (playing) button.textContent = '⏸ ПАУЗА — ЗА КРАЕМ ОРБИТ';
  else button.textContent = '▶ ГИМН КР3 — ЗА КРАЕМ ОРБИТ';

  if (status) {
    status.textContent = message || (
      playing
        ? (mode === 'local' ? 'Локальный гимн играет · 4:14' : 'Гимн играет через YouTube · 4:14')
        : 'Главная тема Космических Рейнджеров 3'
    );
  }

  if (frameWrap) {
    frameWrap.hidden = mode !== 'youtube' || !youtubeFrame;
  }
}

async function hasLocalAnthem() {
  if (!localProbe) {
    localProbe = fetch(LOCAL_SOURCE, { method: 'HEAD', cache: 'no-store' })
      .then(response => response.ok)
      .catch(() => false);
  }
  return localProbe;
}

function ensureLocalAudio(doc = document) {
  if (localAudio) return localAudio;
  const audio = doc.createElement('audio');
  audio.src = LOCAL_SOURCE;
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.42;
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
    localProbe = Promise.resolve(false);
    if (mode === 'local') {
      mode = null;
      playing = false;
      syncUi(doc, 'Локальный файл недоступен — переключаюсь на YouTube');
    }
  });
  localAudio = audio;
  return audio;
}

function ensureYoutubePlayer(doc = document) {
  if (youtubeFrame) return youtubeFrame;
  const { frameWrap } = getUi(doc);
  if (!frameWrap) return null;

  const frame = doc.createElement('iframe');
  frame.id = 'kr3AnthemYoutube';
  frame.title = 'Гимн КР3 — За краем орбит';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.loading = 'eager';
  frame.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&loop=1&playlist=${VIDEO_ID}&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(PLAYER_ORIGIN)}`;
  frame.style.cssText = 'width:min(360px,82vw);aspect-ratio:16/9;border:1px solid rgba(255,215,122,.45);border-radius:10px;display:block;margin:8px auto 0;background:#000;box-shadow:0 10px 28px rgba(0,0,0,.45)';
  frameWrap.replaceChildren(frame);
  frameWrap.hidden = false;
  youtubeFrame = frame;
  mode = 'youtube';
  playing = true;
  return frame;
}

async function playAnthem(doc = document) {
  if (loading || !menuVisible(doc)) return;
  loading = true;
  syncUi(doc, 'Подключаю главную тему…');

  try {
    if (await hasLocalAnthem()) {
      mode = 'local';
      if (youtubeFrame) {
        sendYoutubeCommand('stopVideo');
        youtubeFrame.remove();
        youtubeFrame = null;
      }
      await ensureLocalAudio(doc).play();
      playing = true;
      syncUi(doc);
      return;
    }

    mode = 'youtube';
    if (youtubeFrame) {
      sendYoutubeCommand('playVideo');
      playing = true;
    } else {
      ensureYoutubePlayer(doc);
    }
    syncUi(doc);
  } catch (error) {
    playing = false;
    mode = null;
    syncUi(doc, 'Нажмите ещё раз для запуска гимна');
    console.warn('KR3 menu anthem:', error);
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
  if (localAudio) {
    localAudio.pause();
    localAudio.currentTime = 0;
  }
  if (youtubeFrame) {
    sendYoutubeCommand('stopVideo');
    youtubeFrame.remove();
    youtubeFrame = null;
  }
  playing = false;
  mode = null;
  syncUi(doc);
}

async function toggleAnthem(doc = document) {
  if (playing) pauseAnthem(doc);
  else await playAnthem(doc);
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
    <div id="kr3AnthemStatus" style="font-size:11px;letter-spacing:.08em;color:#ffd77a;opacity:.84;text-align:center">Главная тема Космических Рейнджеров 3</div>
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

export function bindMenuAnthem(doc = document, win = window) {
  mountAnthemUi(doc);

  doc.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('#kr3SetupLaunch, #contBtn')) stopAnthem(doc);
  }, true);

  const menu = doc.getElementById('menu');
  if (menu) {
    new MutationObserver(() => {
      if (!menuVisible(doc)) stopAnthem(doc);
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden && playing) pauseAnthem(doc);
  });

  win.addEventListener('pagehide', () => stopAnthem(doc));

  const preload = () => { hasLocalAnthem().catch(() => false); };
  if ('requestIdleCallback' in win) win.requestIdleCallback(preload, { timeout: 2500 });
  else win.setTimeout(preload, 1200);

  win.KR3MenuAnthem = Object.freeze({
    play: () => playAnthem(doc),
    pause: () => pauseAnthem(doc),
    stop: () => stopAnthem(doc),
    toggle: () => toggleAnthem(doc)
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  bindMenuAnthem(document, window);
}
