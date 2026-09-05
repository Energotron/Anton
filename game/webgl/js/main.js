/**
 * КР3 WebGL v3.5 — яркий космос, свободный курс, миникарта, 70 систем, гиперпрыжок
 */
import * as THREE from 'three';
import { TAU, rnd, rndi, pick, clamp, dist, fmt, easeIO, mulberry } from './math.js';
import { FACS, WEAPONS, ENGINES, SHIELDS, HULLS, CARGOS, RADARS, SHOPCATS, RANKS, SYSNAMES, GOODS, ECON, goodById, DAY_TURNS } from './data.js';
import { SYSNAMES_EXT } from './assets.js';
import { WebGLRenderer } from './WebGLRenderer.js';
import { applyTradeReputation } from '../src/tradeReputationCore.js';
import { applyPlayerHit, consumeMissileAmmo } from '../src/combatDamageCore.js';
import { applyAttackReputation } from '../src/combatReputationCore.js';
import { npcAggressionResponse } from '../src/npcAggressionResponseCore.js';
import { findDistressResponder } from '../src/npcDistressCallCore.js';
import { normalizeSystemWanted, recordSystemWanted, shouldRecordSystemWanted, systemWantedStatus, wantedPortAccess } from '../src/systemWantedCore.js';
import { buildRangerStartProfile } from '../src/rangerStartProfiles.js';

function showErr(m) {
  try { const b = document.getElementById('errBox'); b.style.display = 'block'; b.textContent = 'Ошибка: ' + m; } catch (e) {}
}
window.addEventListener('error', e => showErr(e.message || 'unknown'));
window.addEventListener('unhandledrejection', e => showErr(String(e.reason)));

// ---------- Audio ----------
let AC = null, muted = false, musicOn = true;
let musicAudio = null, musicIndex = 0, musicGen = 0;
let musicNodes = null; // procedural ambient: { oscs, gains, master, stop }
const MENU_ANTHEM = 'music/menu-anthem.mp3';
const MUSIC_TRACKS = [
  'music/fei.mp3',
  'music/fighter.mp3',
  'music/flight.mp3',
  'music/gaal.mp3',
  'music/human.mp3',
  'music/maloc.mp3',
  'music/peleng.mp3',
  'music/quasar.mp3'
];
function initAudio() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
  } catch (e) {}
}
function playSfx(freq, dur, type = 'square', vol = 0.07, slide) {
  try {
    if (!AC || muted) return;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, AC.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  } catch (e) {}
}
function playNoise(dur, vol, freq = 900) {
  try {
    if (!AC || muted) return;
    const n = Math.floor(AC.sampleRate * dur);
    const b = AC.createBuffer(1, n, AC.sampleRate);
    const ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = AC.createBufferSource(); s.buffer = b;
    const g = AC.createGain(); g.gain.value = vol;
    const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = freq;
    s.connect(fl); fl.connect(g); g.connect(AC.destination); s.start();
  } catch (e) {}
}
const sfx = {
  shoot: () => playSfx(760, 0.08, 'square', 0.05, 240),
  boom: () => { playNoise(0.45, 0.22, 650); playSfx(85, 0.35, 'sine', 0.16, 35); },
  pick: () => { playSfx(520, 0.07, 'sine', 0.09); setTimeout(() => playSfx(780, 0.09, 'sine', 0.09), 60); },
  ui: () => playSfx(440, 0.04, 'triangle', 0.06),
  hit: () => playNoise(0.07, 0.09, 1300),
  turn: () => playSfx(320, 0.12, 'triangle', 0.07),
  jump: () => playSfx(180, 0.8, 'sawtooth', 0.12, 900)
};

/** Procedural space ambient — one layer only, no overlapping tracks */
function startProcMusic() {
  stopMusic();
  if (muted || !musicOn || !AC) return;
  const master = AC.createGain();
  master.gain.value = 0.0;
  master.connect(AC.destination);
  master.gain.linearRampToValueAtTime(0.12, AC.currentTime + 1.2);

  const freqs = [55, 82.5, 110, 164.8, 220];
  const oscs = [], gains = [];
  for (let i = 0; i < freqs.length; i++) {
    const o = AC.createOscillator();
    o.type = i < 2 ? 'sine' : 'triangle';
    o.frequency.value = freqs[i];
    const g = AC.createGain();
    g.gain.value = 0.15 / (i + 1);
    // slow LFO on volume
    const lfo = AC.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.03;
    const lfoG = AC.createGain();
    lfoG.gain.value = 0.08 / (i + 1);
    lfo.connect(lfoG);
    lfoG.connect(g.gain);
    lfo.start();
    o.connect(g);
    g.connect(master);
    o.start();
    oscs.push(o, lfo);
    gains.push(g, lfoG);
  }
  // soft noise pad
  try {
    const n = AC.sampleRate * 2;
    const buf = AC.createBuffer(1, n, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
    const src = AC.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const ng = AC.createGain();
    ng.gain.value = 0.03;
    const fl = AC.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 400;
    src.connect(fl); fl.connect(ng); ng.connect(master);
    src.start();
    oscs.push(src);
    gains.push(ng);
  } catch (e) {}

  musicNodes = { oscs, gains, master };
}

function startMenuMusic() {
  stopMusic();
  if (muted || !musicOn) return;
  // menuAnthemRuntime owns the only menu audio element. It handles autoplay,
  // looping, browser gesture recovery and stopping when gameplay starts.
  const start = () => window.KR3MenuAnthem?.autoplay?.();
  start();
  if (!window.KR3MenuAnthem) queueMicrotask(start);
}

function startMusic() {
  stopMusic();
  if (muted || !musicOn) return;
  initAudio();
  musicGen++;
  const gen = musicGen;
  // Prefer file tracks if present; fall back to procedural after first error
  musicIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
  playNextTrack(gen, 0);
}

function playNextTrack(gen, failCount) {
  if (gen !== musicGen || muted || !musicOn) return;
  if (failCount >= MUSIC_TRACKS.length) {
    // all files missing → procedural ambient (single stream)
    startProcMusic();
    return;
  }
  // stop previous HTMLAudio completely
  if (musicAudio) {
    try {
      musicAudio.onended = null;
      musicAudio.onerror = null;
      musicAudio.pause();
      musicAudio.removeAttribute('src');
      musicAudio.load();
    } catch (e) {}
    musicAudio = null;
  }
  const a = new Audio(MUSIC_TRACKS[musicIndex]);
  a.volume = 0.35;
  musicAudio = a;
  a.onended = () => {
    if (gen !== musicGen || muted || !musicOn) return;
    musicIndex = (musicIndex + 1) % MUSIC_TRACKS.length;
    playNextTrack(gen, 0);
  };
  a.onerror = () => {
    if (gen !== musicGen) return;
    musicIndex = (musicIndex + 1) % MUSIC_TRACKS.length;
    playNextTrack(gen, (failCount || 0) + 1);
  };
  a.play().catch(() => {
    if (gen !== musicGen) return;
    musicIndex = (musicIndex + 1) % MUSIC_TRACKS.length;
    playNextTrack(gen, (failCount || 0) + 1);
  });
}

function stopMusic() {
  musicGen++; // invalidate any pending callbacks
  if (musicAudio) {
    try {
      musicAudio.onended = null;
      musicAudio.onerror = null;
      musicAudio.pause();
      musicAudio.removeAttribute('src');
      musicAudio.load();
    } catch (e) {}
    musicAudio = null;
  }
  if (musicNodes) {
    try {
      const { oscs, master } = musicNodes;
      if (master && AC) {
        master.gain.cancelScheduledValues(AC.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, AC.currentTime + 0.3);
      }
      setTimeout(() => {
        try {
          for (const o of oscs) {
            if (o.stop) o.stop();
            if (o.disconnect) o.disconnect();
          }
          if (master) master.disconnect();
        } catch (e) {}
      }, 350);
    } catch (e) {}
    musicNodes = null;
  }
}

// ---------- Galaxy: 70 systems ----------
const NUM_SYS = 70;
let systems = [];
function genGalaxy() {
  const R = mulberry(2026);
  const names = (SYSNAMES_EXT && SYSNAMES_EXT.length >= NUM_SYS)
    ? SYSNAMES_EXT.slice(0, NUM_SYS)
    : [...SYSNAMES];
  while (names.length < NUM_SYS) names.push('Система-' + names.length);
  // shuffle
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  systems = [];
  for (let i = 0; i < NUM_SYS; i++) {
    let x = 0, y = 0, ok = false, tries = 0;
    while (!ok && tries < 400) {
      ok = true;
      x = 40 + R() * 920;
      y = 40 + R() * 620;
      for (const s of systems) {
        if (dist(x, y, s.x, s.y) < 55) { ok = false; break; }
      }
      tries++;
    }
    systems.push({
      id: i,
      name: names[i],
      x, y,
      fac: pick(['fed', 'fed', 'mal', 'pel', 'fei', 'gaal', 'kla']),
      danger: 1 + Math.floor(R() * 5),
      starC: pick(['#ffd27a', '#ff9a5c', '#9ecbff', '#fff3c4', '#ff7a6e', '#c0ff90']),
      links: [],
      planets: []
    });
  }
  // links: nearest 2-3
  for (const s of systems) {
    const near = systems.filter(o => o !== s)
      .sort((a, b) => dist(s.x, s.y, a.x, a.y) - dist(s.x, s.y, b.x, b.y));
    for (let k = 0; k < 2; k++) {
      const o = near[k];
      if (s.links.indexOf(o.id) < 0) s.links.push(o.id);
      if (o.links.indexOf(s.id) < 0) o.links.push(s.id);
    }
  }
  // ensure connectivity
  function comp() {
    const seen = new Set([0]);
    const st = [0];
    while (st.length) {
      const c = st.pop();
      for (const l of systems[c].links) {
        if (!seen.has(l)) { seen.add(l); st.push(l); }
      }
    }
    return seen;
  }
  let guard = 0;
  while (comp().size < NUM_SYS && guard < 300) {
    guard++;
    const seen = comp();
    let best = null, bd = 1e9;
    for (let a = 0; a < NUM_SYS; a++) for (let b = 0; b < NUM_SYS; b++) {
      if (seen.has(a) === seen.has(b)) continue;
      const d = dist(systems[a].x, systems[a].y, systems[b].x, systems[b].y);
      if (d < bd) { bd = d; best = [a, b]; }
    }
    if (best) {
      systems[best[0]].links.push(best[1]);
      systems[best[1]].links.push(best[0]);
    } else break;
  }
  // planets per system (like Space Rangers 2)
  const PN = ['Терра', 'Нова', 'Вега', 'Хор', 'Зар', 'Мир', 'Тал', 'Ора', 'Кесс', 'Дун', 'Аш', 'Бел', 'Крон', 'Фей', 'Гал'];
  for (const s of systems) {
    const np = 2 + Math.floor(R() * 3);
    for (let j = 0; j < np; j++) {
      const type = pick(['rock', 'rock', 'ice', 'lava', 'tech', 'gas']);
      s.planets.push({
        name: pick(PN) + pick(['а', 'ис', 'ос', 'ум', 'ея', 'ар', 'ион', 'ара']) + (R() < 0.3 ? '-2' : ''),
        type,
        orbit: 180 + j * 160 + R() * 60,
        size: 24 + R() * 34,
        spd: (0.05 + R() * 0.05) / (j * 0.5 + 1),
        ang: R() * TAU,
        ring: type === 'gas' && R() < 0.6,
        econ: pick(['agr', 'ind', 'min', 'rich', 'tech', 'port']),
        hasPort: type !== 'gas' && R() < 0.92,
        prices: {},
        stock: {}
      });
    }
  }
}

// ---------- State ----------
const P = {
  x: 200, y: 140, face: 0.6,
  money: 8000, fuel: 120, maxFuel: 120, missiles: 8, xp: 0, kills: 0,
  hull: 100, maxHull: 100, shield: 60, maxShield: 60, shieldReg: 5,
  maxSpeed: 240, cap: 35, radar: 540,
  eq: { w: 1, e: 1, s: 1, h: 0, c: 1, r: 1 },
  weapon: WEAPONS[1],
  docked: null,
  lastPort: { sys: 0, pl: 0 },
  cargo: {},
  raceId: 'fed', classId: 'trader',
  rep: { fed: 10, mal: 5, pel: 5, fei: 5, gaal: 5, kla: -60, pir: -40 }
};
function applyEquip() {
  const hp = P.maxHull ? P.hull / P.maxHull : 1;
  const sp = P.maxShield ? P.shield / P.maxShield : 1;
  P.maxHull = HULLS[P.eq.h].hp;
  P.hull = Math.max(1, hp * P.maxHull);
  P.maxShield = SHIELDS[P.eq.s].cap;
  P.shield = Math.min(P.maxShield, sp * P.maxShield);
  P.shieldReg = SHIELDS[P.eq.s].reg;
  P.maxSpeed = ENGINES[P.eq.e].spd;
  P.cap = CARGOS[P.eq.c].cap;
  P.radar = RADARS[P.eq.r].r;
  P.weapon = WEAPONS[P.eq.w];
}
function cargoUsed() {
  let s = 0;
  for (const k in P.cargo) s += P.cargo[k] || 0;
  return s;
}
function planetPos(pl, idx) {
  // prefer live mesh position if available
  if (R && R.planetMeshes && idx != null && R.planetMeshes[idx]) {
    const m = R.planetMeshes[idx];
    return { x: m.position.x, y: m.position.y };
  }
  return { x: Math.cos(pl.ang) * pl.orbit, y: Math.sin(pl.ang) * pl.orbit };
}
function rollPrices(pl) {
  for (let i = 0; i < GOODS.length; i++) {
    const g = GOODS[i];
    const ec = ECON[pl.econ] || ECON.port;
    const f = ec.prod.indexOf(g.id) >= 0 ? 0.55 : (ec.cons.indexOf(g.id) >= 0 ? 1.5 : 1);
    pl.prices[g.id] = Math.max(3, Math.round(g.b * f * (0.85 + Math.random() * 0.3)));
    pl.stock[g.id] = ec.prod.indexOf(g.id) >= 0 ? rndi(60, 140) : (ec.cons.indexOf(g.id) >= 0 ? rndi(4, 18) : rndi(12, 40));
  }
}
function curPlanet() {
  const S = systems[G.sysId];
  return (P.docked !== null && S && S.planets[P.docked]) ? S.planets[P.docked] : null;
}
function nearPlanet() {
  if (P.docked !== null || undocking) return null;
  const S = systems[G.sysId];
  if (!S || !S.planets) return null;
  for (let i = 0; i < S.planets.length; i++) {
    const pl = S.planets[i];
    if (!pl.hasPort) continue;
    const pp = planetPos(pl, i);
    if (dist(P.x, P.y, pp.x, pp.y) < pl.size + 45) return i;
  }
  return null;
}
const G = {
  state: 'menu', // menu | demo | game | galaxy | warp
  phase: 'player',
  t: 0, day: 1, turn: 1,
  // calendar: game starts 01.01.3500, 1 turn = 1 day
  date: { year: 3500, month: 1, day: 1 },
  shake: 0, sysId: 0,
  moveTarget: null, targetShip: null, shotMode: 'laser',
  anim: null, visited: new Set([0]),
  warpT: 0, warpTo: 0, warpDone: false, warpFrom: -1,
  panel: null, offers: [], shopTab: 0, tradeReputationTurns: {}, systemWantedUntil: {},
  // camera: follow player or free pan
  camFollow: true, camX: 0, camY: 0,
  news: []
};

/** Persistent NPC ships per system (SR2-style — no respawn from void) */
const systemShips = {};
let uidCounter = 1000;
const SAVE_KEY = 'kr3_save_slot0';
const SAVE_META = 'kr3_save_meta';

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}
function resetDate() {
  G.date = { year: 3500, month: 1, day: 1 };
}
function advanceDate(n = 1) {
  let left = n;
  while (left > 0) {
    G.date.day++;
    left--;
    const md = MONTH_DAYS[G.date.month - 1] + (G.date.month === 2 && isLeap(G.date.year) ? 1 : 0);
    if (G.date.day > md) {
      G.date.day = 1;
      G.date.month++;
      if (G.date.month > 12) {
        G.date.month = 1;
        G.date.year++;
      }
    }
  }
}
function formatDate() {
  const d = G.date;
  const dd = String(d.day).padStart(2, '0');
  const mm = String(d.month).padStart(2, '0');
  return `${dd}.${mm}.${d.year}`;
}

