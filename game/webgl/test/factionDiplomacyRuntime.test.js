import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORT_COOLDOWN_TURNS,
  SUPPORT_MIN_REPUTATION,
  SUPPORT_REPUTATION_COST,
  applyDiplomaticSupport,
  currentFactionContext,
  diplomaticSupportAvailability,
} from '../src/factionDiplomacyRuntime.js';

function save(overrides = {}) {
  return {
    P: { fuel: 40, maxFuel: 100, rep: { fed: 25 }, ...(overrides.P || {}) },
    G: { sysId: 2, turn: 12, diplomacySupportUntil: {}, ...(overrides.G || {}) },
    systems: [
      { id: 0, name: 'Соль', fac: 'pel' },
      { id: 2, name: 'Терра-Нова', fac: 'fed' },
    ],
  };
}

test('currentFactionContext derives diplomacy from the live system faction', () => {
  assert.deepEqual(currentFactionContext(save()), {
    faction: 'fed', systemId: 2, systemName: 'Терра-Нова', reputation: 25,
    turn: 12, cooldownUntil: 0, cooldownRemaining: 0,
  });
});

test('support is blocked below the trusted reputation threshold', () => {
  const result = diplomaticSupportAvailability(save({ P: { fuel: 40, maxFuel: 100, rep: { fed: SUPPORT_MIN_REPUTATION - 1 } } }));
  assert.equal(result.available, false);
  assert.equal(result.reason, 'reputation');
});

test('trusted faction support grants bounded fuel and costs reputation', () => {
  const result = applyDiplomaticSupport(save({ P: { fuel: 92, maxFuel: 100, rep: { fed: 25 } } }));
  assert.equal(result.changed, true);
  assert.equal(result.grantedFuel, 8);
  assert.equal(result.save.P.fuel, 100);
  assert.equal(result.save.P.rep.fed, 25 - SUPPORT_REPUTATION_COST);
  assert.equal(result.save.G.diplomacySupportUntil.fed, 12 + SUPPORT_COOLDOWN_TURNS);
});

test('support cooldown prevents repeated requests until enough turns pass', () => {
  const blocked = diplomaticSupportAvailability(save({ G: { sysId: 2, turn: 12, diplomacySupportUntil: { fed: 16 } } }));
  assert.equal(blocked.available, false);
  assert.equal(blocked.reason, 'cooldown');
  assert.equal(blocked.context.cooldownRemaining, 4);

  const ready = diplomaticSupportAvailability(save({ G: { sysId: 2, turn: 16, diplomacySupportUntil: { fed: 16 } } }));
  assert.equal(ready.available, true);
});
