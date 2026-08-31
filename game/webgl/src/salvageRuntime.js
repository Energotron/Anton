import * as THREE from 'three';
import { WebGLRenderer } from '../js/WebGLRenderer.js';
import {
  SALVAGE_GOODS,
  SALVAGE_PICKUP_RADIUS,
  applySalvagePickup,
  buildSalvageDrop,
  cargoUsed,
  getSalvageRadarContacts
} from './salvageCore.js';
import {
  attachSalvagePersistenceToSave,
  createSalvagePersistence,
  extractSalvagePersistenceFromSave,
  serializeSalvageRecords
} from './salvagePersistenceCore.js';

const PATCH_FLAG = Symbol.for('kr3.salvageRuntime.patched');
const STORAGE_READ_PATCH = '__kr3SalvageLoadWatchPatched';
const STORAGE_WRITE_PATCH = '__kr3SalvageSaveWatchPatched';
const STATE = new WeakMap();
let LOAD_CANDIDATE = null;
let ACTIVE_RENDERER = null;
const LOOT_COLORS = {
  ore: 0x8fd3ff,
  mach: 0xffd36a,
  weap: 0xff6f91
};
const LOOT_RADAR_COLORS = {
  ore: '#8fd3ff',
  mach: '#ffd36a',
  weap: '#ff6f91'
};

function notify(message, cls = '') {
  if (typeof document === 'undefined') return;
  const box = document.getElementById('toasts');
  if (!box) return;
  const node = document.createElement('div');
  node.className = `toast ${cls}`.trim();
  node.textContent = message;
  box.appendChild(node);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity .4s';
    setTimeout(() => node.remove(), 400);
  }, 2600);
}

function ensureState(renderer) {
  ACTIVE_RENDERER = renderer || ACTIVE_RENDERER;
  let state = STATE.get(renderer);
  if (state) return state;
  const group = new THREE.Group();
  group.name = 'kr3-salvage';
  renderer.root?.add(group);
  state = {
    group,
    loot: [],
    ships: new Map(),
    player: null,
    serial: 1,
    lastBadgeText: '',
    camX: 0,
    camY: 0,
    radarCanvas: null,
    radarCtx: null,
    currentSystemId: null,
    knownSystemRefs: new Set(),
    systems: {},
    restorePending: false
  };
  STATE.set(renderer, state);
  return state;
}

function ensureRadarOverlay(renderer) {
  if (typeof document === 'undefined') return null;
  const state = ensureState(renderer);
  if (state.radarCanvas?.isConnected && state.radarCtx) return state.radarCtx;
  const minimap = document.getElementById('mm');
  const host = minimap?.parentElement;
  if (!minimap || !host) return null;

  let canvas = document.getElementById('salvageMm');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'salvageMm';
    canvas.width = 264;
    canvas.height = 264;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.right = '0';
    canvas.style.width = '132px';
    canvas.style.height = '132px';
    canvas.style.pointerEvents = 'none';
    canvas.style.borderRadius = '50%';
    canvas.style.zIndex = '2';
    host.appendChild(canvas);
  }
  state.radarCanvas = canvas;
  state.radarCtx = canvas.getContext('2d');
  return state.radarCtx;
}

function drawRadarOverlay(renderer) {
  const state = ensureState(renderer);
  const ctx = ensureRadarOverlay(renderer);
  if (!ctx) return;
  const S = 264;
  ctx.clearRect(0, 0, S, S);
  const player = state.player;
  if (!player) return;

  const contacts = getSalvageRadarContacts(player, state.loot);
  if (!contacts.length) return;
  const viewRadius = Math.max(700, Number(player.radar) || 900);
  const k = 120 / viewRadius;
  const ox = Number.isFinite(state.camX) ? state.camX : Number(player.x) || 0;
  const oy = Number.isFinite(state.camY) ? state.camY : Number(player.y) || 0;
  const pulse = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 280;

  for (const contact of contacts) {
    const x = (contact.x - ox) * k + 132;
    const y = (contact.y - oy) * k + 132;
    if (Math.hypot(x - 132, y - 132) > 124) continue;
    const color = LOOT_RADAR_COLORS[contact.goodId] || '#ffffff';
    const ring = 5.5 + Math.sin(pulse + contact.distance * 0.02) * 1.3;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(x, y, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (contact.amount > 1) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Exo 2, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(contact.amount), x + 7, y);
    }
  }
}

