import { WEAPONS, ENGINES, SHIELDS, HULLS, CARGOS, RADARS } from '../js/data.js';

export const SAVE_KEY = 'kr3_save_slot0';

function finiteIndex(value, list) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 && n < list.length ? n : 0;
}

function delta(value, base) {
  return Number(value || 0) - Number(base || 0);
}

export function buildShipBonusBreakdown(save, catalogs = {}) {
  const P = save?.P || {};
  const eq = P.eq || {};
  const weapons = catalogs.weapons || WEAPONS;
  const engines = catalogs.engines || ENGINES;
  const shields = catalogs.shields || SHIELDS;
  const hulls = catalogs.hulls || HULLS;
  const cargos = catalogs.cargos || CARGOS;
  const radars = catalogs.radars || RADARS;

  const selected = {
    weapon: weapons[finiteIndex(eq.w, weapons)],
    engine: engines[finiteIndex(eq.e, engines)],
    shield: shields[finiteIndex(eq.s, shields)],
    hull: hulls[finiteIndex(eq.h, hulls)],
    cargo: cargos[finiteIndex(eq.c, cargos)],
    radar: radars[finiteIndex(eq.r, radars)],
  };
  const base = {
    weapon: weapons[0], engine: engines[0], shield: shields[0],
    hull: hulls[0], cargo: cargos[0], radar: radars[0],
  };

  const equipmentValue = Object.values(selected).reduce((sum, item) => sum + Number(item?.p || 0), 0);
  return {
    equipmentValue,
    rows: [
      { key: 'hull', label: 'Корпус', name: selected.hull.n, value: selected.hull.hp, unit: ' HP', bonus: delta(selected.hull.hp, base.hull.hp) },
      { key: 'shield', label: 'Щит', name: selected.shield.n, value: selected.shield.cap, unit: '', bonus: delta(selected.shield.cap, base.shield.cap), secondary: `реген ${selected.shield.reg}/ход (${delta(selected.shield.reg, base.shield.reg) >= 0 ? '+' : ''}${delta(selected.shield.reg, base.shield.reg)})` },
      { key: 'engine', label: 'Двигатель', name: selected.engine.n, value: selected.engine.spd, unit: ' скорость', bonus: delta(selected.engine.spd, base.engine.spd) },
      { key: 'cargo', label: 'Трюм', name: selected.cargo.n, value: selected.cargo.cap, unit: ' ед.', bonus: delta(selected.cargo.cap, base.cargo.cap) },
      { key: 'radar', label: 'Радар', name: selected.radar.n, value: selected.radar.r, unit: ' дальность', bonus: delta(selected.radar.r, base.radar.r) },
      { key: 'weapon', label: 'Оружие', name: selected.weapon.n, value: selected.weapon.dmg, unit: ' урон', bonus: delta(selected.weapon.dmg, base.weapon.dmg), secondary: `дальность ${selected.weapon.range} · темп ${selected.weapon.rate}` },
    ],
  };
}

export function formatBonus(value) {
  const n = Number(value || 0);
  if (!n) return 'база';
  return `${n > 0 ? '+' : ''}${n}`;
}

function readSave(storage) {
  try {
    const raw = storage?.getItem?.(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function fmtNumber(value) {
  return Number(value || 0).toLocaleString('ru-RU');
}

export function renderShipBonusHtml(save) {
  if (!save?.P) return '<div class="evTxt">Нет активного сохранения. Начните или загрузите игру.</div>';
  const report = buildShipBonusBreakdown(save);
  const rows = report.rows.map(row => {
    const bonus = formatBonus(row.bonus);
    const extra = row.secondary ? `<div class="sub">${row.secondary}</div>` : '';
    return `<div class="prow"><div><b>${row.label}: ${row.name}</b><div>${fmtNumber(row.value)}${row.unit} · бонус к стартовому: ${bonus}</div>${extra}</div></div>`;
  }).join('');
  return `<div class="evTxt">Оценочная стоимость установленного комплекта: <b>${fmtNumber(report.equipmentValue)} кр.</b></div>${rows}`;
}

export function showShipBonusPanel(win = globalThis?.window) {
  const doc = win?.document;
  const panel = doc?.getElementById?.('panel');
  if (!panel) return false;
  try { if (typeof win.saveGame === 'function') win.saveGame(0); } catch {}
  panel.innerHTML = `<div class="pbox"><h2>🧮 Паспорт корабля</h2><div class="sub">Бонусы текущей комплектации относительно стартовых модулей</div>${renderShipBonusHtml(readSave(win?.localStorage))}<div class="prow"><button class="btn ghost" id="shipBonusClose">Закрыть</button></div></div>`;
  panel.classList.remove('hidden');
  doc.getElementById('shipBonusClose')?.addEventListener('click', () => {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  });
  return true;
}

export function installShipBonusButton(win = globalThis?.window) {
  const doc = win?.document;
  if (!doc || doc.getElementById('shipBonusBtn')) return false;
  const diplomacy = doc.getElementById('diplomacyBtn');
  const reputation = doc.getElementById('repIntelBtn');
  const career = doc.getElementById('careerBtn');
  const anchor = diplomacy || reputation || career || doc.getElementById('btnHelp');
  if (!anchor?.parentNode) return false;
  const button = doc.createElement('button');
  button.className = 'mbtn ghost';
  button.id = 'shipBonusBtn';
  button.type = 'button';
  button.textContent = '🧮 ПАСПОРТ КОРАБЛЯ';
  button.addEventListener('click', () => showShipBonusPanel(win));
  anchor.parentNode.insertBefore(button, anchor.nextSibling);
  return true;
}

if (typeof window !== 'undefined') {
  const boot = () => installShipBonusButton(window);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
