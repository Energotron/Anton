export const MARKET_GOOD_NAMES = Object.freeze({
  food: 'Продовольствие', med: 'Медикаменты', ore: 'Руда', mach: 'Оборудование',
  lux: 'Роскошь', weap: 'Оружие', bio: 'Экзобиоматы'
});

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildTraderMarketTip(save = null) {
  if (!save || typeof save !== 'object') return null;
  const systemId = Math.trunc(finite(save?.G?.sysId, -1));
  const systems = Array.isArray(save.systems) ? save.systems : [];
  const system = systems.find(s => Number(s?.id) === systemId);
  if (!system) return null;
  const ports = (Array.isArray(system.planets) ? system.planets : [])
    .filter(p => p?.hasPort && p?.prices && typeof p.prices === 'object');
  if (ports.length < 2) return null;

  let best = null;
  for (const goodId of Object.keys(MARKET_GOOD_NAMES)) {
    let low = null, high = null;
    for (const planet of ports) {
      const price = finite(planet.prices?.[goodId], 0);
      if (price <= 0) continue;
      if (!low || price < low.price) low = { planet, price };
      if (!high || price > high.price) high = { planet, price };
    }
    if (!low || !high || low.planet === high.planet || high.price <= low.price) continue;
    const profit = high.price - low.price;
    const margin = profit / low.price;
    if (!best || margin > best.margin || (margin === best.margin && profit > best.profit)) {
      best = { goodId, goodName: MARKET_GOOD_NAMES[goodId], low, high, profit, margin };
    }
  }
  if (!best) return null;
  const buyPlanet = best.low.planet.name || 'дешёвом порту';
  const sellPlanet = best.high.planet.name || 'дорогом порту';
  return {
    goodId: best.goodId,
    goodName: best.goodName,
    buyPlanet,
    sellPlanet,
    buyPrice: best.low.price,
    sellPrice: best.high.price,
    profitPerUnit: best.profit,
    marginPercent: Math.round(best.margin * 100),
    text: `${best.goodName}: купить на ${buyPlanet} за ${best.low.price} кр., продать на ${sellPlanet} за ${best.high.price} кр. Потенциал +${best.profit} кр./ед. (${Math.round(best.margin * 100)}%).`,
  };
}

function readSave(storage) {
  try {
    const raw = storage?.getItem?.('kr3_save_slot0');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function installTraderMarketIntelRuntime(win = globalThis?.window) {
  if (!win?.document || win.__kr3TraderMarketIntelInstalled) return false;
  win.__kr3TraderMarketIntelInstalled = true;
  win.addEventListener('kr3:ship-hail', event => {
    if (event?.detail?.type !== 'trader') return;
    const doc = win.document;
    if (doc.getElementById('commsMarketTip')) return;
    const status = doc.getElementById('commsStatus');
    const reply = doc.getElementById('commsReply');
    if (!status || !reply) return;
    const button = doc.createElement('button');
    button.className = 'btn';
    button.id = 'commsMarketTip';
    button.textContent = '💹 Торговый совет';
    button.addEventListener('click', () => {
      const tip = buildTraderMarketTip(readSave(win.localStorage));
      reply.textContent = tip?.text || 'На текущих портах нет надёжного ценового спреда. Проверь рынок позже.';
    });
    status.parentElement?.appendChild(button);
  });
  return true;
}

if (typeof window !== 'undefined') installTraderMarketIntelRuntime(window);