function disposeObject(object) {
  object.traverse?.(child => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach(m => m?.dispose?.());
    else child.material?.dispose?.();
  });
}

function clearLootMeshes(renderer) {
  const state = ensureState(renderer);
  for (const loot of state.loot) {
    state.group.remove(loot.mesh);
    disposeObject(loot.mesh);
  }
  state.loot.length = 0;
  updateBadge(renderer);
  drawRadarOverlay(renderer);
}

function clearLoot(renderer) {
  const state = ensureState(renderer);
  clearLootMeshes(renderer);
  state.ships.clear();
}

function makeLootMesh(drop) {
  const color = LOOT_COLORS[drop.goodId] || 0xffffff;
  const root = new THREE.Group();
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(12, 12, 12),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.28,
      roughness: 0.4,
      metalness: 0.65
    })
  );
  crate.rotation.z = Math.PI / 4;
  root.add(crate);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(18, 1.4, 8, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false })
  );
  root.add(ring);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  beacon.position.set(0, 0, 6);
  root.add(beacon);
  return root;
}

function addLootRecord(renderer, record, announce = false) {
  const state = ensureState(renderer);
  const mesh = makeLootMesh(record);
  mesh.position.set(record.x, record.y, 4);
  const id = record.id || `salvage-${state.serial++}`;
  const loot = {
    id,
    goodId: record.goodId,
    amount: record.amount,
    sourceUid: record.sourceUid ?? null,
    sourceType: record.sourceType || 'pirate',
    x: record.x,
    y: record.y,
    mesh,
    warnedFull: false,
    pulse: Math.random() * Math.PI * 2
  };
  const serialMatch = /^salvage-(\d+)$/.exec(String(id));
  if (serialMatch) state.serial = Math.max(state.serial, Number(serialMatch[1]) + 1);
  mesh.userData.salvageId = loot.id;
  state.group.add(mesh);
  state.loot.push(loot);
  if (announce) {
    const good = SALVAGE_GOODS[loot.goodId];
    notify(`🧲 Обломки: ${good?.icon || '📦'} ${good?.name || loot.goodId} ×${loot.amount}`);
  }
  updateBadge(renderer);
  drawRadarOverlay(renderer);
  return loot;
}

function spawnLoot(renderer, ship, x, y) {
  const drop = buildSalvageDrop(ship);
  if (!drop) return null;
  const state = ensureState(renderer);
  return addLootRecord(renderer, {
    id: `salvage-${state.serial++}`,
    ...drop,
    x,
    y
  }, true);
}

function removeLoot(renderer, loot) {
  const state = ensureState(renderer);
  state.group.remove(loot.mesh);
  disposeObject(loot.mesh);
  state.loot = state.loot.filter(item => item !== loot);
  STATE.set(renderer, state);
  drawRadarOverlay(renderer);
}

function updateBadge(renderer) {
  if (typeof document === 'undefined') return;
  const state = ensureState(renderer);
  const player = state.player;
  const host = document.getElementById('tl');
  if (!host || !player) return;
  let badge = document.getElementById('salvageStatus');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'salvageStatus';
    badge.setAttribute('role', 'status');
    badge.style.marginTop = '4px';
    badge.style.fontSize = '12px';
    badge.style.color = '#bfe5ff';
    badge.style.textShadow = '0 1px 2px #000';
    host.appendChild(badge);
  }
  const nearby = getSalvageRadarContacts(player, state.loot).length;
  const text = `🧲 Обломки: ${nearby} · 📦 ${cargoUsed(player.cargo)}/${player.cap || 0}`;
  if (text !== state.lastBadgeText) {
    badge.textContent = text;
    state.lastBadgeText = text;
  }
}

