/**
 * @file questChoiceProcessor.js
 * @description Logic for processing text quest choices, requirements, and effects in Space Rangers 3.
 * Handles integration with Smart Diplomacy, Index of Discord, and multi-dimensional war states.
 * 
 * @author Wingman (Autonomous Contribution)
 */

import { clampDiplomacyAttitude } from './diplomacyRulesCore.js';

/**
 * @typedef {Object} GameState
 * @property {Object} reputation - Map of faction IDs to reputation values.
 * @property {number} indexOfDiscord - Global tension level (0-100).
 * @property {Object} tokens - Set of acquired intel/story tokens.
 * @property {number} shipHealth - Current ship integrity.
 * @property {string} dimension - Current dimension (Normal, Hyper, Shadow).
 */

/**
 * Evaluates if a quest choice is available to the player.
 * Проверяет доступность выбора на основе репутации, токенов и состояния мира.
 * 
 * @param {Object} choice - The choice object from quest data.
 * @param {GameState} state - Current game state.
 * @returns {boolean} True if the choice can be selected.
 */
export function isChoiceAvailable(choice, state) {
    if (!choice.requirements) return true;

    const { requirements } = choice;

    // Check faction trust/reputation
    if (requirements.faction_trust) {
        for (const [faction, minTrust] of Object.entries(requirements.faction_trust)) {
            const currentTrust = state.reputation[faction] || 0;
            if (currentTrust < minTrust) return false;
        }
    }

    // Check required intel or story tokens
    if (requirements.tokens) {
        for (const token of requirements.tokens) {
            if (!state.tokens[token]) return false;
        }
    }

    // Check dimensional constraints
    if (requirements.dimension && requirements.dimension !== state.dimension) {
        return false;
    }

    // Check ship health requirements (e.g., for risky maneuvers)
    if (requirements.min_health && state.shipHealth < requirements.min_health) {
        return false;
    }

    return true;
}

/**
 * Applies the effects of a selected quest choice to the game state.
 * Применяет последствия выбора: изменение репутации, урон кораблю, Индекс Раздора.
 * 
 * @param {Object} choice - The selected choice object.
 * @param {GameState} state - Current game state.
 * @returns {Object} Delta object representing changes.
 */
export function applyChoiceEffects(choice, state) {
    const delta = {
        reputation: {},
        indexOfDiscord: 0,
        shipDamage: 0,
        tokensAdded: [],
        tokensRemoved: []
    };

    if (!choice.effects) return delta;

    const { effects } = choice;

    // Faction reputation changes
    if (effects.reputation) {
        for (const [faction, change] of Object.entries(effects.reputation)) {
            const current = state.reputation[faction] || 0;
            delta.reputation[faction] = clampDiplomacyAttitude(current + change) - current;
        }
    }

    // Global Index of Discord
    if (effects.index_of_discord) {
        delta.indexOfDiscord = effects.index_of_discord;
    }

    // Ship integrity changes
    if (effects.ship_damage) {
        delta.shipDamage = effects.ship_damage;
    }

    // Story tokens
    if (effects.add_tokens) delta.tokensAdded = [...effects.add_tokens];
    if (effects.remove_tokens) delta.tokensRemoved = [...effects.remove_tokens];

    return delta;
}

/**
 * Processes a choice with a diplomacy tag (e.g., Bluff, Bribe).
 * Обрабатывает дипломатические теги, учитывая психологию фракции.
 * 
 * @param {string} tag - Tag like 'bluff', 'intel', 'prophecy'.
 * @param {Object} factionPsychology - Psychological profile of the target faction.
 * @param {GameState} state - Current game state.
 * @returns {number} Success probability multiplier (0.0 to 1.5).
 */
export function getDiplomacyMultiplier(tag, factionPsychology, state) {
    if (!tag || !factionPsychology) return 1.0;

    let multiplier = 1.0;

    // Example logic based on SMART_DIPLOMACY_SYSTEM.md
    switch (tag.toLowerCase()) {
        case 'bluff':
            // Kellerians respect results/risk, but hate empty promises.
            // Malo-Peleng are susceptible to aggression/strength.
            if (factionPsychology.respects_risk) multiplier *= 1.2;
            if (factionPsychology.susceptible_to_aggression) multiplier *= 1.1;
            if (factionPsychology.hates_lies) multiplier *= 0.5;
            break;
        case 'intel':
            // Feyan-Gaalian love intellectual accuracy.
            if (factionPsychology.values_intellect) multiplier *= 1.3;
            break;
        case 'prophecy':
            // Feyan-Gaalian are sensitive to patterns and prophecies.
            if (factionPsychology.sensitive_to_patterns) multiplier *= 1.4;
            break;
        case 'threat':
            // Malo-Peleng respect strength. Coalition hates chaos.
            if (factionPsychology.respects_strength) multiplier *= 1.2;
            if (factionPsychology.hates_chaos) multiplier *= 0.7;
            break;
    }

    // High Index of Discord makes diplomacy harder
    if (state.indexOfDiscord > 70) {
        multiplier *= 0.8;
    }

    return multiplier;
}

/**
 * Calculates if a risky choice succeeds based on base probability and modifiers.
 * 
 * @param {Object} choice - Choice with 'base_success_rate'.
 * @param {number} diplomacyMultiplier - From getDiplomacyMultiplier.
 * @returns {boolean}
 */
export function resolveRiskyChoice(choice, diplomacyMultiplier = 1.0) {
    const baseRate = choice.base_success_rate || 1.0;
    const finalRate = Math.min(1.0, baseRate * diplomacyMultiplier);
    return Math.random() < finalRate;
}
