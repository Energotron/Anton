# KR3 — KR2/HD/Mods Mechanics Parity Matrix

Status: living design/research reference for autonomous KR3 development.

Purpose: make KR3 inherit the *mechanical breadth* of Space Rangers 2 / Space Rangers HD: A War Apart and the strongest ideas from the living mod ecosystem (Universe, Solyanka, Shu's Rangers, Expansion, Evolution, Revolution, Fairan/Polaria/Zel/Den/Arti/Kotyanka and other maintained packs), while implementing original KR3 code, balance, writing and assets. This is a mechanics reference, not a mandate to copy copyrighted text/assets or reproduce bugs.

## Research baseline (2026-08)

The current community references indicate that the active SRHD mod ecosystem is modular and very large (150+ modules depending on pack/configuration). A 2026 all-mods guide still distributes/points to Universe plus its update archive, Solyanka, Fairan's Vision, Polaria Mods, miscellaneous packs, ZelMods, DenMods, ArtiModsPack and Kotyanka. The current community encyclopedia covers vanilla and modded weapons, black-hole combat, acryns, artifacts, asteroids, illnesses/stimulants, medals, special-agent missions, camouflage, trade, ionization, nano-additives/nanocorrosion, pirate progression, fine difficulty tuning, tranclucators, flagships, planetary battles and text quests.

This matrix therefore treats the target as **mechanical superset parity**, not one specific historical mod configuration.

## A. Core galaxy simulation

- [ ] Persistent turn/day progression where travel and waiting advance the world.
- [ ] Dynamic ownership of star systems and territorial wars.
- [ ] Coalition, pirate and major hostile factions acting without the player.
- [ ] AI raids, invasions, reinforcements, counterattacks and liberation fleets.
- [ ] Systems changing strategic/economic state after capture/liberation.
- [ ] Dynamic NPC population: rangers, military, traders, transports, pirates, mercenaries, smugglers, traitors/rebels and special agents.
- [ ] NPC equipment progression and independent acquisition/upgrading of gear.
- [ ] NPC use of advanced consumables/programs/special equipment where appropriate.
- [ ] Rangers/NPCs capable of exploring special locations such as black holes.
- [ ] Random galaxy situations/events not directly spawned by the player.
- [ ] Home-system alerts and personal connection to a homeworld/system.
- [ ] Endless/post-victory sandbox mode.

## B. Flight, navigation and ship simulation

- [ ] In-system flight with inertia/speed/engine-dependent movement and tactical retreat/chase behavior.
- [ ] Fuel and jump-range economy; reserve fuel and refuelling choices matter.
- [ ] Radar/scanner information limits; jamming/fog-of-information mechanics.
- [ ] Asteroids as interactive/destructible/harvestable hazards.
- [ ] Black holes / hyperspace encounters as separate tactical spaces.
- [ ] Hyperpirate/interception encounters during travel.
- [ ] Transfactor-style beacons/teleport infrastructure and quick activation UX.
- [ ] Optional ship autopilot/AI control.
- [ ] Captain's bridge as a consolidated information/action interface.
- [ ] Quick equipment/configuration presets.
- [ ] In-space info center / searchable galaxy intelligence.
- [ ] Automatic market/equipment search requests.

## C. Ship construction, equipment and progression

- [ ] Hull classes/series with mass, durability, slots, armor/resistance and special bonuses.
- [ ] Equipment technology tiers and galaxy technology progression.
- [ ] Technology-dependent ability to use and repair advanced/hostile equipment.
- [ ] Engines, fuel tanks, radars, scanners, repair droids, cargo grips, shields/protective generators and other utility equipment.
- [ ] Equipment degradation/breakdowns and repair economy.
- [ ] Multiple repair service tiers across different station types.
- [ ] Equipment modification/upgrading with bounded improvement ranges.
- [ ] Micromodules with rarity/chains, equipment-specific effects and synergistic builds.
- [ ] Unique micromodules unlocked from bases/conditions and mod-expanded micromodule pools.
- [ ] Acryn-style rare equipment/hulls with unusual bonuses.
- [ ] Artifacts with unique active/passive effects, stacking/synergy rules and slot limits.
- [ ] Configurable/expanded artifact slot capacity for late-game hulls.
- [ ] Biological modules/implants and medical-center progression.
- [ ] Medicines, illnesses, stimulants and temporary status effects.
- [ ] Nano-additive style stackable offensive/defensive buffs.
- [ ] Nanocorrosion/other persistent combat debuffs.
- [ ] Camouflage/disguise mechanics that modify faction hostility and dialogue.
- [ ] Unique/orderable hulls and late-game custom hull construction.
- [ ] Station/base equipment and upgrades, including special station hull components.
- [ ] Automatic station modernization over time.

## D. Weapons and tactical combat

- [ ] Multiple weapon families with range, damage type, cadence, projectile/beam behavior and target logic.
- [ ] Rocket/missile weapons with ammunition and NPC range/targeting rules.
- [ ] Ammunition containers and purchasable resupply.
- [ ] Nuclear/special warheads gated by rank/progression.
- [ ] Boss/elite-exclusive weapon variants.
- [ ] Advanced mod-style weapon families (plasma/meon/emitters/etc.) reinterpreted as KR3-original technology.
- [ ] Damage-type resistance/immunity on selected elite enemies.
- [ ] Ionization-style stacking delayed hull damage.
- [ ] Electronic warfare/jamming effects.
- [ ] Self-destruct/kamikaze behavior for desperate enemies.
- [ ] Random elite/miniboss generation.
- [ ] Super-heavy hostile variants and progressive enemy equipment tiers.
- [ ] Enemy series weakening/strategic consequences after defeating their controlling boss/command node.
- [ ] Large-ship/station combat where capital units are mechanically distinct rather than just bigger HP pools.

## E. Economy, trade and logistics

- [ ] Planet/station markets with supply, demand and regional price differences.
- [ ] Fine-tunable price spread/economic difficulty.
- [ ] Dynamic galaxy inflation with configurable policy/anti-exploit behavior.
- [ ] Fair-trade safeguards against infinite stock/warehouse exploits.
- [ ] Cargo capacity, item mass and ship mass affecting practical build choices.
- [ ] Trading as a first-class career path rather than incidental loot selling.
- [ ] Repeatable courier/freight employment.
- [ ] Military caravans and bulk/special trade events.
- [ ] Black market with pirate/illegal inventory and faction consequences.
- [ ] Business-center expansion: jobs, services, sales and special events.
- [ ] Buying equipment from NPCs and transferring equipment to companions.
- [ ] Bounty/alternative earning systems.
- [ ] Space-junk/item-location information tools.
- [ ] Node/resource drops from hostile factions and faction-specific markets for them.

## F. Factions, reputation, ranks and diplomacy

- [ ] Reputation tracked per race/faction with mission/combat/trade consequences.
- [ ] Coalition race relations and race-specific social modifiers.
- [ ] Ranger ranks, military ranks and pirate ranks with unlock thresholds.
- [ ] Pirate hierarchy/story progression separate from Coalition progression.
- [ ] Scientific ranks and research-oriented rewards.
- [ ] Mercenary reputation/organization progression.
- [ ] Ability to found/manage a mercenary organization or comparable player faction institution.
- [ ] Mercenary NPC archetype and hire/contract loop.
- [ ] Smuggler NPC archetype.
- [ ] Rebel/traitor subfactions with distinct hostility/behavior.
- [ ] Independent hostile factions beyond the main war (KR3-original equivalents of mod-added invaders/Klissans).
- [ ] Faction-specific equipment, hulls, rewards and dialogue.
- [ ] Orders to allied military forces to attack strategic systems once sufficient authority is earned.
- [ ] Dynamic mass battles between military/pirate/other factions in otherwise normal systems.

## G. Missions, quests and narrative systems

- [ ] Government mission generator: delivery, escort, assassination, system defense and surveillance.
- [ ] Mission deadlines and consequences for expiry/failure/success.
- [ ] Faction reputation and rank rewards/penalties integrated with contracts.
- [ ] Text-adventure quest engine with branching choices, resources, checks and multiple outcomes.
- [ ] Large library of handcrafted text adventures over the project's lifetime.
- [ ] Scripted space situations/events with non-combat choices.
- [ ] Special-agent mission chains.
- [ ] Colonization mission chain for uninhabited planets.
- [ ] Exploration/digger missions on uninhabited worlds.
- [ ] Unique science/physical-anomaly quests producing unique technology.
- [ ] Pirate campaign with meaningful galaxy-level choices.
- [ ] Main campaign branches that can be completed in different orders and can alter the final galaxy state.
- [ ] Procedural repeatable missions plus authored one-off missions.
- [ ] Quest reward scaling by difficulty/rank/context.
- [ ] Quest availability cooldowns and world-state prerequisites.

## H. Exploration and discovery

- [ ] Uninhabited planets with exploration outcomes.
- [ ] Artifacts/rare finds linked to exploration and world/race context.
- [ ] Additional inhabited/uninhabited planets during generation.
- [ ] Double/multiple-star and unusual system generation.
- [ ] Rare space anomalies and hidden encounters.
- [ ] Black-hole reward generation with repeat/new-artifact probability rules.
- [ ] Special hostile black-hole variants.
- [ ] Discoverable lore through exploration rather than only dialogue dumps.

## I. Stations, services and infrastructure

- [ ] Distinct station archetypes: ranger, science, military, medical, pirate, business/commerce and technology-focused facilities.
- [ ] Each station offers mechanically distinct services and progression.
- [ ] Ranger center: ranks, special rewards, micromodule chains/storage and ranger services.
- [ ] Science base: research, upgrades, special gear and science progression.
- [ ] Military base: ammunition, special weapons, authority functions and planetary-defense support.
- [ ] Medical center: treatment, drugs/stimulants and biological augmentation.
- [ ] Pirate base: pirate ranks, black market, camouflage and criminal services.
- [ ] Business center: contracts, employment, sales and dynamic commercial events.
- [ ] Technology center / high-tech upgrade station.
- [ ] Subspace/special base concept with unique access/services.
- [ ] Player-controllable/mobile military infrastructure at high progression where lore permits.
- [ ] Stations capable of updating their own equipment over time.

## J. Planetary battles

- [ ] Separate planetary RTS/tactical battle mode rather than a simple stat check.
- [ ] Robot construction from modular designs/templates.
- [ ] Persisted player robot designs between battles.
- [ ] Multiple AI factions with different production templates.
- [ ] Manual control of individual combat units.
- [ ] Optional first-person/manual-unit camera/control mode.
- [ ] Factories, repair facilities and support structures with actual battlefield functions.
- [ ] Mobile and stationary missile systems including homing variants.
- [ ] Reinforcement/support-from-above mechanics.
- [ ] Automatic explosive/self-destruct logic for destroyed player robots when enabled.
- [ ] Large map library and varied terrain/skyboxes/objectives.
- [ ] Planetary-battle difficulty independently tunable from space combat.
- [ ] Rewards and strategic consequences tied back into galaxy control.

## K. Special tactical modes

- [ ] Arcade/hyperspace battle maps as optional tactical content.
- [ ] Black-hole tactical encounters with different equipment/change rules from normal space.
- [ ] Boss battles with unique mechanics rather than only inflated stats.
- [ ] High-difficulty modes (200%+, up to extreme challenge presets) supported by data-driven tuning rather than cheating AI.

## L. Player skills, medals, achievements and meta progression

- [ ] Skill system with meaningful non-linear choices.
- [ ] Expanded skills from mod ecosystem where they create new play styles.
- [ ] Medals/commendations tied to concrete feats, with rewards when appropriate.
- [ ] Achievements/challenges that encourage alternate careers and extreme difficulty runs.
- [ ] Persistent statistics and career history.
- [ ] Contextual starting configurations / alternate starts.

## M. Difficulty and simulation tuning

Expose a data-driven advanced setup panel covering at minimum:

- [ ] overall difficulty and per-category difficulty;
- [ ] pirate strength/activity;
- [ ] major-enemy aggressiveness and reproduction/reinforcement tempo;
- [ ] Coalition activity;
- [ ] initial technology level;
- [ ] number/experience of additional rangers/NPCs;
- [ ] equipment availability/quality and breakdown frequency;
- [ ] mission difficulty/reward tuning;
- [ ] black-hole frequency/difficulty/rewards;
- [ ] economic price spread/inflation;
- [ ] asteroid density;
- [ ] planetary distribution;
- [ ] starting-system placement;
- [ ] station construction/upgrade behavior;
- [ ] NPC weapon-range special rules;
- [ ] elite/special enemy equipment;
- [ ] loot caps/drop density;
- [ ] planetary-battle difficulty;
- [ ] ironman/permadeath-style options where appropriate;
- [ ] random-event outcome weighting / luck.

## N. Quality-of-life mechanics worth treating as gameplay infrastructure

- [ ] Searchable equipment/hull market intelligence.
- [ ] Ship bonus breakdown/comparison UI.
- [ ] Planet technical-level/project information.
- [ ] Captain bridge dashboards.
- [ ] Micromodule storage/management.
- [ ] Fast configuration presets.
- [ ] Better space item/junk visibility.
- [x] Contextual tooltips explaining derived stats and effects.
- [ ] Mod-like modular feature flags in developer/data configuration so systems remain independently testable.

## O. KR3-only extension rule

Parity is a floor, not a ceiling. After a legacy mechanic is implemented, KR3 may deepen it with Children of Eltan-era systems: new factions, second galactic arm, reality distortion, modern AI behaviors, procedural contracts, new ship classes and original technologies. Legacy references must be translated into KR3 lore rather than forcing incompatible old canon.

## Autonomous development policy

For every KR3 development run:

1. Read this matrix alongside `docs/ROADMAP.md`, GDD/lore and the current playable runtime.
2. Never regress or replace the canonical full `game/webgl/` runtime with a scaffold.
3. Prefer the smallest currently missing mechanic that composes with systems already present.
4. Implement only one coherent increment per run and satisfy the normal KR3 quality gate before committing.
5. Mark a checkbox only when the mechanic is meaningfully playable/tested, not when a placeholder/data constant exists.
6. When new credible SRHD/Universe/Solyanka/mod ecosystem information appears, update the matrix rather than silently changing implementation targets.
7. Resolve conflicts by preserving KR3's existing lore, balance and code architecture; implement the *concept*, not copied protected content.
8. Do not attempt to enable every mutually incompatible historical balance variant simultaneously. Where old mods conflict, expose a coherent KR3 default and use data-driven difficulty/settings when the difference is valuable.

## Research watchlist

Continuously watch for maintained releases/updates and documented mechanics from:

- Space Rangers HD: A War Apart official/current build ecosystem;
- Space Rangers Universe (Community/Redux/current supported flavor and update archive);
- Solyanka and maintained successors/repack work;
- Expansion / Evolution / Revolution families;
- Shu's Rangers;
- Fairan's Vision / Fairan modules;
- Polaria Mods;
- ZelMods;
- DenMods;
- ArtiModsPack;
- Kotyanka/Cat modules;
- HukMods / Reflection / other currently maintained community modules;
- planetary-battle engine/maps/QoL modules;
- community encyclopedia/manual and current all-mod guides.

Last research refresh: 2026-08-31.