function $(id) { return document.getElementById(id); }
function toast(msg, cls = '') {
  const d = document.createElement('div');
  d.className = 'toast ' + cls; d.textContent = msg;
  const box = $('toasts'); box.appendChild(d);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity .4s'; setTimeout(() => d.remove(), 400); }, 3400);
}

const canvas = $('cv');
const mmCanvas = $('mm');
const mmCtx = mmCanvas ? mmCanvas.getContext('2d') : null;
const R = new WebGLRenderer(canvas);

// Minimap: LMB = course, RMB / Shift+LMB = pan camera
if (mmCanvas) {
  mmCanvas.style.pointerEvents = 'auto';
  mmCanvas.style.cursor = 'crosshair';
  mmCanvas.addEventListener('contextmenu', e => e.preventDefault());
  mmCanvas.addEventListener('pointerdown', e => {
    e.stopPropagation();
    e.preventDefault();
    if (G.state !== 'demo' && G.state !== 'game') return;
    if (P.docked !== null) return;
    initAudio();
    const rect = mmCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width * 264;
    const my = (e.clientY - rect.top) / rect.height * 264;
    // minimap is centered on camera (or player if follow)
    const cx = G.camFollow ? P.x : G.camX;
    const cy = G.camFollow ? P.y : G.camY;
    const radar = Math.max(700, P.radar || 900);
    const k = 120 / radar;
    const wx = cx + (mx - 132) / k;
    const wy = cy + (my - 132) / k;
    if (e.button === 2 || e.shiftKey) {
      // pan camera to point
      G.camFollow = false;
      G.camX = wx;
      G.camY = wy;
      sfx.ui();
      toast('📷 Камера → точка на миникарте');
      return;
    }
    if (!canCommand()) return;
    G.moveTarget = { x: wx, y: wy };
    G.targetShip = null;
    sfx.ui();
    toast(`📍 Курс по миникарте (${Math.round(dist(P.x, P.y, wx, wy))} м)`);
  });
}

// Canvas drag (middle / right button) = pan camera
let camDrag = null;
canvas.addEventListener('pointerdown', e => {
  if (G.state !== 'demo' && G.state !== 'game') return;
  if (e.button === 1 || e.button === 2) {
    e.preventDefault();
    camDrag = { x: e.clientX, y: e.clientY, cx: G.camFollow ? P.x : G.camX, cy: G.camFollow ? P.y : G.camY };
    G.camFollow = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }
});
canvas.addEventListener('pointermove', e => {
  if (!camDrag) return;
  const aspect = R.W / Math.max(1, R.H);
  const halfW = R.viewSize * aspect;
  const halfH = R.viewSize;
  const dx = (e.clientX - camDrag.x) / Math.max(1, R.W) * halfW * 2;
  const dy = -(e.clientY - camDrag.y) / Math.max(1, R.H) * halfH * 2;
  G.camX = camDrag.cx - dx;
  G.camY = camDrag.cy - dy;
});
canvas.addEventListener('pointerup', e => {
  if (camDrag) {
    camDrag = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());


let demoShips = [];
let keys = {};
let undocking = false; // lock after takeoff so click doesn't re-dock / freeze

function screenToWorld(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((cx - rect.left) / rect.width) * 2 - 1;
  const ndcY = -(((cy - rect.top) / rect.height) * 2 - 1);
  const aspect = R.W / R.H;
  const halfW = R.viewSize * aspect;
  const halfH = R.viewSize;
  return { x: R.camera.position.x + ndcX * halfW, y: R.camera.position.y + ndcY * halfH };
}
function canCommand() {
  return (G.state === 'demo' || G.state === 'game') && G.phase === 'player' && !G.anim && P.docked === null;
}

// ---------- Input ----------
canvas.addEventListener('pointerdown', e => {
  if (G.state === 'galaxy') {
    handleGalaxyClick(e.clientX, e.clientY);
    return;
  }
  // middle/right handled by camera pan
  if (e.button === 1 || e.button === 2) return;
  if (P.docked !== null || undocking) return;
  if (!canCommand()) return;
  initAudio();
  const w = screenToWorld(e.clientX, e.clientY);
  // click near planet with port → land
  const S = systems[G.sysId];
  if (S && S.planets) {
    for (let i = 0; i < S.planets.length; i++) {
      const pl = S.planets[i];
      if (!pl.hasPort) continue;
      const pp = planetPos(pl, i);
      if (dist(w.x, w.y, pp.x, pp.y) < pl.size + 50) {
        if (dist(P.x, P.y, pp.x, pp.y) < pl.size + 55) {
          dockPlanet(i);
        } else {
          G.moveTarget = { x: pp.x, y: pp.y };
          toast('Курс на порт: ' + pl.name);
          sfx.ui();
        }
        return;
      }
    }
  }
  for (const s of demoShips) {
    if (dist(w.x, w.y, s.x, s.y) < 40) {
      G.targetShip = (G.targetShip === s.uid) ? null : s.uid;
      G.moveTarget = null;
      sfx.ui();
      toast(G.targetShip ? `Цель: ${s.type}` : 'Цель снята');
      return;
    }
  }
  // FREE COURSE — no maxSpeed clamp
  if (dist(P.x, P.y, w.x, w.y) > 12) {
    G.moveTarget = { x: w.x, y: w.y };
    sfx.ui();
  } else {
    G.moveTarget = null;
  }
});

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  initAudio();
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); execTurn(false); }
  if (e.code === 'KeyQ') toggleMissile();
  if (e.code === 'KeyM') {
    if (G.state === 'galaxy') closeGalaxy();
    else if (G.state === 'demo' || G.state === 'game') openGalaxy();
  }
  if (e.code === 'KeyB' || e.code === 'KeyI') {
    if (G.state === 'demo' || G.state === 'game') openShipPanel();
  }
  if (e.code === 'KeyN') {
    if (G.state === 'demo' || G.state === 'game') openInfoCenter();
  }
  if (e.code === 'KeyC') {
    if (G.state === 'demo' || G.state === 'game') {
      G.camFollow = !G.camFollow;
      if (G.camFollow) { G.camX = P.x; G.camY = P.y; }
      toast(G.camFollow ? '📷 Камера: следование' : '📷 Камера: свободно (ПКМ/СКМ тянуть, Shift+миникарта)');
      sfx.ui();
    }
  }
  if (e.code === 'KeyF5') { e.preventDefault(); saveGame(0); }
  if (e.code === 'KeyF9') { e.preventDefault(); loadGame(0); }
  if (e.code === 'Escape') {
    if (G.state === 'galaxy') closeGalaxy();
    else if (G.panel) {
      G.panel = null;
      $('panel')?.classList.add('hidden');
      $('panel') && ($('panel').innerHTML = '');
    } else if (G.state === 'demo' || G.state === 'game') {
      G.state = 'menu'; startMenuMusic();
      $('menu').classList.remove('hidden'); showHud(false);
      $('galClose').classList.add('hidden');
      refreshContinueBtn();
    }
  }
  // Shift+WASD / arrows = pan camera; without Shift = course
  {
    let dx = 0, dy = 0;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') dy = 1;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') dy = -1;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') dx = -1;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') dx = 1;
    if (dx || dy) {
      const m = Math.hypot(dx, dy) || 1;
      if (e.shiftKey || !G.camFollow) {
        G.camFollow = false;
        const step = R.viewSize * 0.35;
        G.camX += (dx / m) * step;
        G.camY += (dy / m) * step;
      } else if (canCommand()) {
        G.moveTarget = {
          x: P.x + (dx / m) * P.maxSpeed * 1.5,
          y: P.y + (dy / m) * P.maxSpeed * 1.5
        };
        sfx.ui();
      }
    }
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ---------- Turn system (movement uses full path but can be long) ----------
function toggleMissile() {
  if (G.shotMode === 'missile') { G.shotMode = 'laser'; toast('Режим: лазер'); return; }
  if (P.missiles <= 0) { toast('Нет ракет', 'bad'); return; }
  G.shotMode = 'missile'; toast('🚀 Ракетный залп', 'good');
}

