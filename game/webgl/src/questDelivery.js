export const DELIVERY_XP = 12;
export const DELIVERY_REPUTATION = 2;
export const DELIVERY_EXPIRED_REPUTATION = -1;

function nonNegativeInt(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function reputationFaction(quest) {
  return quest?.issuerFaction || quest?.faction || null;
}

function applyReputationDelta(reputation = {}, quest = null, delta = 0) {
  const nextReputation = { ...reputation };
  const faction = reputationFaction(quest);
  if (!faction || !delta) return nextReputation;
  nextReputation[faction] = Number(nextReputation[faction] || 0) + Number(delta);
  return nextReputation;
}

export function cargoUsed(cargo = {}, activeQuest = null) {
  const marketCargo = Object.values(cargo).reduce((sum, qty) => sum + nonNegativeInt(qty), 0);
  const missionCargo = activeQuest?.missionCargo ? nonNegativeInt(activeQuest.q) : 0;
  return marketCargo + missionCargo;
}

export function questDaysLeft(quest, day) {
  if (!quest) return 0;
  return Math.max(0, nonNegativeInt(quest.deadline) - nonNegativeInt(day));
}

export function isQuestExpired(quest, day) {
  return Boolean(quest) && nonNegativeInt(day) > nonNegativeInt(quest.deadline);
}

export function canAcceptDelivery({ activeQuest = null, cargo = {}, capacity = 0, offer = null } = {}) {
  if (!offer) return { ok: false, reason: 'missing_offer' };
  if (activeQuest) return { ok: false, reason: 'active_quest' };
  if (cargoUsed(cargo) + nonNegativeInt(offer.q) > nonNegativeInt(capacity)) {
    return { ok: false, reason: 'cargo_full' };
  }
  return { ok: true, reason: null };
}

export function acceptDelivery(offer, { day = 0, systemId = 0, planetIdx = -1 } = {}) {
  if (!offer) throw new TypeError('offer is required');
  return {
    ...offer,
    missionCargo: true,
    acceptedDay: nonNegativeInt(day),
    originSys: nonNegativeInt(systemId),
    originPl: Number.isInteger(planetIdx) ? planetIdx : -1,
  };
}

export function resolveDeliveryAtDock({
  quest = null,
  day = 0,
  systemId = 0,
  planetIdx = -1,
  cargo = {},
  money = 0,
  xp = 0,
  reputation = {},
} = {}) {
  const nextCargo = { ...cargo };
  const nextReputation = { ...reputation };
  if (!quest) return { status: 'none', quest: null, cargo: nextCargo, money, xp, reputation: nextReputation };

  if (isQuestExpired(quest, day)) {
    const reputationAfterExpiry = applyReputationDelta(
      nextReputation,
      quest,
      DELIVERY_EXPIRED_REPUTATION,
    );
    return {
      status: 'expired',
      quest: null,
      cargo: nextCargo,
      money,
      xp,
      reputation: reputationAfterExpiry,
      reputationDelta: reputationFaction(quest) ? DELIVERY_EXPIRED_REPUTATION : 0,
    };
  }

  if (quest.sys !== systemId || quest.pl !== planetIdx) {
    return { status: 'not_here', quest, cargo: nextCargo, money, xp, reputation: nextReputation };
  }

  // Compatibility with pre-missionCargo saves: old builds placed quest goods
  // directly in the market hold, so those goods must still be consumed.
  if (!quest.missionCargo) {
    const have = nonNegativeInt(nextCargo[quest.g]);
    const required = nonNegativeInt(quest.q);
    if (have < required) {
      return {
        status: 'missing_cargo',
        quest,
        cargo: nextCargo,
        money,
        xp,
        reputation: nextReputation,
      };
    }
    const remaining = have - required;
    if (remaining > 0) nextCargo[quest.g] = remaining;
    else delete nextCargo[quest.g];
  }

  const reputationAfterCompletion = applyReputationDelta(nextReputation, quest, DELIVERY_REPUTATION);
  return {
    status: 'completed',
    quest: null,
    cargo: nextCargo,
    money: Number(money) + Number(quest.pay || 0),
    xp: Number(xp) + DELIVERY_XP,
    reputation: reputationAfterCompletion,
    reward: Number(quest.pay || 0),
    xpAward: DELIVERY_XP,
    reputationDelta: reputationFaction(quest) ? DELIVERY_REPUTATION : 0,
  };
}
