import test from 'node:test';
import assert from 'node:assert/strict';
import { contractReputationState, issuerFactionForOffer } from '../src/contractReputationGate.js';

const baseSave = {
  P: { rep: { fed: 5, pel: -11 }, cargo: {}, cap: 35 },
  G: { sysId: 7, activeQuest: null },
  systems: [{ id: 7, fac: 'pel' }],
};

test('derives the issuer from the current system when legacy offers have no faction field', () => {
  assert.equal(issuerFactionForOffer(baseSave, { q: 3 }), 'pel');
});

test('blocks a delivery offer when issuer reputation is below the existing delivery threshold', () => {
  const state = contractReputationState(baseSave, { q: 3, sys: 8, pl: 0 });
  assert.equal(state.ok, false);
  assert.equal(state.reason, 'reputation_too_low');
  assert.equal(state.reputationLocked, true);
  assert.equal(state.score, -11);
  assert.equal(state.minimumReputation, -10);
});

test('allows the threshold value and preserves explicit issuer factions', () => {
  const save = { ...baseSave, P: { ...baseSave.P, rep: { ...baseSave.P.rep, fed: -10 } } };
  const state = contractReputationState(save, { q: 3, issuerFaction: 'fed' });
  assert.equal(state.ok, true);
  assert.equal(state.faction, 'fed');
  assert.equal(state.score, -10);
});

test('prevents taking a second delivery while another contract is active', () => {
  const save = { ...baseSave, G: { ...baseSave.G, activeQuest: { t: 'del' } }, P: { ...baseSave.P, rep: { pel: 20 } } };
  const state = contractReputationState(save, { q: 1 });
  assert.equal(state.ok, false);
  assert.equal(state.reason, 'active_quest');
});