function collectNearby(renderer, player) {
  const state = ensureState(renderer);
  state.player = player;
  for (const loot of [...state.loot]) {
    const distance = Math.hypot(player.x - loot.x, player.y - loot.y);
    if (distance > SALVAGE_PICKUP_RADIUS) continue;
    const before = loot.amount;
    const result = applySalvagePickup(player, loot);
    if (result.take > 0) {
      const good = SALVAGE_GOODS[loot.goodId];
      notify(`✅ Подобрано: ${good?.icon || '📦'} ${good?.name || loot.goodId} ×${result.take}`, 'good');
      try {
        window.dispatchEvent(new CustomEvent('kr3:salvage-pickup', {
          detail: { goodId: loot.goodId, amount: result.take, remaining: result.remaining }
        }));
      } catch (_) {}
      loot.warnedFull = false;
      if (result.remaining <= 0) removeLoot(renderer, loot);
    } else if (result.reason === 'full' && !loot.warnedFull) {
      loot.warnedFull = true;
      notify('📦 Трюм заполнен — обломки остаются в космосе', 'bad');
    }
    if (before !== loot.amount) updateBadge(renderer);
  }
  updateBadge(renderer);
  drawRadarOverlay(renderer);
}

function animateLoot(renderer, dt) {
  const state = ensureState(renderer);
  for (const loot of state.loot) {
    loot.pulse += dt * 2.2;
    loot.mesh.rotation.z += dt * 0.7;
    const scale = 1 + Math.sin(loot.pulse) * 0.08;
    loot.mesh.scale.setScalar(scale);
  }
  drawRadarOverlay(renderer);
}

function snapshotCurrentSystem(renderer) {
  const state = ensureState(renderer);
  if (!Number.isInteger(state.currentSystemId) || state.currentSystemId < 0) return;
  const records = serializeSalvageRecords(state.loot);
  if (records.length) state.systems[String(state.currentSystemId)] = records;
  else delete state.systems[String(state.currentSystemId)];
}

function restoreCurrentSystem(renderer) {
  const state = ensureState(renderer);
  clearLootMeshes(renderer);
  const records = state.systems[String(state.currentSystemId)] || [];
  for (const record of records) addLootRecord(renderer, record, false);
  state.restorePending = false;
}

function takeRecentLoad(systemData) {
  const candidate = LOAD_CANDIDATE;
  LOAD_CANDIDATE = null;
  if (!candidate || Date.now() - candidate.at > 750) return null;
  const id = Number(systemData?.id);
  const savedId = Number(candidate.data?.G?.sysId);
  const savedSystem = candidate.data?.systems?.[savedId];
  if (!Number.isInteger(id) || id !== savedId || !savedSystem) return null;
  try { return JSON.stringify(savedSystem) === JSON.stringify(systemData) ? candidate.data : null; }
  catch (_) { return null; }
}

function prepareSystemTransition(renderer, systemData) {
  const state = ensureState(renderer);
  const nextId = Number(systemData?.id);
  const knownRef = state.knownSystemRefs.has(systemData);
  const loadedSave = takeRecentLoad(systemData);

  if (loadedSave) {
    state.systems = extractSalvagePersistenceFromSave(loadedSave).systems;
    clearLootMeshes(renderer);
  } else if (nextId === 0 && state.currentSystemId !== null && !knownRef) {
    state.systems = {};
    clearLootMeshes(renderer);
  } else {
    snapshotCurrentSystem(renderer);
  }

  if (systemData && typeof systemData === 'object') state.knownSystemRefs.add(systemData);
  if (Number.isInteger(nextId) && nextId >= 0) state.currentSystemId = nextId;
  state.restorePending = true;
}

function installLoadWatch(storage = globalThis?.localStorage) {
  if (!storage) return false;
  const proto = Object.getPrototypeOf(storage);
  if (!proto || proto[STORAGE_READ_PATCH]) return false;
  const previousGetItem = proto.getItem;
  Object.defineProperty(proto, STORAGE_READ_PATCH, { value: true, configurable: true });
  proto.getItem = function patchedSalvageLoadWatch(key) {
    const raw = previousGetItem.call(this, key);
    if (this === storage && /^kr3_save_slot\d+$/.test(String(key || '')) && typeof raw === 'string') {
      try { LOAD_CANDIDATE = { data: JSON.parse(raw), at: Date.now() }; } catch (_) {}
    }
    return raw;
  };
  return true;
}

