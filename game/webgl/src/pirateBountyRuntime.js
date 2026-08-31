import { WebGLRenderer } from '../js/WebGLRenderer.js';
import { applyPirateBounty } from './pirateBountyCore.js';

const PATCH_FLAG = Symbol.for('kr3.pirateBountyRuntime.patched');
const STATE = new WeakMap();

function stateFor(renderer) {
  let state = STATE.get(renderer);
  if (!state) {
    state = { ships: new Map(), player: null, danger: 1 };
    STATE.set(renderer, state);
  }
  return state;
}

function notify(message) {
  if (typeof document === 'undefined') return;
  const box = document.getElementById('toasts');
  if (!box) return;
  const node = document.createElement('div');
  node.className = 'toast good';
  node.textContent = message;
  box.appendChild(node);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity .4s';
    setTimeout(() => node.remove(), 400);
  }, 2600);
}

export function installPirateBountyRuntime() {
  const proto = WebGLRenderer.prototype;
  if (proto[PATCH_FLAG]) return false;
  Object.defineProperty(proto, PATCH_FLAG, { value: true, configurable: false });

  const originalAddShip = proto.addShip;
  const originalRemoveShip = proto.removeShip;
  const originalSetPlayer = proto.setPlayer;
  const originalClearShips = proto.clearShips;
  const originalBuildSystemFromData = proto.buildSystemFromData;

  proto.addShip = function patchedBountyAddShip(ship) {
    const result = originalAddShip.call(this, ship);
    if (ship?.uid != null) stateFor(this).ships.set(ship.uid, { ...ship });
    return result;
  };

  proto.setPlayer = function patchedBountySetPlayer(player) {
    stateFor(this).player = player || null;
    return originalSetPlayer.call(this, player);
  };

  proto.buildSystemFromData = function patchedBountyBuildSystem(systemData) {
    stateFor(this).danger = Number(systemData?.danger) || 1;
    return originalBuildSystemFromData.call(this, systemData);
  };

  proto.removeShip = function patchedBountyRemoveShip(uid) {
    const state = stateFor(this);
    const ship = state.ships.get(uid);
    const result = originalRemoveShip.call(this, uid);
    state.ships.delete(uid);
    if (ship?.fac === 'pir' && state.player) {
      const payout = applyPirateBounty(state.player, ship, state.danger);
      if (payout.amount > 0) {
        notify(`💰 Премия за пирата: +${payout.amount} кр.`);
        try {
          window.dispatchEvent(new CustomEvent('kr3:pirate-bounty', {
            detail: { uid, type: ship.type || 'pirate', amount: payout.amount, balance: payout.balance }
          }));
        } catch (_) {}
      }
    }
    return result;
  };

  proto.clearShips = function patchedBountyClearShips() {
    const result = originalClearShips.call(this);
    stateFor(this).ships.clear();
    return result;
  };

  return true;
}

installPirateBountyRuntime();
