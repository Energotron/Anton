export function endGameSession(doc = document, win = window) {
  try { win.close(); } catch (_) {}
  setTimeout(() => {
    if (!doc || !doc.body) return;
    doc.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;background:#05070f;color:#f3f6ff;font-family:system-ui,sans-serif;text-align:center;padding:24px">
        <section>
          <h1 style="margin:0 0 12px">Космические Рейнджеры 3</h1>
          <p style="opacity:.75">Игра завершена.</p>
          <button id="returnToGame" type="button" style="margin-top:12px;padding:12px 18px;cursor:pointer">Вернуться в главное меню</button>
        </section>
      </main>`;
    doc.getElementById('returnToGame')?.addEventListener('click', () => win.location.reload());
  }, 120);
}

export function goToMainMenu(win = window) {
  win.location.reload();
}

function showStartupError(doc, message) {
  const box = doc.getElementById('errBox');
  if (box) {
    box.style.display = 'block';
    box.textContent = 'Ошибка запуска: ' + message;
  }
}

function callStartNewGame(doc, win, button) {
  if (button.dataset.kr3Starting === '1') return;
  button.dataset.kr3Starting = '1';
  button.disabled = true;

  let attempts = 0;
  const invoke = () => {
    attempts += 1;
    if (typeof win.startNewGame === 'function') {
      try {
        win.startNewGame();
      } catch (err) {
        showStartupError(doc, err?.message || String(err));
      } finally {
        setTimeout(() => {
          button.dataset.kr3Starting = '0';
          button.disabled = false;
        }, 600);
      }
      return;
    }

    // main.js is a module and can finish slightly after this navigation module.
    if (attempts < 20) {
      setTimeout(invoke, 50);
      return;
    }

    button.dataset.kr3Starting = '0';
    button.disabled = false;
    showStartupError(doc, 'основной игровой модуль не загрузился');
  };

  invoke();
}

export function bindMenuNavigation(doc = document, win = window) {
  const oldNewGame = doc.getElementById('btnNewGame');
  if (oldNewGame && !oldNewGame.dataset.kr3SingleStartBound) {
    // main.js historically installs two anonymous click handlers on this button.
    // Replacing the node is the only deterministic way to remove both anonymous
    // listeners without modifying or shrinking the canonical main.js runtime.
    const newGame = oldNewGame.cloneNode(true);
    newGame.dataset.kr3SingleStartBound = '1';
    newGame.disabled = false;
    oldNewGame.replaceWith(newGame);
    newGame.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      callStartNewGame(doc, win, newGame);
    });
  }

  const menuButton = doc.getElementById('menuBtn');
  if (menuButton && !menuButton.dataset.kr3MenuBound) {
    menuButton.dataset.kr3MenuBound = '1';
    menuButton.title = 'Главное меню';
    menuButton.setAttribute('aria-label', 'Открыть меню игры');
    menuButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const existing = doc.getElementById('kr3PauseMenu');
      if (existing) { existing.remove(); return; }
      const overlay = doc.createElement('div');
      overlay.id = 'kr3PauseMenu';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:20px';
      overlay.innerHTML = `
        <div style="width:min(420px,92vw);background:#101726;border:1px solid #52627d;border-radius:14px;padding:22px;display:grid;gap:12px;box-shadow:0 18px 60px #000">
          <h2 style="margin:0;color:#fff;text-align:center">МЕНЮ ИГРЫ</h2>
          <button type="button" id="kr3ResumeBtn" class="mbtn">▶ ПРОДОЛЖИТЬ</button>
          <button type="button" id="kr3MainMenuBtn" class="mbtn">⌂ ГЛАВНОЕ МЕНЮ</button>
        </div>`;
      doc.body.appendChild(overlay);
      overlay.querySelector('#kr3ResumeBtn')?.addEventListener('click', () => overlay.remove());
      overlay.querySelector('#kr3MainMenuBtn')?.addEventListener('click', () => goToMainMenu(win));
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }, true);
  }

  const mainMenu = doc.getElementById('menuInner');
  if (mainMenu && !doc.getElementById('btnExitGame')) {
    const exit = doc.createElement('button');
    exit.className = 'mbtn ghost';
    exit.id = 'btnExitGame';
    exit.type = 'button';
    exit.textContent = '⏻ ВЫХОД ИЗ ИГРЫ';
    exit.addEventListener('click', () => endGameSession(doc, win));
    mainMenu.appendChild(exit);
  }
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  bindMenuNavigation(document, window);
}