function resolvePlayerShot() {
  let missile = G.shotMode === 'missile';
  if (missile && P.missiles <= 0) { missile = false; G.shotMode = 'laser'; }
  const rng = missile ? 560 : (P.weapon.range || 400);
  let tgt = G.targetShip ? demoShips.find(s => s.uid === G.targetShip) : null;
  if (tgt && dist(P.x, P.y, tgt.x, tgt.y) > rng) { toast('Цель вне дальности', 'bad'); tgt = null; }
  if (!tgt) {
    let bd = rng;
    for (const s of demoShips) {
      if (s.fac !== 'pir') continue;
      const d = dist(P.x, P.y, s.x, s.y);
      if (d <= bd) { bd = d; tgt = s; }
    }
  }
  if (!tgt) return;
  G.shotMode = 'laser';
  R.shot(P.x, P.y, tgt.x, tgt.y, missile ? '#ffb347' : (P.weapon.c || '#7dd8ff'));
  sfx.shoot();
  P.missiles = consumeMissileAmmo(P.missiles, missile);
  if (Math.random() < 0.9) {
    const hit = applyPlayerHit({ hull: tgt.hull, weaponDamage: P.weapon?.dmg, missile });
    tgt.hull = hit.hull;
    const wantedBeforeHit = systemWantedStatus(G.systemWantedUntil, G.sysId, G.turn).active;
    const recordsCrime = shouldRecordSystemWanted({
      faction: tgt.fac,
      alreadyAggressed: tgt.playerAggressed,
      wantedActive: wantedBeforeHit,
    });
    const aggression = applyAttackReputation({
      reputation: P.rep,
      faction: tgt.fac,
      alreadyAggressed: tgt.playerAggressed,
    });
    P.rep = aggression.reputation;
    let distressResponder = null;
    if (recordsCrime) {
      G.systemWantedUntil = recordSystemWanted(G.systemWantedUntil, G.sysId, G.turn);
    }
    if (aggression.applied) {
      tgt.playerAggressed = true;
      distressResponder = findDistressResponder(tgt, demoShips);
      if (distressResponder) distressResponder.playerAggressed = true;
    }
    const reputationNote = aggression.delta
      ? ` · репутация ${aggression.delta > 0 ? '+' : ''}${aggression.delta}`
      : '';
    const distressNote = distressResponder ? ` · SOS: патруль #${distressResponder.uid}` : '';
    const wanted = systemWantedStatus(G.systemWantedUntil, G.sysId, G.turn);
    const wantedNote = recordsCrime && wanted.active ? ` · розыск ${wanted.remainingTurns} ходов` : '';
    R.boom(tgt.x, tgt.y, hit.destroyed ? 28 : 13, FACS[tgt.fac]?.c || '#ff7043');
    if (!hit.destroyed) {
      sfx.hit(); G.shake = 3;
      toast(`🎯 Попадание −${hit.damage} · корпус ${Math.ceil(hit.hull)}${reputationNote}${distressNote}${wantedNote}`, recordsCrime ? 'bad' : '');
      return;
    }
    sfx.boom(); G.shake = 7;
    R.removeShip(tgt.uid);
    demoShips = demoShips.filter(s => s.uid !== tgt.uid);
    G.targetShip = null;
    P.kills++; P.xp += 18;
    toast(`☠️ Уничтожен${reputationNote}${distressNote}${wantedNote}`, recordsCrime ? 'bad' : 'good');
    setTimeout(() => {
      if (G.state === 'menu') return;
      const S = systems[G.sysId];
      if (!S || !S.planets || !S.planets.length) return;
      // reinforcements leave from a planet, not empty space
      const pi = rndi(0, S.planets.length - 1);
      const pos = spawnNearPlanet(S, pi, 60);
      const ns = {
        uid: uidCounter++, type: Math.random() < 0.3 ? 'raider' : 'pirate', fac: 'pir',
        x: pos.x, y: pos.y, ang: pos.ang, spd: 130 + Math.random() * 40,
        wp: pi, hull: 35
      };
      demoShips.push(ns); R.addShip(ns);
      saveShipsToSystem(G.sysId);
    }, 4500);
  } else toast('Промах!');
}

function execTurn(waitMode) {
  if (!canCommand()) return;
  initAudio(); sfx.turn();
  const movers = [];
  if (!waitMode && G.moveTarget) {
    // FREE: move full distance to target in one turn (no radius limit)
    const tx = G.moveTarget.x, ty = G.moveTarget.y;
    if (tx !== P.x || ty !== P.y) {
      movers.push({ o: P, x0: P.x, y0: P.y, x1: tx, y1: ty });
      P.face = Math.atan2(ty - P.y, tx - P.x);
      P.x = tx; P.y = ty;
    }
    G.moveTarget = null;
  }
  resolvePlayerShot();
  G.phase = 'anim';
  G.anim = { t: 0, dur: movers.length ? 0.6 : 0.3, movers, after: 'enemy' };
  setButtons(false);
}

function enemyPhase() {
  const movers = [];
  const S = systems[G.sysId];
  const nPl = S && S.planets ? S.planets.length : 0;
  const systemWanted = systemWantedStatus(G.systemWantedUntil, G.sysId, G.turn).active;
  for (const s of demoShips) {
    // waypoint: planet index or {x,y}
    let tx, ty;
    const aggressionResponse = npcAggressionResponse(s, P, { systemWanted });
    if (aggressionResponse.overrideNavigation) {
      tx = aggressionResponse.targetX;
      ty = aggressionResponse.targetY;
    } else if (typeof s.wp === 'number' && nPl > 0) {
      const pp = planetWorldPos(S, s.wp % nPl);
      tx = pp.x; ty = pp.y;
      if (dist(s.x, s.y, tx, ty) < 55) {
        s.wp = rndi(0, nPl - 1); // next planet
        const pp2 = planetWorldPos(S, s.wp);
        tx = pp2.x; ty = pp2.y;
      }
    } else if (s.wp && s.wp.x != null) {
      tx = s.wp.x; ty = s.wp.y;
      if (dist(s.x, s.y, tx, ty) < 50 && nPl > 0) {
        s.wp = rndi(0, nPl - 1);
        const pp = planetWorldPos(S, s.wp);
        tx = pp.x; ty = pp.y;
      }
    } else if (nPl > 0) {
      s.wp = rndi(0, nPl - 1);
      const pp = planetWorldPos(S, s.wp);
      tx = pp.x; ty = pp.y;
    } else {
      continue;
    }
    const dx = tx - s.x, dy = ty - s.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, (s.spd || 80) * 0.5);
    const nx = s.x + (dx / d) * step, ny = s.y + (dy / d) * step;
    s.ang = Math.atan2(dy, dx);
    movers.push({ o: s, x0: s.x, y0: s.y, x1: nx, y1: ny });
    s.x = nx; s.y = ny;
    if ((s.fac === 'pir' || aggressionResponse.canFire) && dist(s.x, s.y, P.x, P.y) < 420 && Math.random() < 0.32) {
      R.shot(s.x, s.y, P.x, P.y, FACS[s.fac]?.c || FACS.pir.c); sfx.shoot();
      if (Math.random() < 0.5) {
        const dmg = 6 + rndi(0, 8);
        if (P.shield > 0) P.shield = Math.max(0, P.shield - dmg);
        else P.hull = Math.max(0, P.hull - dmg);
        G.shake = 5; sfx.hit();
        toast(`💥 −${dmg}`, 'bad');
        if (P.hull <= 0) {
          P.hull = P.maxHull * 0.55; P.shield = P.maxShield * 0.4;
          // respawn near last port / outer edge of a planet — not random void
          if (S && S.planets && S.planets.length) {
            const pi = P.lastPort && P.lastPort.sys === G.sysId ? P.lastPort.pl : 0;
            const pos = spawnNearPlanet(S, Math.min(pi, S.planets.length - 1), 100);
            P.x = pos.x; P.y = pos.y;
          } else { P.x = 180; P.y = 120; }
          toast('💀 Возрождение у планеты', 'bad');
        }
      }
    }
  }
  G.anim = { t: 0, dur: movers.length ? 0.65 : 0.3, movers, after: 'end' };
}

function endTurn() {
  G.turn++;
  G.day++; // 1 ход = 1 день
  advanceDate(1);
  try {
    const S = systems[G.sysId];
    if (R && typeof R.advanceOrbits === 'function') {
      R.advanceOrbits(1, S && S.planets ? S.planets : null);
    }
  } catch (e) { console.warn('advanceOrbits', e); }
  saveShipsToSystem(G.sysId);
  maybeDailyNews();
  P.shield = Math.min(P.maxShield, P.shield + (P.shieldReg || 4));
  G.phase = 'player';
  G.anim = null;
  setButtons(true);
}

// ---------- Ships (SR2-style: persist per system, spawn only from planets) ----------
function saveShipsToSystem(sysId) {
  if (sysId == null || sysId < 0) return;
  systemShips[sysId] = demoShips.map(s => ({
    uid: s.uid, type: s.type, fac: s.fac,
    x: s.x, y: s.y, ang: s.ang || 0, spd: s.spd || 80,
    wp: s.wp != null ? s.wp : null, hull: s.hull,
    playerAggressed: !!s.playerAggressed
  }));
}

function planetWorldPos(S, plIdx) {
  const pl = S.planets[plIdx];
  if (!pl) return { x: 0, y: 0 };
  // prefer live mesh
  if (R && R.planetMeshes && R.planetMeshes[plIdx]) {
    return { x: R.planetMeshes[plIdx].position.x, y: R.planetMeshes[plIdx].position.y };
  }
  return { x: Math.cos(pl.ang) * pl.orbit, y: Math.sin(pl.ang) * pl.orbit };
}

