export const DELIVERY_XP = 12;
export const DELIVERY_REPUTATION = 2;
export const DELIVERY_EXPIRED_REPUTATION = -1;
export const DELIVERY_ABANDONED_REPUTATION = -1;
export const DELIVERY_MIN_REPUTATION = -10;

function nonNegativeInt(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function reputationFaction(quest) {
  return quest?.issuerFaction || quest?.faction || null;
}

function reputationScore(reputation = {}, quest = null) {
  const faction = reputationFaction(quest);
  return faction ? Number(reputation?.[faction] || 0) : 0;
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

export function deliveryQuestPresentation({ quest = null, day = 0 } = {}) {
  if (!quest) {
    return {
      status: 'none',
      daysLeft: 0,
      dueToday: false,
      expired: false,
      destination: null,
      cargo: null,
      reward: 0,
    };
  }

  const expired = isQuestExpired(quest, day);
  const daysLeft = questDaysLeft(quest, day);
  return {
    status: expired ? 'expired' : 'active',
    daysLeft,
    dueToday: !expired && daysLeft === 0,
    expired,
    destination: {
      systemId: nonNegativeInt(quest.sys),
      planetIdx: Number.isInteger(quest.pl) ? quest.pl : -1,
    },
    cargo: {
      good: quest.g ?? null,
      quantity: nonNegativeInt(quest.q),
    },
    reward: Number(quest.pay || 0),
  };
}

export function canAcceptDelivery({
  activeQuest = null,
  cargo = {},
  capacity = 0,
  offer = null,
  reputation = {},
} = {}) {
  if (!offer) return { ok: false, reason: 'missing_offer' };
  if (activeQuest) return { ok: false, reason: 'active_quest' };
  if (reputationFaction(offer) && reputationScore(reputation, offer) < DELIVERY_MIN_REPUTATION) {
    return { ok: false, reason: 'reputation_too_low' };
  }
  if (cargoUsed(cargo) + nonNegativeInt(offer.q) > nonNegativeInt(capacity)) {
    return { ok: false, reason: 'cargo_full' };
  }
  return { ok: true, reason: null };
}

export function deliveryOfferPresentation(args = {}) {
  const offer = args.offer || null;
  const availability = canAcceptDelivery(args);
  const faction = reputationFaction(offer);
  const score = faction ? reputationScore(args.reputation || {}, offer) : null;

  return {
    ...availability,
    faction,
    reputation: score,
    minimumReputation: faction ? DELIVERY_MIN_REPUTATION : null,
    reputationLocked: availability.reason === 'reputation_too_low',
  };
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

export function abandonDelivery({ quest = null, reputation = {} } = {}) {
  const nextReputation = { ...reputation };
  if (!quest) {
    return {
      status: 'none',
      quest: null,
      reputation: nextReputation,
      reputationDelta: 0,
    };
  }

  const reputationAfterAbandon = applyReputationDelta(
    nextReputation,
    quest,
    DELIVERY_ABANDONED_REPUTATION,
  );

  return {
    status: 'abandoned',
    quest: null,
    reputation: reputationAfterAbandon,
    reputationDelta: reputationFaction(quest) ? DELIVERY_ABANDONED_REPUTATION : 0,
  };
}

export function resolveDeliveryOnDayAdvance({ quest = null, day = 0, reputation = {} } = {}) {
  const nextReputation = { ...reputation };
  if (!quest) {
    return {
      status: 'none',
      quest: null,
      reputation: nextReputation,
      reputationDelta: 0,
    };
  }

  if (!isQuestExpired(quest, day)) {
    return {
      status: 'active',
      quest,
      reputation: nextReputation,
      reputationDelta: 0,
    };
  }

  const reputationAfterExpiry = applyReputationDelta(
    nextReputation,
    quest,
    DELIVERY_EXPIRED_REPUTATION,
  );

  return {
    status: 'expired',
    quest: null,
    reputation: reputationAfterExpiry,
    reputationDelta: reputationFaction(quest) ? DELIVERY_EXPIRED_REPUTATION : 0,
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
