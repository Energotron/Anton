// KR3 menu anthem placeholder runtime
// Adds a lightweight OGG player hook for the main menu.

const AUDIO_PATH = './music/menu.ogg';

function initMenuAudio() {
  const menu = document.getElementById('menuInner');
  if (!menu || document.getElementById('kr3MenuAudio')) return;

  const wrap = document.createElement('div');
  wrap.id = 'kr3MenuAudio';
  wrap.innerHTML = `
    <button class="mbtn ghost" type="button" id="kr3MusicToggle">🎵 ГИМН КР3</button>
    <audio id="kr3MenuOgg" preload="auto" loop>
      <source src="${AUDIO_PATH}" type="audio/ogg">
    </audio>`;
  menu.appendChild(wrap);

  const btn = document.getElementById('kr3MusicToggle');
  const audio = document.getElementById('kr3MenuOgg');

  btn?.addEventListener('click', async () => {
    if (audio.paused) {
      await audio.play();
      btn.textContent = '🔊 ГИМН КР3';
    } else {
      audio.pause();
      btn.textContent = '🎵 ГИМН КР3';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenuAudio);
} else {
  initMenuAudio();
}
