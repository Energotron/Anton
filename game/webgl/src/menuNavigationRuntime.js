import { RANGER_CLASSES, RANGER_RACES } from './rangerStartProfiles.js';

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

function callStartNewGame(doc, win, button, selection) {
  if (button.dataset.kr3Starting === '1') return;
  button.dataset.kr3Starting = '1';
  button.disabled = true;

  let attempts = 0;
  const invoke = () => {
    attempts += 1;
    if (typeof win.startNewGame === 'function') {
      try {
        win.startNewGame(selection);
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

function setupChoiceButton(button, selected, onSelect) {
  const sync = () => {
    const active = selected();
    button.style.borderColor = active ? '#ffd77a' : '#52627d';
    button.style.background = active ? 'rgba(255,215,122,.14)' : 'rgba(20,31,50,.9)';
    button.style.color = active ? '#fff3c4' : '#dce7ff';
  };
  button.addEventListener('click', () => { onSelect(); sync(); });
  sync();
  return sync;
}

function showNewGameSetup(doc, win, launchButton) {
  doc.getElementById('kr3NewGameSetup')?.remove();
  let raceId = RANGER_RACES[0].id;
  let classId = RANGER_CLASSES[0].id;

  const overlay = doc.createElement('div');
  overlay.id = 'kr3NewGameSetup';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.82);display:grid;place-items:center;padding:14px;overflow:auto';
  overlay.innerHTML = `
    <section style="width:min(820px,96vw);max-height:94vh;overflow:auto;background:#0d1524;border:1px solid #52627d;border-radius:16px;padding:18px;box-shadow:0 24px 80px #000;color:#eef4ff;font-family:system-ui,sans-serif">
      <h2 style="margin:0 0 4px;text-align:center">🚀 НОВЫЙ РЕЙНДЖЕР</h2>
      <p style="margin:0 0 16px;text-align:center;opacity:.7;font-size:13px">Раса определяет родной сектор и отношения. Класс — корабль, оборудование, деньги и стартовую зону.</p>
      <h3 style="margin:10px 0 8px;color:#9fc5ff">Раса</h3>
      <div id="kr3RaceChoices" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px"></div>
      <h3 style="margin:16px 0 8px;color:#9fc5ff">Класс рейнджера</h3>
      <div id="kr3ClassChoices" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px"></div>
      <div id="kr3StartSummary" style="margin:16px 0 4px;padding:12px;border-radius:10px;background:rgba(0,0,0,.28);font-size:13px;line-height:1.45"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
        <button type="button" id="kr3SetupCancel" class="mbtn ghost">← НАЗАД</button>
        <button type="button" id="kr3SetupLaunch" class="mbtn">🚀 НАЧАТЬ ИГРУ</button>
      </div>
    </section>`;
  doc.body.appendChild(overlay);

  const raceBox = overlay.querySelector('#kr3RaceChoices');
  const classBox = overlay.querySelector('#kr3ClassChoices');
  const summary = overlay.querySelector('#kr3StartSummary');
  const syncers = [];

  const renderSummary = () => {
    const race = RANGER_RACES.find(item => item.id === raceId);
    const rangerClass = RANGER_CLASSES.find(item => item.id === classId);
    summary.innerHTML = `<b>${race.icon} ${race.name} · ${rangerClass.icon} ${rangerClass.name}</b><br>${race.description}<br>${rangerClass.description}`;
    syncers.forEach(sync => sync());
  };

  RANGER_RACES.forEach(race => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.style.cssText = 'min-height:62px;border:1px solid #52627d;border-radius:10px;padding:9px;cursor:pointer;font:inherit';
    button.innerHTML = `<b>${race.icon} ${race.name}</b>`;
    raceBox.appendChild(button);
    syncers.push(setupChoiceButton(button, () => raceId === race.id, () => { raceId = race.id; renderSummary(); }));
  });

  RANGER_CLASSES.forEach(rangerClass => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.style.cssText = 'min-height:72px;border:1px solid #52627d;border-radius:10px;padding:9px;cursor:pointer;font:inherit;text-align:left';
    button.innerHTML = `<b>${rangerClass.icon} ${rangerClass.name}</b><br><span style="font-size:11px;opacity:.72">${rangerClass.description}</span>`;
    classBox.appendChild(button);
    syncers.push(setupChoiceButton(button, () => classId === rangerClass.id, () => { classId = rangerClass.id; renderSummary(); }));
  });

  renderSummary();
  overlay.querySelector('#kr3SetupCancel')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#kr3SetupLaunch')?.addEventListener('click', () => {
    overlay.remove();
    callStartNewGame(doc, win, launchButton, { raceId, classId });
  });
  overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
}

export function bindMenuNavigation(doc = document, win = window) {
  const oldNewGame = doc.getElementById('btnNewGame');
  if (oldNewGame && !oldNewGame.dataset.kr3SingleStartBound) {
    const newGame = oldNewGame.cloneNode(true);
    newGame.dataset.kr3SingleStartBound = '1';
    newGame.disabled = false;
    oldNewGame.replaceWith(newGame);
    newGame.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showNewGameSetup(doc, win, newGame);
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
