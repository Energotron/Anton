import * as THREE from 'three';
import { WebGLRenderer } from '../js/WebGLRenderer.js';
import {
  SALVAGE_GOODS,
  SALVAGE_PICKUP_RADIUS,
  applySalvagePickup,
  buildSalvageDrop,
  cargoUsed
} from './salvageCore.js';

const PATCH_FLAG = Symbol.for('kr3.salvageRuntime.patched');
const STATE = new WeakMap();
const LOOT_COLORS = {
  ore: 0x8fd3ff,
  mach: 0xffd36a,
  weap: 0xff6f91
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
    lastBadgeText: ''
  };
  STATE.set(renderer, state);
  return state;
}

function disposeObject(object) {
  object.traverse?.(child => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach(m => m?.dispose?.());
    else child.material?.dispose?.();
  });
}

function clearLoot(renderer) {
  const state = ensureState(renderer);
  for (const loot of state.loot) {
    state.group.remove(loot.mesh);
    disposeObject(loot.mesh);
  }
  state.loot.length = 0;
  state.ships.clear();
  updateBadge(renderer);
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

function spawnLoot(renderer, ship, x, y) {
  const drop = buildSalvageDrop(ship);
  if (!drop) return null;
  const state = ensureState(renderer);
  const mesh = makeLootMesh(drop);
  mesh.position.set(x, y, 4);
  const loot = {
    id: `salvage-${state.serial++}`,
    ...drop,
    x,
    y,
    mesh,
    warnedFull: false,
    pulse: Math.random() * Math.PI * 2
  };
  mesh.userData.salvageId = loot.id;
  state.group.add(mesh);
  state.loot.push(loot);
  const good = SALVAGE_GOODS[loot.goodId];
  notify(`🧲 Обломки: ${good?.icon || '📦'} ${good?.name || loot.goodId} ×${loot.amount}`);
  updateBadge(renderer);
  return loot;
}

function removeLoot(renderer, loot) {
  const state = ensureState(renderer);
  state.group.remove(loot.mesh);
  disposeObject(loot.mesh);
  state.loot = state.loot.filter(item => item !== loot);
  STATE.set(renderer, state);
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
  const nearby = state.loot.filter(loot => Math.hypot(player.x - loot.x, player.y - loot.y) <= (player.radar || 540)).length;
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
}

function animateLoot(renderer, dt) {
  const state = ensureState(renderer);
  for (const loot of state.loot) {
    loot.pulse += dt * 2.2;
    loot.mesh.rotation.z += dt * 0.7;
    const scale = 1 + Math.sin(loot.pulse) * 0.08;
    loot.mesh.scale.setScalar(scale);
  }
}

export function installSalvageRuntime() {
  const proto = WebGLRenderer.prototype;
  if (proto[PATCH_FLAG]) return false;
  Object.defineProperty(proto, PATCH_FLAG, { value: true, configurable: false });

  const originalAddShip = proto.addShip;
  const originalRemoveShip = proto.removeShip;
  const originalSetPlayer = proto.setPlayer;
  const originalUpdate = proto.update;
  const originalClearShips = proto.clearShips;

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

  proto.setPlayer = function patchedSetPlayer(player) {
    const result = originalSetPlayer.call(this, player);
    if (player) collectNearby(this, player);
    return result;
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
