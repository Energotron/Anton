export const RANGER_RACES = Object.freeze([
  { id: 'fed', name: 'Человек', faction: 'fed', icon: '🌍', description: 'Сбалансированный старт Федерации Терра.' },
  { id: 'mal', name: 'Малок', faction: 'mal', icon: '🔥', description: 'Крепкий и прямолинейный старт Малоков.' },
  { id: 'pel', name: 'Пеленг', faction: 'pel', icon: '🦎', description: 'Гибкий старт с более мягким отношением пиратов.' },
  { id: 'fei', name: 'Фэянин', faction: 'fei', icon: '✨', description: 'Технологичный старт с хорошими связями с Гаальцами.' },
  { id: 'gaal', name: 'Гаалец', faction: 'gaal', icon: '🔮', description: 'Научный старт и высокая репутация среди мирных рас.' },
]);

export const RANGER_CLASSES = Object.freeze([
  {
    id: 'trader', name: 'Торговец', icon: '💰',
    description: 'Много денег, большой трюм и хороший радар. Старт в безопасной системе своей расы.',
    eq: { w: 0, e: 1, s: 1, h: 1, c: 3, r: 2 }, money: 14000, missiles: 4,
    cargo: { food: 6, mach: 4, med: 2 }, startMode: 'safe',
  },
  {
    id: 'warrior', name: 'Воин', icon: '⚔️',
    description: 'Бронированный корпус, плазменная пушка и усиленный щит. Старт ближе к опасному фронтиру.',
    eq: { w: 2, e: 1, s: 2, h: 2, c: 1, r: 1 }, money: 5000, missiles: 14,
    cargo: {}, startMode: 'danger',
  },
  {
    id: 'mercenary', name: 'Наёмник', icon: '🎯',
    description: 'Универсальное боевое оснащение, быстрый двигатель и средний запас денег.',
    eq: { w: 1, e: 2, s: 1, h: 1, c: 2, r: 2 }, money: 8000, missiles: 10,
    cargo: { med: 2, weap: 2 }, startMode: 'border',
  },
  {
    id: 'pirate', name: 'Пират', icon: '☠️',
    description: 'Сильное оружие, быстрый двигатель и дружба с пиратами ценой отношений с Коалицией.',
    eq: { w: 2, e: 2, s: 1, h: 1, c: 2, r: 1 }, money: 6500, missiles: 12,
    cargo: { lux: 2, weap: 3 }, startMode: 'outlaw',
  },
]);

const RACE_REPUTATION = Object.freeze({
  fed: { fed: 25, mal: 5, pel: 5, fei: 10, gaal: 10, kla: -60, pir: -35 },
  mal: { fed: 0, mal: 25, pel: 0, fei: 5, gaal: -5, kla: -60, pir: -25 },
  pel: { fed: 0, mal: 0, pel: 25, fei: 0, gaal: 5, kla: -60, pir: -10 },
  fei: { fed: 10, mal: 5, pel: 0, fei: 25, gaal: 15, kla: -60, pir: -30 },
  gaal: { fed: 10, mal: -5, pel: 5, fei: 15, gaal: 25, kla: -70, pir: -40 },
});

export function buildRangerStartProfile(selection = {}) {
  const race = RANGER_RACES.find(item => item.id === selection.raceId) || RANGER_RACES[0];
  const rangerClass = RANGER_CLASSES.find(item => item.id === selection.classId) || RANGER_CLASSES[0];
  const reputation = { ...(RACE_REPUTATION[race.id] || RACE_REPUTATION.fed) };

  if (rangerClass.id === 'trader') {
    reputation.fed += 5; reputation.mal += 5; reputation.pel += 5; reputation.fei += 5; reputation.gaal += 5;
  } else if (rangerClass.id === 'warrior') {
    reputation.kla -= 10;
  } else if (rangerClass.id === 'mercenary') {
    reputation.pir -= 5;
  } else if (rangerClass.id === 'pirate') {
    reputation.fed -= 30; reputation.mal -= 20; reputation.pel -= 15; reputation.fei -= 25; reputation.gaal -= 25;
    reputation.pir = 25;
  }

  return {
    raceId: race.id,
    raceName: race.name,
    faction: race.faction,
    classId: rangerClass.id,
    className: rangerClass.name,
    eq: { ...rangerClass.eq },
    money: rangerClass.money,
    missiles: rangerClass.missiles,
    cargo: { ...rangerClass.cargo },
    startMode: rangerClass.startMode,
    reputation,
  };
}