function spawnNearPlanet(S, plIdx, extraR = 40) {
  const pl = S.planets[plIdx];
  const pp = planetWorldPos(S, plIdx);
  const a = Math.random() * TAU;
  const r = (pl ? pl.size : 30) + extraR + Math.random() * 35;
  return { x: pp.x + Math.cos(a) * r, y: pp.y + Math.sin(a) * r, ang: a + Math.PI };
}

/** First visit: ships leave from planets/ports only — never from empty space */
function spawnShipsFromPlanets(S) {
  demoShips = [];
  const ports = [];
  for (let i = 0; i < (S.planets || []).length; i++) {
    if (S.planets[i].hasPort) ports.push(i);
  }
  const allPl = (S.planets || []).map((_, i) => i);
  const launchPads = ports.length ? ports : allPl;
  if (!launchPads.length) return;

  const facs = ['fed', 'mal', 'pel', 'kla'];
  const danger = S.danger || 2;

  // traders leave ports
  for (let i = 0; i < 3; i++) {
    const pi = pick(launchPads);
    const pos = spawnNearPlanet(S, pi, 50);
    const dest = pick(launchPads);
    demoShips.push({
      uid: uidCounter++, type: 'trader', fac: pick(facs),
      x: pos.x, y: pos.y, ang: pos.ang, spd: 60 + rndi(0, 30),
      wp: dest, hull: 40
    });
  }
  // patrols from home faction ports
  for (let i = 0; i < 2; i++) {
    const pi = pick(launchPads);
    const pos = spawnNearPlanet(S, pi, 55);
    demoShips.push({
      uid: uidCounter++, type: 'patrol', fac: S.fac || 'fed',
      x: pos.x, y: pos.y, ang: pos.ang, spd: 90 + rndi(0, 25),
      wp: pick(launchPads), hull: 55
    });
  }
  // pirates emerge from outer planets (not void)
  const outer = allPl.length ? allPl : launchPads;
  for (let i = 0; i < danger + 1; i++) {
    const pi = pick(outer);
    const pos = spawnNearPlanet(S, pi, 70);
    demoShips.push({
      uid: uidCounter++, type: Math.random() < 0.3 ? 'raider' : 'pirate', fac: 'pir',
      x: pos.x, y: pos.y, ang: pos.ang, spd: 120 + rndi(0, 40),
      wp: pick(outer), hull: 35
    });
  }
}

function loadShipsForSystem(sysId) {
  const saved = systemShips[sysId];
  if (saved && saved.length) {
    demoShips = saved.map(s => ({ ...s }));
    return true;
  }
  return false;
}

function applyShipsToRenderer() {
  R.clearShips();
  demoShips.forEach(s => R.addShip(s));
}

/**
 * Enter system. If fromWarp + warpFrom known, player appears at map EDGE
 * in the direction of the jump (visible hyperspace arrival).
 */
function enterSystem(id, opts = {}) {
  try {
    const fromId = opts.fromId != null ? opts.fromId : G.warpFrom;
    const isWarp = !!opts.warp || (fromId >= 0 && fromId !== id);

    // persist ships of the system we're leaving
    if (G.state !== 'menu' && systems[G.sysId] && G.sysId !== id) {
      saveShipsToSystem(G.sysId);
    }

    G.sysId = id;
    G.visited.add(id);
    G.moveTarget = null;
    G.targetShip = null;
    G.phase = 'player';
    G.anim = null;
    P.docked = null;
    const S = systems[id] || systems[0];
    if (!S) {
      toast('Нет системы', 'bad');
      return;
    }
    if (R && typeof R.buildSystemFromData === 'function') {
      R.buildSystemFromData(S);
    } else if (R && typeof R.buildDemoSystem === 'function') {
      R.buildDemoSystem();
    }

    // restore remembered ships or spawn from planets
    if (!loadShipsForSystem(id)) {
      spawnShipsFromPlanets(S);
      saveShipsToSystem(id);
    }
    applyShipsToRenderer();

    // player position
    if (isWarp && fromId >= 0 && systems[fromId]) {
      const from = systems[fromId];
      const dx = S.x - from.x;
      const dy = S.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      // arrive from the edge of the system in jump direction
      const edge = 1100 + Math.random() * 150;
      P.x = -(dx / len) * edge;
      P.y = -(dy / len) * edge;
      P.face = Math.atan2(dy, dx); // face toward star
      G.camFollow = true;
      G.camX = P.x;
      G.camY = P.y;
      toast('🌀 Выход из гиперпространства → ' + S.name, 'good');
    } else {
      // start near a port if any
      const ports = (S.planets || []).map((p, i) => p.hasPort ? i : -1).filter(i => i >= 0);
      if (ports.length) {
        const pos = spawnNearPlanet(S, ports[0], 90);
        P.x = pos.x; P.y = pos.y; P.face = pos.ang;
      } else {
        const a = Math.random() * TAU;
        P.x = Math.cos(a) * 280; P.y = Math.sin(a) * 280;
      }
      G.camFollow = true;
      G.camX = P.x; G.camY = P.y;
      toast('⬢ ' + S.name, 'good');
    }
    G.warpFrom = -1;
  } catch (err) {
    console.error('enterSystem', err);
    showErr('enterSystem: ' + (err && err.message ? err.message : err));
    try {
      if (R) R.buildDemoSystem();
      const S = systems[id] || systems[0];
      if (S) spawnShipsFromPlanets(S);
      applyShipsToRenderer();
    } catch (e2) {}
  }
}

/** legacy alias */
function spawnShips() {
  const S = systems[G.sysId] || systems[0];
  if (!S) return;
  if (!loadShipsForSystem(G.sysId)) spawnShipsFromPlanets(S);
  applyShipsToRenderer();
}

// ---------- Galaxy map ----------
function openGalaxy() {
  if (G.anim || G.phase !== 'player' || P.docked !== null) return;
  G.state = 'galaxy';
  $('galClose').classList.remove('hidden');
  sfx.ui();
}
function closeGalaxy() {
  if (G.state === 'galaxy') {
    G.state = 'demo';
    $('galClose').classList.add('hidden');
  }
}
function galLayout() {
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  for (const s of systems) {
    mnx = Math.min(mnx, s.x); mxx = Math.max(mxx, s.x);
    mny = Math.min(mny, s.y); mxy = Math.max(mxy, s.y);
  }
  const sc = Math.min((R.W - 100) / ((mxx - mnx) || 1), (R.H - 160) / ((mxy - mny) || 1));
  const ox = (R.W - (mxx - mnx) * sc) / 2;
  const oy = (R.H - (mxy - mny) * sc) / 2 - 10;
  return { s: sc, fn: s => [ox + (s.x - mnx) * sc, oy + (s.y - mny) * sc] };
}
function handleGalaxyClick(cx, cy) {
  const lay = galLayout();
  let best = -1, bd = 22;
  for (const s of systems) {
    const p = lay.fn(s);
    const d = dist(cx, cy, p[0], p[1]);
    if (d < bd) { bd = d; best = s.id; }
  }
  if (best < 0) return;
  if (best === G.sysId) { closeGalaxy(); return; }
  const cur = systems[G.sysId];
  if (cur.links.indexOf(best) < 0) {
    toast('Нет прямого гиперперехода', 'bad');
    return;
  }
  const T = systems[best];
  const cost = Math.max(3, Math.round(dist(cur.x, cur.y, T.x, T.y) / 50));
  if (P.fuel < cost) {
    toast(`⛽ Нужно ${cost} топлива`, 'bad');
    return;
  }
  P.fuel -= cost;
  // save ships before leaving
  saveShipsToSystem(G.sysId);
  $('galClose')?.classList.add('hidden');
  hideGalaxyOverlay();
  G.warpFrom = G.sysId;
  G.state = 'warp';
  G.warpT = 0;
  G.warpDone = false;
  G.warpTo = best;
  G.moveTarget = null;
  G.targetShip = null;
  G.anim = null;
  sfx.jump();
  toast(`Гиперпрыжок → ${T.name} (−${cost} ⛽)`);
}

function renderGalaxyOverlay(ctx2d) {
  // drawn on main canvas via 2d overlay after webgl — we use a simple approach:
  // clear with webgl then draw 2d on top using a temporary approach
  // Actually WebGL owns the canvas. Draw galaxy inside WebGL renderer or use 2d overlay div.
  // Simpler: use CSS full-screen canvas overlay for galaxy
}

// We'll draw galaxy on the same canvas by switching: when galaxy mode, use 2d context temporarily
// Three.js WebGL and 2d on same canvas conflict. Use DOM overlay for galaxy map.
let galOverlay = null;
function ensureGalOverlay() {
  if (galOverlay) return galOverlay;
  galOverlay = document.createElement('canvas');
  galOverlay.id = 'galCanvas';
  galOverlay.style.cssText = 'position:fixed;inset:0;z-index:7;display:none;cursor:pointer;';
  document.body.appendChild(galOverlay);
  galOverlay.addEventListener('pointerdown', e => {
    if (G.state === 'galaxy') handleGalaxyClick(e.clientX, e.clientY);
  });
  return galOverlay;
}

