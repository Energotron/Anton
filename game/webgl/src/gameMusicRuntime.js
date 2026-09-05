const GAME_VOLUME = 0.34;

const TRACKS = [
  { id: 'fei',     title: 'FEI',     src: new URL('../music/fei.mp3', import.meta.url).href },
  { id: 'fighter', title: 'Fighter', src: new URL('../music/fighter.mp3', import.meta.url).href },
  { id: 'flight',  title: 'Flight',  src: new URL('../music/flight.mp3', import.meta.url).href },
  { id: 'gaal',    title: 'Gaal',    src: new URL('../music/gaal.mp3', import.meta.url).href },
  { id: 'human',   title: 'Human',   src: new URL('../music/human.mp3', import.meta.url).href },
  { id: 'maloc',   title: 'Maloc',   src: new URL('../music/maloc.mp3', import.meta.url).href },
  { id: 'peleng',  title: 'Peleng',  src: new URL('../music/peleng.mp3', import.meta.url).href },
  { id: 'quasar',  title: 'Quasar',  src: new URL('../music/quasar.mp3', import.meta.url).href },
];

let audio = null;
let order = [];
let orderIndex = -1;
let currentTrack = null;
let requestedPlaying = false;
let pausedByVisibility = false;
let volume = GAME_VOLUME;

function menuVisible(doc = document) {
  const menu = doc.getElementById('menu');
  return Boolean(menu && !menu.classList.contains('hidden'));
}

function gameplayVisible(doc = document) {
  return !menuVisible(doc);
}

function soundMuted(doc = document) {
  const button = doc.getElementById('sndBtn');
  if (!button) return false;
  return String(button.textContent || '').includes('🔇') || button.dataset.soundState === 'off';
}

function shuffledTrackIndexes(previous = null) {
  const values = TRACKS.map((_, index) => index);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  if (values.length > 1 && previous !== null && values[0] === previous) {
    [values[0], values[1]] = [values[1], values[0]];
  }
  return values;
}

function ensureAudio(doc = document) {
  if (audio) return audio;

  audio = new Audio();
  audio.preload = 'auto';
  audio.loop = false;
  audio.volume = volume;
  audio.setAttribute('playsinline', '');

  audio.addEventListener('ended', () => {
    if (!requestedPlaying || !gameplayVisible(doc)) return;
    nextTrack(doc, { autoplay: true });
  });

  audio.addEventListener('error', () => {
    console.warn('KR3 game music failed:', currentTrack?.title || audio?.src || 'unknown');
    if (!requestedPlaying || !gameplayVisible(doc)) return;
    window.setTimeout(() => nextTrack(doc, { autoplay: true }), 300);
  });

  audio.addEventListener('play', () => {
    pausedByVisibility = false;
    console.info('KR3 music:', currentTrack?.title || 'track');
  });

  return audio;
}

function applyMuteState(doc = document) {
  if (!audio) return;
  audio.muted = soundMuted(doc);
  audio.volume = volume;
}

function chooseNextTrack() {
  const previous = currentTrack ? TRACKS.findIndex(track => track.id === currentTrack.id) : null;
  if (!order.length || orderIndex >= order.length - 1) {
    order = shuffledTrackIndexes(previous);
    orderIndex = -1;
  }
  orderIndex += 1;
  return TRACKS[order[orderIndex]];
}

async function loadAndPlay(track, doc = document, { autoplay = false } = {}) {
  if (!track || !gameplayVisible(doc)) return false;
  const player = ensureAudio(doc);
  currentTrack = track;
  if (player.src !== track.src) {
    player.src = track.src;
    player.load();
  }
  applyMuteState(doc);
  requestedPlaying = true;

  try {
    await player.play();
    return true;
  } catch (error) {
    if (!autoplay || error?.name !== 'NotAllowedError') {
      console.warn('KR3 game music play blocked:', error);
    }
    return false;
  }
}

async function nextTrack(doc = document, options = {}) {
  if (!gameplayVisible(doc)) return false;
  return loadAndPlay(chooseNextTrack(), doc, options);
}

async function startPlaylist(doc = document, options = {}) {
  if (!gameplayVisible(doc)) return false;
  requestedPlaying = true;

  if (audio && currentTrack && audio.paused && !audio.ended) {
    applyMuteState(doc);
    try {
      await audio.play();
      return true;
    } catch (_) {}
  }

  if (!currentTrack || audio?.ended) return nextTrack(doc, options);
  return loadAndPlay(currentTrack, doc, options);
}

function pausePlaylist() {
  requestedPlaying = false;
  if (audio && !audio.paused) audio.pause();
}

function stopPlaylist() {
  requestedPlaying = false;
  pausedByVisibility = false;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

function bindSoundButton(doc = document) {
  const button = doc.getElementById('sndBtn');
  if (!button) return;

  const sync = () => {
    applyMuteState(doc);
    if (!soundMuted(doc) && gameplayVisible(doc) && requestedPlaying && audio?.paused) {
      audio.play().catch(() => {});
    }
  };

  button.addEventListener('click', () => setTimeout(sync, 0));
  new MutationObserver(sync).observe(button, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-sound-state', 'aria-label']
  });
}

function bindGestureRecovery(doc = document) {
  const recover = () => {
    if (!gameplayVisible(doc)) return;
    if (!requestedPlaying) requestedPlaying = true;
    if (!audio || !currentTrack || audio.ended) {
      nextTrack(doc).catch(() => {});
      return;
    }
    applyMuteState(doc);
    if (audio.paused) audio.play().catch(() => {});
  };

  doc.addEventListener('pointerdown', recover, { passive: true });
  doc.addEventListener('keydown', recover);
}

export function bindGameMusic(doc = document, win = window) {
  const menu = doc.getElementById('menu');

  if (menu) {
    new MutationObserver(() => {
      if (menuVisible(doc)) {
        stopPlaylist();
      } else {
        win.setTimeout(() => startPlaylist(doc, { autoplay: true }), 80);
      }
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  bindSoundButton(doc);
  bindGestureRecovery(doc);

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) {
      if (audio && !audio.paused && gameplayVisible(doc)) {
        pausedByVisibility = true;
        audio.pause();
      }
      return;
    }

    if (pausedByVisibility && gameplayVisible(doc)) {
      pausedByVisibility = false;
      requestedPlaying = true;
      applyMuteState(doc);
      audio?.play().catch(() => {});
    }
  });

  win.addEventListener('pagehide', stopPlaylist);

  if (gameplayVisible(doc)) {
    win.setTimeout(() => startPlaylist(doc, { autoplay: true }), 80);
  }

  win.KR3GameMusic = Object.freeze({
    play: () => startPlaylist(doc),
    pause: pausePlaylist,
    stop: stopPlaylist,
    next: () => nextTrack(doc),
    get track() { return currentTrack ? { ...currentTrack } : null; },
    get tracks() { return TRACKS.map(track => ({ id: track.id, title: track.title })); },
    get muted() { return soundMuted(doc); },
    get volume() { return volume; },
    setVolume(value) {
      const next = Number(value);
      if (!Number.isFinite(next)) return volume;
      volume = Math.max(0, Math.min(1, next));
      if (audio) audio.volume = volume;
      return volume;
    }
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  bindGameMusic(document, window);
}
