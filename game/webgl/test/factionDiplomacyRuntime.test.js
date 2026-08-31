import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MALOKI_CREDIT_GRANT,
  SUPPORT_COOLDOWN_TURNS,
  SUPPORT_MIN_REPUTATION,
  SUPPORT_REPUTATION_COST,
  applyDiplomaticSupport,
  currentFactionContext,
  diplomacyServiceForFaction,
  diplomaticSupportAvailability,
} from '../src/factionDiplomacyRuntime.js';

function save(overrides = {}) {
  return {
    P: { fuel: 40, maxFuel: 100, money: 5000, rep: { fed: 25, mal: 25, pel: 25 }, ...(overrides.P || {}) },
    G: { sysId: 2, turn: 12, visited: [2], diplomacySupportUntil: {}, ...(overrides.G || {}) },
    systems: overrides.systems || [
      { id: 0, name: 'Соль', fac: 'pel', links: [2, 3] },
      { id: 2, name: 'Терра-Нова', fac: 'fed', links: [0, 3] },
      { id: 3, name: 'Арктур', fac: 'mal', links: [0, 2] },
    ],
  };
}

test('currentFactionContext derives diplomacy service from the live system faction', () => {
  const context = currentFactionContext(save());
  assert.equal(context.faction, 'fed');
  assert.equal(context.systemId, 2);
  assert.equal(context.systemName, 'Терра-Нова');
  assert.equal(context.reputation, 25);
  assert.equal(context.service.id, 'fuel');
});

test('support is blocked below the faction service reputation threshold', () => {
  const result = diplomaticSupportAvailability(save({ P: { fuel: 40, maxFuel: 100, money: 5000, rep: { fed: SUPPORT_MIN_REPUTATION - 1 } } }));
  assert.equal(result.available, false);
  assert.equal(result.reason, 'reputation');
});

test('Federation logistics grants bounded fuel and costs reputation', () => {
  const result = applyDiplomaticSupport(save({ P: { fuel: 92, maxFuel: 100, money: 5000, rep: { fed: 25 } } }));
  assert.equal(result.changed, true);
  assert.equal(result.serviceId, 'fuel');
  assert.equal(result.grantedFuel, 8);
  assert.equal(result.save.P.fuel, 100);
  assert.equal(result.save.P.rep.fed, 25 - SUPPORT_REPUTATION_COST);
  assert.equal(result.save.G.diplomacySupportUntil.fed, 12 + SUPPORT_COOLDOWN_TURNS);
});

test('Maloki support provides a combat advance with its own cost and cooldown', () => {
  const input = save({ G: { sysId: 3, turn: 20, visited: [2, 3], diplomacySupportUntil: {} } });
  const service = diplomacyServiceForFaction('mal');
  const result = applyDiplomaticSupport(input);
  assert.equal(result.changed, true);
  assert.equal(result.serviceId, 'credits');
  assert.equal(result.grantedCredits, MALOKI_CREDIT_GRANT);
  assert.equal(result.save.P.money, 5000 + MALOKI_CREDIT_GRANT);
  assert.equal(result.save.P.rep.mal, 25 - service.reputationCost);
  assert.equal(result.save.G.diplomacySupportUntil.mal, 20 + service.cooldownTurns);
});

test('Peleng support reveals one unvisited neighboring system', () => {
  const input = save({ G: { sysId: 0, turn: 9, visited: [0, 2], diplomacySupportUntil: {} } });
  const result = applyDiplomaticSupport(input);
  assert.equal(result.changed, true);
  assert.equal(result.serviceId, 'intel');
  assert.equal(result.revealedSystemId, 3);
  assert.deepEqual(result.save.G.visited.sort((a, b) => a - b), [0, 2, 3]);
  assert.equal(result.save.P.rep.pel, 23);
});

test('Peleng intel is unavailable when every neighboring system is already known', () => {
  const result = diplomaticSupportAvailability(save({ G: { sysId: 0, turn: 9, visited: [0, 2, 3], diplomacySupportUntil: {} } }));
  assert.equal(result.available, false);
  assert.equal(result.reason, 'intel_complete');
});

test('factions without a configured service do not receive a generic fallback', () => {
  const input = save({
    P: { fuel: 40, maxFuel: 100, money: 5000, rep: { kla: 99 } },
    G: { sysId: 9, turn: 5, visited: [9], diplomacySupportUntil: {} },
    systems: [{ id: 9, name: 'Ксено-узел', fac: 'kla', links: [] }],
  });
  const result = diplomaticSupportAvailability(input);
  assert.equal(result.available, false);
  assert.equal(result.reason, 'no_service');
});