function drawGalaxy() {
  const c = ensureGalOverlay();
  c.width = innerWidth * (devicePixelRatio > 1.5 ? 2 : 1);
  c.height = innerHeight * (devicePixelRatio > 1.5 ? 2 : 1);
  c.style.width = innerWidth + 'px';
  c.style.height = innerHeight + 'px';
  c.style.display = 'block';
  const ctx = c.getContext('2d');
  const dpr = c.width / innerWidth;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = innerWidth, H = innerHeight;
  ctx.fillStyle = '#050818';
  ctx.fillRect(0, 0, W, H);
  // stars bg
  ctx.fillStyle = 'rgba(200,220,255,0.5)';
  for (let i = 0; i < 200; i++) {
    ctx.fillRect((i * 97) % W, (i * 53) % H, 1.5, 1.5);
  }
  const lay = galLayout();
  // links
  for (const s of systems) {
    for (const lid of s.links) {
      if (lid > s.id) {
        const a = lay.fn(s), b = lay.fn(systems[lid]);
        ctx.strokeStyle = 'rgba(100,160,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
  }
  // fuel range
  const me = systems[G.sysId];
  const meP = lay.fn(me);
  const maxJ = (P.fuel - 3) * 50 * lay.s;
  ctx.strokeStyle = 'rgba(255,200,80,0.35)';
  ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.arc(meP[0], meP[1], Math.max(0, maxJ), 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  // systems
  for (const s of systems) {
    const p = lay.fn(s);
    const reach = me.links.indexOf(s.id) >= 0;
    ctx.beginPath();
    ctx.fillStyle = FACS[s.fac]?.c || '#fff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = s.id === G.sysId ? 16 : 6;
    ctx.arc(p[0], p[1], s.id === G.sysId ? 8 : 5.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (s.id === G.sysId) {
      ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.arc(p[0], p[1], 12 + 2 * Math.sin(G.t * 4), 0, TAU); ctx.stroke();
    }
    if (reach && s.id !== G.sysId) {
      ctx.strokeStyle = 'rgba(255,220,100,0.9)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (G.visited.has(s.id) || reach || s.id === G.sysId) {
      ctx.fillStyle = 'rgba(220,235,255,0.9)';
      ctx.font = '10px Exo 2,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, p[0], p[1] - 14);
    }
  }
  ctx.fillStyle = '#ffd77a';
  ctx.font = '20px Russo One,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('КАРТА ГАЛАКТИКИ — 70 систем', W / 2, 32);
  ctx.fillStyle = '#9fb8e8';
  ctx.font = '12px Exo 2,sans-serif';
  ctx.fillText('Коснитесь системы с кольцом — гиперпрыжок. Янтарный круг — запас топлива.', W / 2, H - 18);
}

function hideGalaxyOverlay() {
  if (galOverlay) galOverlay.style.display = 'none';
}

// ---------- Active minimap ----------
function drawMinimap() {
  if (!mmCtx || !mmCanvas) return;
  const S = 264;
  mmCtx.clearRect(0, 0, S, S);
  const g = mmCtx.createRadialGradient(132, 132, 10, 132, 132, 130);
  g.addColorStop(0, 'rgba(20,40,80,0.95)');
  g.addColorStop(1, 'rgba(5,10,25,0.98)');
  mmCtx.fillStyle = g;
  mmCtx.beginPath(); mmCtx.arc(132, 132, 130, 0, TAU); mmCtx.fill();
  mmCtx.strokeStyle = 'rgba(100,160,255,0.4)';
  mmCtx.lineWidth = 2;
  mmCtx.beginPath(); mmCtx.arc(132, 132, 128, 0, TAU); mmCtx.stroke();

  const radar = Math.max(700, P.radar || 900);
  const k = 120 / radar;
  // minimap centered on camera
  const ox = G.camFollow ? P.x : G.camX;
  const oy = G.camFollow ? P.y : G.camY;

  if (R.planetMeshes) {
    for (const m of R.planetMeshes) {
      const x = (m.position.x - ox) * k + 132;
      const y = (m.position.y - oy) * k + 132;
      if (Math.hypot(x - 132, y - 132) > 124) continue;
      mmCtx.fillStyle = '#7de0ff';
      mmCtx.beginPath(); mmCtx.arc(x, y, 4, 0, TAU); mmCtx.fill();
    }
  }
  if (R.asteroids) {
    mmCtx.fillStyle = 'rgba(180,160,140,0.5)';
    for (const a of R.asteroids) {
      const x = (a.position.x - ox) * k + 132;
      const y = (a.position.y - oy) * k + 132;
      if (Math.hypot(x - 132, y - 132) > 124) continue;
      mmCtx.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  if (R.stations) {
    mmCtx.fillStyle = '#ffd77a';
    for (const st of R.stations) {
      const x = (st.position.x - ox) * k + 132;
      const y = (st.position.y - oy) * k + 132;
      if (Math.hypot(x - 132, y - 132) > 124) continue;
      mmCtx.fillRect(x - 3, y - 3, 6, 6);
    }
  }
  for (const s of demoShips) {
    const x = (s.x - ox) * k + 132;
    const y = (s.y - oy) * k + 132;
    if (Math.hypot(x - 132, y - 132) > 124) continue;
    mmCtx.fillStyle = s.fac === 'pir' ? '#ff4d5e' : '#66d98c';
    mmCtx.beginPath(); mmCtx.arc(x, y, 3.5, 0, TAU); mmCtx.fill();
    if (G.targetShip === s.uid) {
      mmCtx.strokeStyle = '#ff4d5e';
      mmCtx.strokeRect(x - 6, y - 6, 12, 12);
    }
  }
  if (G.moveTarget) {
    const x = (G.moveTarget.x - ox) * k + 132;
    const y = (G.moveTarget.y - oy) * k + 132;
    mmCtx.strokeStyle = '#ffd77a';
    mmCtx.beginPath(); mmCtx.arc(x, y, 5, 0, TAU); mmCtx.stroke();
  }
  // player (not always center when free cam)
  {
    const px = (P.x - ox) * k + 132;
    const py = (P.y - oy) * k + 132;
    mmCtx.save();
    mmCtx.translate(px, py);
    mmCtx.rotate(P.face);
    mmCtx.fillStyle = '#ffd77a';
    mmCtx.beginPath();
    mmCtx.moveTo(8, 0); mmCtx.lineTo(-5, -5); mmCtx.lineTo(-5, 5);
    mmCtx.closePath(); mmCtx.fill();
    mmCtx.restore();
    if (!G.camFollow) {
      mmCtx.strokeStyle = 'rgba(255,215,120,0.5)';
      mmCtx.beginPath(); mmCtx.arc(px, py, 10, 0, TAU); mmCtx.stroke();
    }
  }
}

// ---------- UI ----------
function showHud(v) {
  $('hud').classList.toggle('hidden', !v);
  $('tbtns').classList.toggle('hidden', !v);
}
function setButtons(active) {
  const dis = !active;
  if ($('bTurn')) $('bTurn').disabled = dis;
  if ($('bWait')) $('bWait').disabled = dis;
  if ($('bMis')) $('bMis').disabled = dis;
}
function updHUD() {
  const S = systems[G.sysId] || { name: '—' };
  $('sysName').textContent = '⬢ ' + S.name;
  const wanted = systemWantedStatus(G.systemWantedUntil, G.sysId, G.turn);
  const wantedLabel = wanted.active ? ` · 🚨 Розыск ${wanted.remainingTurns}` : '';
  $('dayRank').textContent = `${formatDate()} · Ход ${G.turn} · Убито ${P.kills}${wantedLabel}`;
  $('barHull').style.width = Math.max(0, P.hull / P.maxHull * 100) + '%';
  $('barShield').style.width = Math.max(0, P.shield / P.maxShield * 100) + '%';
  $('res').innerHTML = `💰 <b>${fmt(P.money)}</b> ⛽ <b>${Math.round(P.fuel)}</b> 🚀 <b>${P.missiles}</b>`;
  let ph = '—';
  if (G.state === 'galaxy') ph = '🗺 КАРТА ГАЛАКТИКИ';
  else if (G.state === 'warp') ph = '🌀 ГИПЕРПЕРЕХОД…';
  else if (P.docked !== null) ph = '🛬 В ПОРТУ — торговля · ремонт · задания';
  else if (G.phase === 'player') {
    ph = G.shotMode === 'missile' ? '🚀 РАКЕТА — ваш ход' : '⚡ ВАШ ХОД — курс без лимита · M карта';
  } else ph = '⏳ Анимация / противник…';
  $('phase').textContent = ph;
  let ql = '';
  if (P.docked !== null) {
    const pl = curPlanet();
    ql += `<div>🛬 В порту: ${pl ? pl.name : '—'}</div>`;
  } else {
    if (G.moveTarget) ql += `<div>📍 Курс (${Math.round(dist(P.x, P.y, G.moveTarget.x, G.moveTarget.y))} м)</div>`;
    if (G.targetShip) ql += `<div>🎯 Цель выбрана</div>`;
    const np = nearPlanet();
    if (np !== null) ql += `<div style="color:#ffd77a">🛬 Порт рядом — тап по планете для посадки</div>`;
  }
  ql += `<div>Систем: ${G.visited.size}/${NUM_SYS} · M — галактика</div>`;
  $('questLog').innerHTML = ql;
  // context buttons
  let cb = '';
  if (P.docked !== null) {
    cb += `<button type="button" id="ctxDock">🛬 Порт</button>`;
    cb += `<button type="button" id="ctxInfo">📡 Инфо</button>`;
    cb += `<button type="button" id="ctxLeave">🚀 Взлёт</button>`;
  } else if (canCommand()) {
    cb += `<button type="button" id="ctxShip">🚀 Корабль</button>`;
    cb += `<button type="button" id="ctxGal">🗺 Гиперкарта (M)</button>`;
    cb += `<button type="button" id="ctxInfo">📡 Инфо</button>`;
    cb += `<button type="button" id="ctxSave">💾</button>`;
    const np = nearPlanet();
    if (np !== null) cb += `<button type="button" id="ctxLand">🛬 Посадка</button>`;
    if (!G.camFollow) cb += `<button type="button" id="ctxCam">📷 След.</button>`;
    if (G.moveTarget || G.targetShip) cb += `<button type="button" id="ctxClr">✕ Отмена</button>`;
  }
  $('ctx').innerHTML = cb;
  $('ctxShip')?.addEventListener('click', openShipPanel);
  $('ctxGal')?.addEventListener('click', openGalaxy);
  $('ctxInfo')?.addEventListener('click', openInfoCenter);
  $('ctxSave')?.addEventListener('click', () => saveGame(0));
  $('ctxCam')?.addEventListener('click', () => {
    G.camFollow = true; G.camX = P.x; G.camY = P.y;
    toast('📷 Камера: следование'); sfx.ui();
  });
  $('ctxClr')?.addEventListener('click', () => { G.moveTarget = null; G.targetShip = null; sfx.ui(); });
  $('ctxLand')?.addEventListener('click', () => {
    const np = nearPlanet();
    if (np !== null) dockPlanet(np);
  });
  $('ctxDock')?.addEventListener('click', (ev) => { ev.stopPropagation(); openDockPanel(); });
  $('ctxLeave')?.addEventListener('click', (ev) => undock(ev));
  setButtons(canCommand());
  if ($('bMis')) $('bMis').style.borderColor = G.shotMode === 'missile' ? '#ffb347' : '#3d5a8f';
}


// ---------- Ship / Equipment panel ----------
let shopTab = 0;
function openShipPanel() {
  if (!canCommand() && G.phase !== 'player') return;
  G.panel = 'ship';
  renderShipPanel();
  $('panel').classList.remove('hidden');
  sfx.ui();
}
function closeShipPanel() {
  G.panel = null;
  $('panel').classList.add('hidden');
  $('panel').innerHTML = '';
}

// ---------- Docking / Planet port (full SR2-style) ----------
function dockPlanet(idx) {
  if (undocking) return;
  const S = systems[G.sysId];
  if (!S || !S.planets[idx] || !S.planets[idx].hasPort) return;
  if (P.docked !== null) return;
  const portAccess = wantedPortAccess(G.systemWantedUntil, G.sysId, G.turn);
  if (!portAccess.allowed) {
    toast(`🚨 Посадка запрещена: розыск ещё ${portAccess.remainingTurns} ходов`, 'bad');
    sfx.ui();
    return;
  }
  P.docked = idx;
  P.lastPort = { sys: G.sysId, pl: idx };
  rollPrices(S.planets[idx]);
  G.offers = [];
  G.moveTarget = null;
  G.targetShip = null;
  G.panel = 'dock';
  openDockPanel();
  sfx.pick();
  toast('🛬 Посадка: ' + S.planets[idx].name, 'good');
}
function undock(e) {
  if (e) {
    try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
  }
  if (undocking) return;
  undocking = true;
  try {
    const S = systems[G.sysId];
    const idx = P.docked;
    const pl = S && idx !== null && idx !== undefined ? S.planets[idx] : null;
    // fly out far enough that nearPlanet() is false (threshold = size+45)
    if (pl) {
      const pp = planetPos(pl, idx);
      const a = Math.random() * TAU;
      const distOut = (pl.size || 30) + 120;
      P.x = pp.x + Math.cos(a) * distOut;
      P.y = pp.y + Math.sin(a) * distOut;
    }
    P.docked = null;
    G.panel = null;
    G.anim = null;
    G.phase = 'player';
    G.moveTarget = null;
    G.targetShip = null;
    const panel = $('panel');
    if (panel) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
    }
    setButtons(true);
    if (R && typeof R.setPlayer === 'function') R.setPlayer(P);
    sfx.ui();
    toast('🚀 Взлёт с планеты');
  } catch (err) {
    console.error('undock', err);
    showErr('undock: ' + (err && err.message ? err.message : err));
    P.docked = null;
    G.panel = null;
    G.phase = 'player';
    G.anim = null;
  } finally {
    // short lock so the same click can't re-dock via canvas bubble
    setTimeout(() => { undocking = false; }, 400);
  }
}
function openDockPanel() {
  if (P.docked === null || P.docked === undefined) return;
  G.panel = 'dock';
  renderDockPanel();
  $('panel').classList.remove('hidden');
}
function renderDockPanel() {
  const pl = curPlanet();
  if (!pl) {
    // don't call undock recursively from here — just close panel
    P.docked = null;
    G.panel = null;
    const panel = $('panel');
    if (panel) { panel.classList.add('hidden'); panel.innerHTML = ''; }
    return;
  }
  const S = systems[G.sysId];
  const portAccess = wantedPortAccess(G.systemWantedUntil, G.sysId, G.turn);
  if (!portAccess.allowed) {
    $('panel').innerHTML = `<div class="pbox">
      <h2>🚨 Доступ к порту закрыт</h2>
      <div class="evTxt">Власти системы опознали корабль. Обслуживание приостановлено ещё на ${portAccess.remainingTurns} ходов.</div>
      <div class="prow"><button class="btn red" id="dockLeave">🚀 Покинуть порт</button></div>
    </div>`;
    $('dockLeave').onclick = (ev) => undock(ev);
    return;
  }
  const repCost = Math.ceil((P.maxHull - P.hull) * 1.6);
  const fuelCost = Math.ceil((P.maxFuel - P.fuel) * 1.8);
  const econN = (ECON[pl.econ] && ECON[pl.econ].n) || pl.econ;
  $('panel').innerHTML = `<div class="pbox">
    <h2>🛬 Порт — ${pl.name}</h2>
    <div class="sub">Система ${S.name} · ${econN} · ${pl.type}</div>
    <div class="prow">
      <button class="btn" id="dockTrade">🛒 Рынок</button>
      <button class="btn" id="dockShop">🔧 Оборудование</button>
      <button class="btn" id="dockQuests">📋 Задания</button>
      <button class="btn" id="dockInfo">📡 Инфоцентр</button>
    </div>
    <div class="prow">
      <button class="btn green" id="dockRepair" ${P.hull>=P.maxHull||P.money<repCost?'disabled':''}>🛠️ Ремонт — ${fmt(repCost)} кр.</button>
      <button class="btn green" id="dockRefuel" ${P.fuel>=P.maxFuel||P.money<fuelCost?'disabled':''}>⛽ Полный бак — ${fmt(fuelCost)} кр.</button>
      <button class="btn" id="dockBar">🍸 Бар «Чёрная дыра»</button>
    </div>
    <div class="prow">
      <button class="btn red" id="dockLeave">🚀 Покинуть порт</button>
    </div>
  </div>`;
  $('dockLeave').onclick = (ev) => undock(ev);
  $('dockRepair').onclick = () => {
    const c = Math.ceil((P.maxHull - P.hull) * 1.6);
    if (P.money >= c && P.hull < P.maxHull) {
      P.money -= c; P.hull = P.maxHull;
      toast('🛠️ Ремонт завершён', 'good'); sfx.pick();
      renderDockPanel();
    }
  };
  $('dockRefuel').onclick = () => {
    const c = Math.ceil((P.maxFuel - P.fuel) * 1.8);
    if (P.money >= c && P.fuel < P.maxFuel) {
      P.money -= c; P.fuel = P.maxFuel;
      toast('⛽ Бак полный', 'good'); sfx.pick();
      renderDockPanel();
    }
  };
  $('dockShop').onclick = () => { openShipPanel(); };
  $('dockTrade').onclick = () => { renderTradePanel(); };
  $('dockQuests').onclick = () => { renderQuestsPanel(); };
  $('dockInfo').onclick = () => { openInfoCenter(); };
  $('dockBar').onclick = () => {
    const msgs = [
      'Бармен: «Слышал, в соседней системе пираты активизировались.»',
      'Пьяный рейнджер: «Гиперпрыжки нынче дорого стоят…»',
      'Торговец: «На агромирах еда дёшева, а оборудование — втридорога.»',
      'Выпивка освежает. +5 к корпусу (временно).'
    ];
    toast(pick(msgs), 'good');
    P.hull = Math.min(P.maxHull, P.hull + 5);
    sfx.ui();
  };
}
function renderTradePanel() {
  const pl = curPlanet();
  if (!pl) return;
  let rows = '';
  for (const g of GOODS) {
    const price = pl.prices[g.id] || g.b;
    const stock = pl.stock[g.id] || 0;
    const own = P.cargo[g.id] || 0;
    rows += `<tr>
      <td>${g.i} ${g.n}</td>
      <td>${price} кр.</td>
      <td>${stock}</td>
      <td>${own}</td>
      <td>
        <button class="mini" data-buyg="${g.id}" ${P.money<price||stock<=0||cargoUsed()>=P.cap?'disabled':''}>Купить</button>
        <button class="mini" data-sellg="${g.id}" ${own<=0?'disabled':''}>Продать</button>
      </td>
    </tr>`;
  }
  $('panel').innerHTML = `<div class="pbox">
    <h2>🛒 Рынок — ${pl.name}</h2>
    <div class="sub">💰 ${fmt(P.money)} · Трюм ${cargoUsed()}/${P.cap}</div>
    <table><tr><th>Товар</th><th>Цена</th><th>Склад</th><th>У вас</th><th></th></tr>${rows}</table>
    <div class="prow"><button class="btn ghost" id="tradeBack">← В порт</button></div>
  </div>`;
  $('tradeBack').onclick = () => openDockPanel();
  const rewardTradeReputation = () => {
    const faction = systems[G.sysId]?.fac || null;
    const outcome = applyTradeReputation({
      reputation: P.rep,
      faction,
      turn: G.turn,
      rewardedTurns: G.tradeReputationTurns,
    });
    P.rep = outcome.reputation;
    G.tradeReputationTurns = outcome.rewardedTurns;
    return outcome.delta;
  };
  document.querySelectorAll('[data-buyg]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.buyg;
      const price = pl.prices[id] || 40;
      if (P.money >= price && (pl.stock[id] || 0) > 0 && cargoUsed() < P.cap) {
        P.money -= price;
        pl.stock[id]--;
        P.cargo[id] = (P.cargo[id] || 0) + 1;
        const reputationDelta = rewardTradeReputation();
        const reputationNote = reputationDelta > 0 ? ` · репутация +${reputationDelta}` : '';
        toast(`Куплено: ${goodById(id).n}${reputationNote}`, 'good'); sfx.pick();
        renderTradePanel();
      }
    };
  });
  document.querySelectorAll('[data-sellg]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.sellg;
      const price = Math.floor((pl.prices[id] || 40) * 0.85);
      if ((P.cargo[id] || 0) > 0) {
        P.money += price;
        P.cargo[id]--;
        if (P.cargo[id] <= 0) delete P.cargo[id];
        pl.stock[id] = (pl.stock[id] || 0) + 1;
        const reputationDelta = rewardTradeReputation();
        const reputationNote = reputationDelta > 0 ? ` · репутация +${reputationDelta}` : '';
        toast(`Продано: ${goodById(id).n} (+${price})${reputationNote}`, 'good'); sfx.pick();
        renderTradePanel();
      }
    };
  });
}
function renderQuestsPanel() {
  const pl = curPlanet();
  if (!pl) return;
  // simple delivery offers
  if (G.offers.length === 0) {
    const cands = systems.filter(s => s.id !== G.sysId && s.links.some(l => systems[G.sysId].links.includes(l) || l === G.sysId));
    if (cands.length === 0) {
      for (const s of systems) if (s.id !== G.sysId) cands.push(s);
    }
    const ts = pick(cands);
    const tp = (ts.planets || []).filter(p => p.hasPort);
    if (tp.length) {
      const g = pick(GOODS);
      const q = 3 + rndi(0, 8);
      G.offers.push({
        t: 'del', g: g.id, q,
        sys: ts.id, pl: ts.planets.indexOf(tp[0]),
        pay: Math.round(g.b * q * 1.8 + dist(systems[G.sysId].x, systems[G.sysId].y, ts.x, ts.y) * 0.8),
        deadline: G.day + 8 + rndi(0, 6)
      });
    }
  }
  let html = '';
  if (G.offers.length === 0) html = '<div class="evTxt">Пока нет доступных заданий.</div>';
  else {
    for (let i = 0; i < G.offers.length; i++) {
      const o = G.offers[i];
      const g = goodById(o.g);
      const dest = systems[o.sys];
      const dpl = dest && dest.planets[o.pl] ? dest.planets[o.pl].name : '?';
      html += `<div class="evTxt" style="margin:8px 0;padding:8px;background:rgba(0,0,0,.25);border-radius:8px">
        Перевезти ${g.i} ${g.n} ×${o.q} → ${dest ? dest.name : '?'} / ${dpl}.<br>
        Срок: ${Math.max(1, o.deadline - G.day)} дн. · Награда: ${fmt(o.pay)} кр.
        <br><button class="btn green mini" data-take="${i}">Принять</button>
      </div>`;
    }
  }
  $('panel').innerHTML = `<div class="pbox">
    <h2>📋 Задания — ${pl.name}</h2>
    ${html}
    <div class="prow"><button class="btn ghost" id="questBack">← В порт</button></div>
  </div>`;
  $('questBack').onclick = () => openDockPanel();
  document.querySelectorAll('[data-take]').forEach(b => {
    b.onclick = () => {
      const o = G.offers[+b.dataset.take];
      if (!o) return;
      if (cargoUsed() + o.q > P.cap) { toast('Не хватает места в трюме', 'bad'); return; }
      P.cargo[o.g] = (P.cargo[o.g] || 0) + o.q;
      G.offers.splice(+b.dataset.take, 1);
      toast(`Задание принято: доставить ${goodById(o.g).n}`, 'good');
      sfx.pick();
      // store active quest simply
      if (!G.activeQuest) G.activeQuest = o;
      renderQuestsPanel();
    };
  });
}

function renderShipPanel() {
  const repCost = Math.ceil((P.maxHull - P.hull) * 1.8);
  const fuelCost = Math.ceil((P.maxFuel - P.fuel) * 2.2);
  let tabs = '';
  SHOPCATS.forEach((c, i) => {
    tabs += `<button class="btn ${shopTab===i?'on':''}" data-tab="${i}">${c.i} ${c.n}</button>`;
  });
  const cat = SHOPCATS[shopTab];
  const cur = P.eq[cat.key];
  let rows = '';
  cat.arr.forEach((it, idx) => {
    let cell = '—';
    if (idx === cur) cell = '<b style="color:#66d98c">✔ установлено</b>';
    else if (idx > cur) {
      const net = it.p - Math.floor(cat.arr[cur].p * 0.4);
      cell = `<button class="mini" data-buy="${shopTab},${idx}" ${P.money<net?'disabled':''}>${fmt(net)} кр.</button>`;
    } else {
      cell = '<span style="color:#8fa8d8">ниже текущего</span>';
    }
    let stats = '';
    if (cat.key==='w') stats = `${it.dmg} урон · ${it.rate}/с · ${it.range} м`;
    else if (cat.key==='e') stats = `${it.spd} скорость хода`;
    else if (cat.key==='s') stats = `${it.cap} щит · реген ${it.reg}`;
    else if (cat.key==='h') stats = `${it.hp} корпус`;
    else if (cat.key==='c') stats = `${it.cap} мест`;
    else stats = `${it.r} радар`;
    rows += `<tr><td>${it.n}</td><td style="color:#8fa8d8;font-size:11px">${stats}</td><td>${cell}</td></tr>`;
  });
  $('panel').innerHTML = `<div class="pbox">
    <h2>🚀 Корабль и оборудование</h2>
    <div class="sub">💰 ${fmt(P.money)} кр. · Корпус ${Math.round(P.hull)}/${P.maxHull} · Щит ${Math.round(P.shield)}/${P.maxShield} · ⛽ ${Math.round(P.fuel)}/${P.maxFuel}</div>
    <div class="prow">
      <button class="btn green" id="btnRepair" ${P.hull>=P.maxHull||P.money<repCost?'disabled':''}>🛠️ Ремонт — ${fmt(repCost)} кр.</button>
      <button class="btn green" id="btnRefuel" ${P.fuel>=P.maxFuel||P.money<fuelCost?'disabled':''}>⛽ Заправка — ${fmt(fuelCost)} кр.</button>
      <button class="btn" id="btnMisBuy">🚀 Ракеты +4 — 500 кр. (есть ${P.missiles})</button>
    </div>
    <div class="tabs" id="shopTabs">${tabs}</div>
    <table><tr><th>Модуль</th><th>Характеристики</th><th></th></tr>${rows}</table>
    <div class="prow">
      <button class="btn" id="shipSave">💾 Сохранить</button>
      <button class="btn ghost" id="shipClose">Закрыть</button>
    </div>
  </div>`;
  $('shipClose').onclick = closeShipPanel;
  $('shipSave').onclick = () => saveGame(0);
  $('btnRepair').onclick = () => {
    const c = Math.ceil((P.maxHull - P.hull) * 1.8);
    if (P.money >= c && P.hull < P.maxHull) {
      P.money -= c; P.hull = P.maxHull;
      toast('🛠️ Корпус отремонтирован', 'good'); sfx.pick();
      renderShipPanel();
    }
  };
  $('btnRefuel').onclick = () => {
    const c = Math.ceil((P.maxFuel - P.fuel) * 2.2);
    if (P.money >= c && P.fuel < P.maxFuel) {
      P.money -= c; P.fuel = P.maxFuel;
      toast('⛽ Бак полон', 'good'); sfx.pick();
      renderShipPanel();
    }
  };
  $('btnMisBuy').onclick = () => {
    if (P.money < 500) { toast('Мало денег', 'bad'); return; }
    P.money -= 500; P.missiles += 4;
    toast('🚀 +4 ракеты', 'good'); sfx.pick();
    renderShipPanel();
  };
  document.querySelectorAll('#shopTabs .btn').forEach(b => {
    b.onclick = () => { shopTab = +b.dataset.tab; renderShipPanel(); };
  });
  document.querySelectorAll('[data-buy]').forEach(b => {
    b.onclick = () => {
      const [ti, ii] = b.dataset.buy.split(',').map(Number);
      const cat = SHOPCATS[ti];
      const cur = P.eq[cat.key];
      const net = cat.arr[ii].p - Math.floor(cat.arr[cur].p * 0.4);
      if (P.money < net) { toast('Мало денег', 'bad'); return; }
      P.money -= net;
      P.eq[cat.key] = ii;
      applyEquip();
      toast('🔧 Установлено: ' + cat.arr[ii].n, 'good');
      sfx.pick();
      renderShipPanel();
    };
  });
}


// ---------- Buttons ----------

// ---------- Info center + galaxy news ----------
function ensureNews() {
  if (!G.news) G.news = [];
  while (G.news.length < 5) pushNews(randomHeadline());
}
function randomHeadline() {
  const S = systems[G.sysId] || systems[0];
  const other = pick(systems.filter(s => s && s.id !== G.sysId)) || S;
  const fac = FACS[S?.fac || 'fed']?.n || 'Федерация';
  const lines = [
    `${formatDate()}: В системе ${other.name} отмечена активность пиратов.`,
    `${formatDate()}: ${fac} усиливает патрули у границ.`,
    `${formatDate()}: Цены на руду растут в промышленных мирах.`,
    `${formatDate()}: Торговый конвой пропал между ${S?.name || '—'} и ${other.name}.`,
    `${formatDate()}: Учёные Клиссан сообщают о всплеске аномалий.`,
    `${formatDate()}: Пеленгская Лига объявила скидки на оборудование.`,
    `${formatDate()}: Малокские рейдеры атаковали караван у ${other.name}.`,
    `${formatDate()}: Открыт новый гиперкоридор (слухи).`,
    `${formatDate()}: Биржа ${S?.name || 'галактики'}: спрос на продовольствие.`
  ];
  return pick(lines);
}
function pushNews(text) {
  if (!G.news) G.news = [];
  G.news.unshift({ t: formatDate(), text, turn: G.turn });
  if (G.news.length > 30) G.news.length = 30;
}
function maybeDailyNews() {
  if (Math.random() < 0.35) pushNews(randomHeadline());
}
function openInfoCenter() {
  if (G.state !== 'demo' && G.state !== 'game') return;
  ensureNews();
  G.panel = 'info';
  renderInfoCenter();
  $('panel').classList.remove('hidden');
  sfx.ui();
}
function renderInfoCenter() {
  ensureNews();
  const S = systems[G.sysId] || { name: '—', fac: 'fed', danger: 1, planets: [] };
  const fac = FACS[S.fac] || { n: '—', c: '#fff' };
  const visited = G.visited ? G.visited.size : 0;
  let planetRows = '';
  (S.planets || []).forEach((pl) => {
    const econ = (ECON[pl.econ] && ECON[pl.econ].n) || pl.econ || '—';
    planetRows += `<tr><td>${pl.name}</td><td>${pl.type}</td><td>${econ}</td><td>${pl.hasPort ? '🛫 порт' : '—'}</td></tr>`;
  });
  let newsHtml = (G.news || []).map(n =>
    `<div style="margin:6px 0;padding:8px;background:rgba(0,0,0,.25);border-radius:8px;font-size:12px"><b style="color:#ffd77a">${n.t}</b><br>${n.text}</div>`
  ).join('') || '<div class="evTxt">Новостей пока нет.</div>';
  const facCount = {};
  for (const s of systems) facCount[s.fac] = (facCount[s.fac] || 0) + 1;
  let facLines = Object.keys(facCount).map(f => `${(FACS[f] && FACS[f].n) || f}: ${facCount[f]}`).join(' · ');
  $('panel').innerHTML = `<div class="pbox" style="max-height:90vh;overflow:auto">
    <h2>📡 Информационный центр</h2>
    <div class="sub">${formatDate()} · Ход ${G.turn} · Система ${S.name}</div>
    <h3 style="color:#9fb8e8;margin:12px 0 6px">Текущая система</h3>
    <div class="evTxt">Фракция: <b style="color:${fac.c}">${fac.n}</b> · Опасность: ${S.danger}/5<br>
    Планет: ${(S.planets || []).length} · Связи: ${(S.links || []).length}</div>
    <table><tr><th>Планета</th><th>Тип</th><th>Экономика</th><th></th></tr>${planetRows}</table>
    <h3 style="color:#9fb8e8;margin:12px 0 6px">Галактика</h3>
    <div class="evTxt">Систем: ${NUM_SYS} · Посещено: ${visited}/${NUM_SYS}<br>${facLines}</div>
    <h3 style="color:#9fb8e8;margin:12px 0 6px">Новости галактики</h3>
    ${newsHtml}
    <div class="prow">
      <button class="btn" id="infoRefresh">🔄 Обновить сводку</button>
      <button class="btn ghost" id="infoClose">Закрыть</button>
    </div>
  </div>`;
  $('infoClose').onclick = () => { G.panel = null; $('panel').classList.add('hidden'); $('panel').innerHTML = ''; };
  $('infoRefresh').onclick = () => { pushNews(randomHeadline()); renderInfoCenter(); sfx.ui(); };
}

// ---------- Save / Load ----------
function serializeGame() {
  saveShipsToSystem(G.sysId);
  const shipsBag = {};
  for (const k of Object.keys(systemShips)) shipsBag[k] = systemShips[k];
  return {
    v: 2, savedAt: Date.now(), dateStr: formatDate(), turn: G.turn,
    P: {
      x: P.x, y: P.y, face: P.face, money: P.money, fuel: P.fuel, maxFuel: P.maxFuel,
      missiles: P.missiles, xp: P.xp, kills: P.kills,
      hull: P.hull, maxHull: P.maxHull, shield: P.shield, maxShield: P.maxShield,
      shieldReg: P.shieldReg, maxSpeed: P.maxSpeed, cap: P.cap, radar: P.radar,
      eq: Object.assign({}, P.eq), cargo: Object.assign({}, P.cargo), rep: Object.assign({}, P.rep),
      raceId: P.raceId || 'fed', classId: P.classId || 'trader',
      docked: P.docked, lastPort: Object.assign({}, P.lastPort)
    },
    G: {
      state: 'demo', phase: 'player', turn: G.turn, day: G.day,
      date: Object.assign({}, G.date), sysId: G.sysId,
      visited: Array.from(G.visited || []),
      offers: G.offers || [], news: G.news || [], activeQuest: G.activeQuest || null,
      tradeReputationTurns: Object.assign({}, G.tradeReputationTurns || {}),
      systemWantedUntil: normalizeSystemWanted(G.systemWantedUntil)
    },
    systems: systems.map(s => ({
      id: s.id, name: s.name, x: s.x, y: s.y, fac: s.fac, danger: s.danger,
      starC: s.starC, links: (s.links || []).slice(),
      planets: (s.planets || []).map(pl => ({
        name: pl.name, type: pl.type, orbit: pl.orbit, size: pl.size,
        spd: pl.spd, ang: pl.ang, ring: pl.ring, econ: pl.econ,
        hasPort: pl.hasPort, prices: Object.assign({}, pl.prices), stock: Object.assign({}, pl.stock)
      }))
    })),
    systemShips: shipsBag,
    demoShips: demoShips.map(s => Object.assign({}, s)),
    uidCounter
  };
}
function saveGame(slot) {
  try {
    const data = serializeGame();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    localStorage.setItem(SAVE_META, JSON.stringify({
      turn: data.turn, dateStr: data.dateStr, sys: systems[G.sysId] && systems[G.sysId].name, money: P.money
    }));
    toast('💾 Игра сохранена (' + data.dateStr + ')', 'good');
    sfx.pick();
    refreshContinueBtn();
  } catch (err) {
    console.error(err);
    toast('Ошибка сохранения', 'bad');
    showErr('save: ' + (err.message || err));
  }
}
function loadGame(slot) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { toast('Нет сохранения', 'bad'); return false; }
    const data = JSON.parse(raw);
    if (!data || !data.P || !data.systems) { toast('Повреждённое сохранение', 'bad'); return false; }
    systems = data.systems;
    for (const k of Object.keys(systemShips)) delete systemShips[k];
    if (data.systemShips) {
      for (const k of Object.keys(data.systemShips)) systemShips[k] = data.systemShips[k];
    }
    if (data.uidCounter) uidCounter = data.uidCounter;
    Object.assign(P, data.P);
    P.eq = data.P.eq || P.eq;
    P.cargo = data.P.cargo || {};
    P.rep = data.P.rep || P.rep;
    applyEquip();
    G.turn = data.G.turn || 1;
    G.day = data.G.day || G.turn;
    G.date = data.G.date || { year: 3500, month: 1, day: 1 };
    G.sysId = data.G.sysId || 0;
    G.visited = new Set(data.G.visited || [G.sysId]);
    G.offers = data.G.offers || [];
    G.news = data.G.news || [];
    G.activeQuest = data.G.activeQuest || null;
    G.tradeReputationTurns = Object.assign({}, data.G.tradeReputationTurns || {});
    G.systemWantedUntil = normalizeSystemWanted(data.G.systemWantedUntil);
    G.moveTarget = null; G.targetShip = null; G.anim = null; G.panel = null;
    G.phase = 'player'; G.state = 'demo';
    G.camFollow = true; G.camX = P.x; G.camY = P.y; G.warpFrom = -1;
    demoShips = data.demoShips || [];
    const S = systems[G.sysId];
    if (R && S) {
      R.buildSystemFromData(S);
      if (!demoShips.length) loadShipsForSystem(G.sysId);
      applyShipsToRenderer();
    }
    const menu = $('menu'); if (menu) menu.classList.add('hidden');
    const panel = $('panel'); if (panel) { panel.classList.add('hidden'); panel.innerHTML = ''; }
    showHud(true);
    startMusic();
    toast('📂 Загрузка: ' + (data.dateStr || formatDate()), 'good');
    sfx.pick();
    return true;
  } catch (err) {
    console.error(err);
    toast('Ошибка загрузки', 'bad');
    showErr('load: ' + (err.message || err));
    return false;
  }
}
function refreshContinueBtn() {
  const btn = $('contBtn');
  if (!btn) return;
  try {
    const meta = localStorage.getItem(SAVE_META);
    if (meta) {
      const m = JSON.parse(meta);
      btn.style.display = '';
      btn.textContent = '💾 ПРОДОЛЖИТЬ (' + (m.dateStr || '—') + ')';
    } else btn.style.display = 'none';
  } catch (e) { btn.style.display = 'none'; }
}

