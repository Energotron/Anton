from pathlib import Path

path = Path('game/webgl/js/main.js')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)

replace_once(
    "import { normalizeSystemWanted, recordSystemWanted, shouldRecordSystemWanted, systemWantedStatus, wantedPortAccess } from '../src/systemWantedCore.js';\n",
    "import { normalizeSystemWanted, recordSystemWanted, shouldRecordSystemWanted, systemWantedStatus, wantedPortAccess } from '../src/systemWantedCore.js';\nimport { buildRangerStartProfile } from '../src/rangerStartProfiles.js';\n",
    'profile import',
)

replace_once(
    "      fac: pick(['fed', 'fed', 'mal', 'pel', 'kla']),",
    "      fac: pick(['fed', 'fed', 'mal', 'pel', 'fei', 'gaal', 'kla']),",
    'galaxy factions',
)

replace_once(
    "  cargo: {},\n  rep: { fed: 10, mal: 5, pel: 5, kla: 0, pir: -40 }\n};",
    "  cargo: {},\n  raceId: 'fed', classId: 'trader',\n  rep: { fed: 10, mal: 5, pel: 5, fei: 5, gaal: 5, kla: -60, pir: -40 }\n};",
    'player profile state',
)

replace_once(
    "      eq: Object.assign({}, P.eq), cargo: Object.assign({}, P.cargo), rep: Object.assign({}, P.rep),\n      docked: P.docked, lastPort: Object.assign({}, P.lastPort)",
    "      eq: Object.assign({}, P.eq), cargo: Object.assign({}, P.cargo), rep: Object.assign({}, P.rep),\n      raceId: P.raceId || 'fed', classId: P.classId || 'trader',\n      docked: P.docked, lastPort: Object.assign({}, P.lastPort)",
    'save profile state',
)

marker = "function startNewGame() {\n"
helper = """function chooseRangerStartSystem(profile) {
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
"""
replace_once(marker, helper, 'new game signature')

replace_once(
    "    genGalaxy();\n    for (const k of Object.keys(systemShips)) delete systemShips[k];",
    "    genGalaxy();\n    const startProfile = buildRangerStartProfile(profileSelection);\n    const startSystemId = chooseRangerStartSystem(startProfile);\n    for (const k of Object.keys(systemShips)) delete systemShips[k];",
    'build start profile',
)

replace_once(
    "    G.sysId = 0;\n    G.visited = new Set([0]);",
    "    G.sysId = startSystemId;\n    G.visited = new Set([startSystemId]);",
    'start system state',
)

replace_once(
    "    P.docked = null;\n    P.cargo = {};\n    P.lastPort = { sys: 0, pl: 0 };\n    P.eq = { w: 1, e: 1, s: 1, h: 0, c: 1, r: 1 };\n    applyEquip();\n    P.hull = P.maxHull;\n    P.shield = P.maxShield;\n    P.fuel = P.maxFuel;\n    P.kills = 0;\n    P.missiles = 8;\n    P.money = 8000;",
    "    P.docked = null;\n    P.raceId = startProfile.raceId;\n    P.classId = startProfile.classId;\n    P.rep = Object.assign({}, startProfile.reputation);\n    P.cargo = Object.assign({}, startProfile.cargo);\n    P.lastPort = { sys: startSystemId, pl: 0 };\n    P.eq = Object.assign({}, startProfile.eq);\n    applyEquip();\n    P.hull = P.maxHull;\n    P.shield = P.maxShield;\n    P.fuel = P.maxFuel;\n    P.kills = 0;\n    P.xp = 0;\n    P.missiles = startProfile.missiles;\n    P.money = startProfile.money;",
    'apply start profile',
)

replace_once(
    "    enterSystem(0);\n    startMusic();\n    toast('🚀 70 систем · гиперпрыжки · посадка на планеты · M — карта', 'good');",
    "    enterSystem(startSystemId);\n    startMusic();\n    toast(`🚀 ${startProfile.raceName} · ${startProfile.className} · ${systems[startSystemId]?.name || 'стартовая система'}`, 'good');",
    'enter selected system',
)

path.write_text(text, encoding='utf-8')
print('KR3 ranger start profile patch applied successfully')
