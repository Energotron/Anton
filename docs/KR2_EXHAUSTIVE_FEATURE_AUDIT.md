# KR3 Exhaustive KR2 + Mods Feature Audit

Status: canonical standing research mandate for KR3 development.

## Goal

KR3 must target a **mechanical superset** of vanilla Space Rangers 2 / Space Rangers HD: A War Apart plus the maintained KR2 mod ecosystem, and then extend beyond it with original KR3 systems.

This is not a one-time checklist. Every autonomous KR3 development/research run should treat legacy mechanics discovery as an ongoing audit. The objective is to avoid repeatedly waiting for the project owner to name missing KR2 features manually.

## Standing rule

1. Study vanilla Space Rangers 2 and Space Rangers HD: A War Apart mechanics, UI flows, economy, galaxy simulation, combat, quests, planetary battles, hyperspace encounters, factions, ranks, stations, equipment, artifacts, micromodules, skills, NPC behavior and difficulty systems.
2. Study the maintained/current mod ecosystem, including Universe, Solyanka and successors, Expansion, Evolution, Revolution, Shu's Rangers/Shu modules, Fairan's Vision, Polaria Mods, ZelMods, DenMods, ArtiModsPack, Kotyanka/Cat modules, HukMods/Reflection, planetary-battle modules, QoL modules and other credible maintained packs discovered later.
3. Use current community manuals, mod encyclopedias, changelogs, screenshots, gameplay videos and long-form demonstrations as research inputs.
4. Record discovered mechanics in `docs/KR2_MECHANICS_PARITY_MATRIX.md` or a more specific design document before implementation when they are not already represented.
5. Treat parity as a floor. After matching a useful legacy mechanic, ask whether KR3 can deepen it through faction simulation, Z-mechanic, Smart Diplomacy, persistent NPC memory, war state, richer quests, better UI/visual feedback or Children-of-Eltan lore.
6. Do not copy proprietary source code, copyrighted writing, sprites, audio, maps or data tables verbatim. Recreate mechanics and design intent using original KR3 code, balance, writing and assets.
7. Historical bugs, exploits and mutually incompatible mod balance variants are not parity requirements. Preserve the useful mechanic, not the defect.

## Current research baseline — September 2026

Current community material confirms that the active KR2/HD ecosystem is still broad and modular. A 2026 all-mod guide points to Universe, Solyanka, Fairan's Vision, Polaria Mods, ZelMods, DenMods, ArtiModsPack, Kotyanka and additional miscellaneous packs, and explicitly separates graphics upgrades, vanilla QoL, Solyanka, balance and other module families. Universe documentation describes the project as a modular combined ecosystem whose major historical families include Evolution, Expansion, PlanetaryBattles, Revolution, Shu's Rangers and tweaks.

The official A War Apart feature set itself already establishes a large vanilla/HD baseline: dynamic conflict in which AI can affect war outcomes, pirate story progression, 10+ additional text adventures, 15+ planetary battle maps, 20+ government missions, new equipment/micromodules, and direct access to hyperspace engagements.

Long-form modded gameplay demonstrations also expose feature families that must be audited rather than ignored, including inhibitors, micromodule storage, a captain's bridge, quick configuration panels, planetary-battle extensions, fine-tuning options and extensive QoL layers.

## Exhaustive audit buckets

The audit must continue until every discovered mechanic is classified into one of these buckets:

- **Galaxy simulation:** time progression, system ownership, invasions, liberation, AI war actions, ranger population, technology progression, random events, endgame sandbox.
- **NPC careers and behavior:** traders, military, pirates, transports, smugglers, mercenaries, rangers, special agents, hostile factions; strategic goals, tactical reactions, upgrades, retreat, repair, loot and mission activity.
- **Flight/navigation:** movement, fuel, jump range, radar/scanner limits, asteroids, autopilot, information center, market search, transfactors/beacons and navigation QoL.
- **Ship/equipment systems:** hulls, slots, equipment tiers, degradation, repairs, upgrades, micromodules, artifacts, acryn-style gear, biological modules, illnesses, stimulants, camouflage, custom hulls and station equipment.
- **Combat:** weapon families, missiles/ammunition, nuclear/special weapons, elite variants, resistances, ionization, electronic warfare, minibosses, capital/station combat and faction-specific doctrines.
- **Economy/logistics:** dynamic prices, inflation, trading careers, freight/courier work, black market, business-center services, NPC equipment trade, bounty systems, cargo and contraband.
- **Factions/progression:** race/faction reputation, ranger/military/pirate/scientific ranks, mercenary organizations, rebels/traitors, authority orders, faction gear and dynamic battles.
- **Missions/narrative:** government missions, deadlines, procedural contracts, text quests, special-agent chains, colonization/exploration quests, pirate campaign, branching main arcs and random space events.
- **Exploration:** uninhabited planets, artifacts, unusual systems, anomalies, hidden encounters, black-hole rewards and discoverable lore.
- **Stations/bases:** ranger/science/military/medical/pirate/business/technology centers, unique services, upgrades, modernization, strategic ownership and special infrastructure.
- **Planetary battles:** robot construction, saved templates, AI factions, direct control, factories, repair, missiles, orbital support, maps, objectives and independent difficulty.
- **Hyperspace/black-hole modes:** arcade battles, special equipment rules, hyperpirates, bosses, reward structures and KR3 Z-layer extensions.
- **Skills/meta:** skills, medals, achievements, alternate starts, career statistics and progression systems.
- **Difficulty/configuration:** per-system difficulty, enemy activity, technology, economy, equipment availability, mission tuning, black-hole settings, asteroid density, loot density, planetary battle difficulty and extreme modes.
- **QoL/UI:** searchable markets, ship comparison, planet technical info, bridge dashboards, storage, presets, contextual tooltips, junk visibility, automation and accessibility.
- **Visual/audio language:** HUD composition, ship/base readability, race palettes, backgrounds, effects, contextual music, ambience and feedback, studied as reference without copying protected assets.

## Research-to-implementation pipeline

For each newly discovered legacy/mod mechanic:

`source/reference -> mechanic summary -> current KR3 equivalent -> gap -> priority -> dependency -> small playable increment -> regression test -> parity checkbox -> optional KR3 extension`

A mechanic should not be marked complete merely because a constant, mock screen or dead helper exists. It is complete only when meaningfully playable in current `master`, connected to the canonical `game/webgl/` runtime and tested where practical.

## Superset requirement

The end target is not “KR2 remade in a browser”. The target is:

**KR3 = vanilla KR2/HD mechanical breadth + best maintained-mod mechanics + original KR3 faction/war simulation + Smart Diplomacy + Keller/Kelleroids + Klissan/Mahpella war + Z-mechanic + richer authored quests + modern QoL + original visual/audio production.**

Whenever research uncovers a credible feature absent from the parity matrix, the autonomous loop should add it to the backlog without requiring a separate owner prompt.