function chooseRangerStartSystem(profile) {
  if (!systems.length) return 0;
  const raceSystems = systems.filter(s => s.fac === profile.faction);
  const pool = raceSystems.length ? raceSystems : systems;
  if (profile.startMode === 'outlaw') {
    return systems.slice().sort((a, b) => b.danger - a.danger || a.id - b.id)[0]?.id || 0;
  }
  if (profile.startMode === 'danger') {
    return pool.slice().sort((a, b) => b.danger - a.danger || a.id - b.id)[0]?.id || 0;
  }
  if (profile.startMode === 'border') {
    return pool.slice().sort((a, b) => {
      const borderA = (a.links || []).filter(id => systems[id] && systems[id].fac !== profile.faction).length;
      const borderB = (b.links || []).filter(id => systems[id] && systems[id].fac !== profile.faction).length;
      return borderB - borderA || b.danger - a.danger || a.id - b.id;
    })[0]?.id || 0;
  }
  return pool.slice().sort((a, b) => a.danger - b.danger || a.id - b.id)[0]?.id || 0;
}

function startNewGame(profileSelection = {}) {
  try {
    initAudio();
    sfx.ui();
    genGalaxy();
    const startProfile = buildRangerStartProfile(profileSelection);
    const startSystemId = chooseRangerStartSystem(startProfile);
    for (const k of Object.keys(systemShips)) delete systemShips[k];
    demoShips = [];
    uidCounter = 1000;
    G.state = 'demo';
    G.phase = 'player';
    G.turn = 1;
    G.day = 1;
    resetDate(); // 01.01.3500
    G.news = [];
    G.camFollow = true;
    G.sysId = startSystemId;
    G.visited = new Set([startSystemId]);
    G.moveTarget = null;
    G.targetShip = null;
    G.shotMode = 'laser';
    G.anim = null;
    G.panel = null;
    G.offers = [];
    G.activeQuest = null;
    G.tradeReputationTurns = {};
    G.systemWantedUntil = {};
    P.docked = null;
    P.raceId = startProfile.raceId;
    P.classId = startProfile.classId;
    P.rep = Object.assign({}, startProfile.reputation);
    P.cargo = Object.assign({}, startProfile.cargo);
    P.lastPort = { sys: startSystemId, pl: 0 };
    P.eq = Object.assign({}, startProfile.eq);
    applyEquip();
    P.hull = P.maxHull;
    P.shield = P.maxShield;
    P.fuel = P.maxFuel;
    P.kills = 0;
    P.xp = 0;
    P.missiles = startProfile.missiles;
    P.money = startProfile.money;
    const menu = $('menu');
    if (menu) menu.classList.add('hidden');
    const panel = $('panel');
    if (panel) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
    }
    showHud(true);
    enterSystem(startSystemId);
    startMusic();
    toast(`🚀 ${startProfile.raceName} · ${startProfile.className} · ${systems[startSystemId]?.name || 'стартовая система'}`, 'good');
  } catch (err) {
    console.error('NewGame error:', err);
    showErr((err && err.message) ? err.message : String(err));
    toast('Ошибка старта: ' + (err && err.message ? err.message : err), 'bad');
  }
}
window.startNewGame = startNewGame;
window.saveGame = saveGame;
window.loadGame = loadGame;
const btnNew = $('btnNewGame');
if (btnNew) {
  btnNew.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    startNewGame();
  });
  btnNew.onclick = (e) => {
    e && e.preventDefault && e.preventDefault();
    startNewGame();
  };
} else {
  console.error('btnNewGame not found');
  showErr('Кнопка Новая игра не найдена');
}
const contBtn = $('contBtn');
if (contBtn) {
  contBtn.addEventListener('click', (e) => {
    e.preventDefault();
    initAudio();
    loadGame(0);
  });
}
refreshContinueBtn();