function installSaveWatch(storage = globalThis?.localStorage) {
  if (!storage) return false;
  const proto = Object.getPrototypeOf(storage);
  if (!proto || proto[STORAGE_WRITE_PATCH]) return false;
  const previousSetItem = proto.setItem;
  Object.defineProperty(proto, STORAGE_WRITE_PATCH, { value: true, configurable: true });
  proto.setItem = function patchedSalvageSaveWatch(key, value) {
    let nextValue = value;
    if (this === storage && ACTIVE_RENDERER && /^kr3_save_slot\d+$/.test(String(key || '')) && typeof value === 'string') {
      try {
        const saveData = JSON.parse(value);
        const savedAt = Number(saveData?.savedAt);
        if (Number.isFinite(savedAt) && Math.abs(Date.now() - savedAt) <= 1500) {
          snapshotCurrentSystem(ACTIVE_RENDERER);
          const state = ensureState(ACTIVE_RENDERER);
          const persistence = createSalvagePersistence(state.systems);
          nextValue = JSON.stringify(attachSalvagePersistenceToSave(saveData, persistence));
        }
      } catch (_) {}
    }
    return previousSetItem.call(this, key, nextValue);
  };
  return true;
}

export function installSalvageRuntime() {
  installLoadWatch();
  installSaveWatch();
  const proto = WebGLRenderer.prototype;
  if (proto[PATCH_FLAG]) return false;
  Object.defineProperty(proto, PATCH_FLAG, { value: true, configurable: false });

  const originalAddShip = proto.addShip;
  const originalRemoveShip = proto.removeShip;
  const originalSetPlayer = proto.setPlayer;
  const originalSetCameraTarget = proto.setCameraTarget;
  const originalUpdate = proto.update;
  const originalClearShips = proto.clearShips;
  const originalBuildSystemFromData = proto.buildSystemFromData;

  proto.addShip = function patchedAddShip(ship) {
    const state = ensureState(this);
    if (ship?.uid != null) state.ships.set(ship.uid, { ...ship });
    return originalAddShip.call(this, ship);
  };

  proto.removeShip = function patchedRemoveShip(uid) {
    const state = ensureState(this);
    const ship = state.ships.get(uid);
    const mesh = this.shipMeshes?.get(uid);
    const x = mesh?.position?.x ?? ship?.x;
    const y = mesh?.position?.y ?? ship?.y;
    const result = originalRemoveShip.call(this, uid);
    state.ships.delete(uid);
    if (ship?.fac === 'pir' && Number.isFinite(x) && Number.isFinite(y)) {
      spawnLoot(this, ship, x, y);
    }
    return result;
  };

  proto.buildSystemFromData = function patchedBuildSystemFromData(systemData) {
    prepareSystemTransition(this, systemData);
    return originalBuildSystemFromData.call(this, systemData);
  };

  proto.setPlayer = function patchedSetPlayer(player) {
    const state = ensureState(this);
    if (state.restorePending && Number.isInteger(state.currentSystemId)) restoreCurrentSystem(this);
    const result = originalSetPlayer.call(this, player);
    if (player) collectNearby(this, player);
    return result;
  };

  proto.setCameraTarget = function patchedSetCameraTarget(x, y, shake) {
    const state = ensureState(this);
    if (Number.isFinite(Number(x))) state.camX = Number(x);
    if (Number.isFinite(Number(y))) state.camY = Number(y);
    return originalSetCameraTarget.call(this, x, y, shake);
  };

  proto.update = function patchedUpdate(dt) {
    const result = originalUpdate.call(this, dt);
    animateLoot(this, Number(dt) || 0);
    return result;
  };

  proto.clearShips = function patchedClearShips() {
    const result = originalClearShips.call(this);
    clearLoot(this);
    return result;
  };

  return true;
}

installSalvageRuntime();