$('btnHelp').addEventListener('click', () => {
  initAudio(); sfx.ui();
  $('panel').classList.remove('hidden');
  $('panel').innerHTML = `<div class="pbox">
    <h2>🎮 v3.9</h2>
    <div class="evTxt">
      <b>Пошаговый бой:</b> тап / миникарта — курс · тап по врагу — цель → ХОД.<br>
      <b>Камера:</b> C — следовать/свободно · ПКМ/СКМ тянуть · Shift+миникарта — центр камеры · Shift+WASD — пан.<br>
      <b>Посадка:</b> к планете с портом → рынок, ремонт, задания, инфоцентр.<br>
      <b>M</b> — галактика · <b>N</b> — инфоцентр/новости · <b>F5</b> сохранить · <b>F9</b> загрузить.<br>
      <b>Q</b> — ракеты · Пробел — ход. Корабли помнят позиции (как в КР2).
    </div>
    <div class="prow"><button class="btn green" id="helpClose">Понятно ▶</button></div>
  </div>`;
  $('helpClose').onclick = () => $('panel').classList.add('hidden');
});

$('galClose')?.addEventListener('click', closeGalaxy);
$('sndBtn')?.addEventListener('click', () => {
  muted = !muted;
  $('sndBtn').textContent = muted ? '🔇' : '🔊';
  if (muted) stopMusic();
  else if (musicOn && G.state === 'menu') startMenuMusic();
  else if (musicOn && (G.state === 'demo' || G.state === 'game')) startMusic();
  sfx.ui();
});
$('menuBtn')?.addEventListener('click', () => {
  if (G.state === 'demo' || G.state === 'game') {
    musicOn = !musicOn;
    if (musicOn && !muted) startMusic(); else stopMusic();
    toast(musicOn ? '🎵 Музыка вкл' : '🎵 Музыка выкл');
  }
});
$('bTurn')?.addEventListener('pointerdown', e => { e.stopPropagation(); execTurn(false); });
$('bWait')?.addEventListener('pointerdown', e => { e.stopPropagation(); execTurn(true); });
$('bMis')?.addEventListener('pointerdown', e => { e.stopPropagation(); toggleMissile(); });

// ---------- Loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.t += dt;
  G.shake = Math.max(0, G.shake - dt * 14);

  if (G.state === 'galaxy') {
    drawGalaxy();
    return;
  } else {
    hideGalaxyOverlay();
  }

  if (G.state === 'warp') {
    G.warpT += dt;
    try {
      if (G.warpT > 0.85 && !G.warpDone) {
        G.warpDone = true;
        enterSystem(G.warpTo, { warp: true, fromId: G.warpFrom });
        R.setPlayer(P);
        G.camX = P.x; G.camY = P.y;
        R.setCameraTarget(P.x, P.y, 0);
      }
      R.setPlayer(P);
      R.setCameraTarget(G.camFollow ? P.x : G.camX, G.camFollow ? P.y : G.camY, G.shake);
      R.update(dt);
      R.render();
    } catch (err) {
      console.error('warp frame', err);
      showErr('warp: ' + (err.message || err));
      G.state = 'demo';
      G.phase = 'player';
    }
    if (G.warpT > 1.6) {
      G.state = 'demo';
      G.phase = 'player';
    }
    updHUD();
    return;
  }

  if (G.state === 'demo' || G.state === 'game') {
    if (G.anim) {
      G.anim.t += dt;
      const e = easeIO(clamp(G.anim.t / G.anim.dur, 0, 1));
      for (const m of G.anim.movers) {
        if (!m.o) continue;
        m.o.x = m.x0 + (m.x1 - m.x0) * e;
        m.o.y = m.y0 + (m.y1 - m.y0) * e;
      }
      for (const s of demoShips) R.updateShip(s, dt);
      R.setPlayer(P);
      if (G.anim.t >= G.anim.dur) {
        for (const m of G.anim.movers) { if (m.o) { m.o.x = m.x1; m.o.y = m.y1; } }
        const after = G.anim.after;
        G.anim = null;
        if (after === 'enemy') enemyPhase();
        else if (after === 'end') endTurn();
      }
    } else {
      for (const s of demoShips) R.updateShip(s, dt);
      R.setPlayer(P);
    }
    if (G.camFollow) { G.camX = P.x; G.camY = P.y; }
    R.setCameraTarget(G.camX, G.camY, G.shake);
    R.setMarkers(P, G.moveTarget, G.targetShip, 9999, P.weapon.range || 400, demoShips);
    if (R._rangeMove) R._rangeMove.visible = false;
    R.update(dt);
    R.render();
    drawMinimap();
    updHUD();
  }
}
requestAnimationFrame(frame);
R.render();
startMenuMusic();
console.log('%cКР3 WebGL v3.8 — hyperjumps + planet landing (SR2 style)', 'color:#ffd77a;font-weight:bold');

// debug: ?autostart=1 starts game automatically
if (typeof location !== "undefined" && location.search.includes("autostart")) {
  setTimeout(() => { try { startNewGame(); } catch (e) { showErr(String(e)); } }, 400);
}
