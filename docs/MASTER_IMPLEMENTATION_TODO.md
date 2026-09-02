# KR3 Master Implementation TODO — Дети Эльтана

Status: canonical long-term implementation queue for humans and AI agents. Read together with `docs/ROADMAP.md`, `docs/KR2_MECHANICS_PARITY_MATRIX.md`, `docs/GDD.md` and current `game/webgl/` runtime.

## Canonical campaign baseline

- [ ] Campaign starts on **1 January 3550**.
- [ ] Preserve the “250 years after KR2” framing consistently across UI, saves, quests and lore.
- [ ] Solo campaign remains primary; online is a separate later track.
- [ ] Z-mechanic remains a core pillar: normal space → deep hyperspace → black-hole shadow worlds.

## System camera and minimap navigation

- [ ] Implement true free camera movement across the **entire current star system** instead of keeping the camera effectively locked near the player.
- [ ] The minimap must be a real navigation/control surface, not decorative UI: click/tap a point or object to pan/focus the main camera there.
- [ ] Support smooth pan/drag, edge-safe bounds, zoom where practical, and a one-action return-to-player / follow-camera mode.
- [ ] Camera must be able to inspect planets, stations, NPC ships, debris fields, pickups, combat and distant points of interest without forcing the player's ship to move there first.
- [ ] Minimap markers should represent actionable system objects and remain synchronized with the main camera viewport/focus.
- [ ] Preserve mobile usability: touch drag/pinch or equivalent controls must not conflict with ship movement/selection.
- [ ] Camera state may be saved as convenience state, but loading must always recover safely if coordinates are invalid after world-state changes.

## Visual asset strategy — stop relying on procedural-only presentation

- [ ] Replace placeholder/procedural-only presentation with authored or properly licensed original assets wherever feasible.
- [ ] Add real ship sprites/models/materials for major ranger, military, trader, pirate, Mahpella, Keller-associated and hybrid-race ship classes.
- [ ] Add authored station exteriors/interiors for ranger, science, military, medical, pirate, business and technology stations.
- [ ] Add race-specific planet landing backgrounds and lightweight animations.
- [ ] Add animated docking/landing presentation for planets and stations.
- [ ] Add authored cargo crates, minerals, debris, salvage, missiles, anomalies and interactable space objects.
- [ ] Use procedural generation only where it adds variation, not as a substitute for all art.

## Canonical faction visual identity and ship-class styling

Every ship must visually communicate both **faction/race** and **functional class** before the player opens any information panel. Use original KR3 art and materials; do not copy protected SR2/Universe assets.

- [ ] Malok ships: dominant red / dark-red military palette, heavy silhouettes and blunt armor language.
- [ ] Peleng ships: swamp-green / olive-green palette, asymmetric covert-industrial styling.
- [ ] Human ships: blue / steel-blue palette, modular utilitarian construction.
- [ ] Feyan ships: violet / purple palette, sleek scientific/high-energy styling.
- [ ] Gaalian ships: yellow / gold palette, elegant high-technology geometry.
- [ ] Klissan/Mahpella organs: organic green palette, clearly biomechanical rather than manufactured hulls.
- [ ] Kelleroids/Keller network ships: light-blue / cyan palette with fractured hypertech motifs.
- [ ] Unknown ships: intentionally nonstandard palette/material language; identity must remain uncertain until scanned or revealed by story.
- [ ] Within each faction, trader, military, pirate/raider, ranger/specialist, transport, interceptor, heavy combat and support classes need distinct silhouettes and equipment expectations.
- [ ] Build a data-driven ship-style registry so faction palette, hull family, engine trail, projectile accents, UI markers and damage effects are selected consistently from faction + class.
- [ ] Audit Space Rangers Universe ship-class characteristics as a behavioral/stat reference, then independently reimplement equivalent class roles and balance in original KR3 data/code rather than copying protected data tables or assets verbatim.

## Contextual music system

- [ ] Race-aware music routing: Gaalian world/station → Gaalian track; Feyan → Feyan; Human/Federation → Human; Malok → Malok; Peleng → Peleng.
- [ ] Add dedicated normal-space exploration playlist with at least two current space tracks plus additional original/licensed variety.
- [ ] Add combat-state music transitions.
- [ ] Add deep-hyperspace industrial/broken-techno music layer.
- [ ] Black-hole mode uses near-silence, hull creaks, distant whispers and sparse ambience.
- [ ] Persist user audio preferences and avoid duplicate/overlapping tracks.

## In-space interaction loop

- [ ] Communications system for pilots and ships.
- [ ] Contact target ship → hail → dialogue/options based on faction, reputation, role and current situation.
- [ ] Support requests, threats, bribes, trade, information exchange, surrender and escort/formation commands where appropriate.
- [ ] Pilot personalities/memory integrated later with Smart Diplomacy.
- [ ] Ability to tractor/pick up minerals, cargo containers, equipment, ship wreckage and salvage.
- [ ] Station/large-object salvage or capture only where supported by mission/war state and balance.
- [ ] Visible floating loot with radar markers, ownership/legality and collection range.
- [ ] Cargo mass/capacity and contraband consequences applied to collected objects.

## Faction simulation, default relations and territorial war

- [ ] Coalition space contains role-based civilian and military traffic: **traders, military ships, rangers/specialists, transports and pirates/raiders**.
- [ ] NPC role is separate from race: a Human, Malok, Peleng, Feyan or Gaalian hull can still belong to an allowed role/faction organization where lore permits.
- [ ] Klissans/Mahpella forces are **hostile by default** to ordinary Coalition/player traffic at campaign start unless a later diplomacy/story state explicitly changes that relationship.
- [ ] Klissan/Mahpella war AI can raid, besiege and **capture star systems**, changing ownership, services, traffic, mission generation and strategic pressure.
- [ ] Keller is **allied to the player by default** at the start of the relevant story phase, while trust and later revelations may change that relationship through Smart Diplomacy.
- [ ] Kelleroids are a distinct Keller-associated hypertech faction/network with their own ships, encounter tables, reputation hooks, missions and combat doctrine.
- [ ] Pirates remain independent opportunists rather than being hardcoded to one race.
- [ ] Faction ownership, diplomacy and war state must be saved and restored deterministically.
- [ ] System capture requires explicit strategic rules: attack strength, defenders, bases, supply state, reinforcement, retreat, occupation and recapture.

## Scripted advanced NPC AI — SR Universe-style behavioral depth

Target: deterministic, debuggable, script-driven AI with the behavioral richness of classic Space Rangers/Universe rather than opaque ML control.

- [ ] Implement layered NPC logic: strategic goal → current role → tactical state → local steering/action.
- [ ] Traders evaluate profitable routes, cargo capacity, danger, fuel/range and safe destinations; they flee or reroute from superior threats.
- [ ] Military patrol, escort, intercept hostile contacts, reinforce contested systems and defend strategic objects.
- [ ] Pirates evaluate prey value versus risk, demand cargo/credits where appropriate, ambush weakened targets and retreat when outmatched.
- [ ] Rangers/specialists independently pursue missions, salvage, bounties, exploration and faction objectives.
- [ ] Klissan organs act as coordinated extensions of their Mahpella command network, prioritizing infection/threat-model objectives and system conquest.
- [ ] Kelleroids use Keller-linked doctrine: hypermaneuvering, sabotage, interception, intelligence and coordinated strikes rather than generic pirate behavior.
- [ ] Unknown ships use hidden goals and limited-information behavior until the player learns their nature.
- [ ] NPCs remember recent aggression/help, can change targets, retreat, call allies, pursue, loot wreckage, refuel/repair/rearm and resume strategic goals.
- [ ] Use seeded randomness and explicit state machines/utility scores so QA can reproduce decisions from logs and save states.
- [ ] Audit Space Rangers Universe behavior as a parity target and independently recreate equivalent decision patterns without copying proprietary code.

## Planets and governments

- [ ] Race-specific inhabited planets with government buildings and services.
- [ ] Government building as the main source of official missions, local politics, faction dialogue and legal status.
- [ ] Planetary markets, local technology level, population/economy and projects.
- [ ] Race-specific architecture/backgrounds/audio.
- [ ] Uninhabited planet exploration and colonization chains.
- [ ] Surface events, anomalies, digger/exploration missions and rare finds.

## Stations and bases — full strategic objects

- [ ] Ranger center, science base, military base, medical center, pirate base, business center and technology center.
- [ ] Each station/base gets a unique exterior silhouette, docking/interior scene, animation, ambient audio/music and mechanically distinct services.
- [ ] Bases must exist as real strategic map entities with hull/defense state, faction ownership, traffic, dock capacity and local influence rather than generic menu skins.
- [ ] Military bases generate patrols/reinforcements and contribute defense to system capture calculations.
- [ ] Science bases research artifacts, Klissan/Mahpella biology, Keller hypertech and story technologies.
- [ ] Ranger centers issue ranger contracts, ranks, bounties and special operations.
- [ ] Medical centers provide treatment/biotech services and can participate in biological-story quest chains.
- [ ] Business centers influence trade routes, contracts, market intelligence and logistics.
- [ ] Technology centers handle equipment engineering, upgrades and specialist modules.
- [ ] Pirate bases support contraband, fences, pirate contracts, bribes and underworld diplomacy.
- [ ] Docking context must visibly differ from a planet landing.
- [ ] Station upgrades/modernization, blockade, capture, disabling and destruction are supported where the war layer permits.
- [ ] Base ownership and damage must have persistent consequences for services, prices, missions, patrols and regional control.

## Text quests and authored narrative

- [ ] Full branching text-quest engine with checks, inventory/resources, multiple endings and delayed consequences.
- [ ] 5–10 polished text quests for vertical slice.
- [ ] Government missions and one-off faction quests.
- [ ] Keller chain, Children of Eltan encounters, hybrid-race dilemmas and Shadow Fleet negotiations.
- [ ] Special-agent mission chains.
- [ ] Add a **prison/jail quest framework**: arrest can be triggered by crime/legal status/story; player can serve time, negotiate, escape, cooperate with authorities or enter a prison-specific branching quest.
- [ ] Prison outcomes can alter time, reputation, legal status, inventory access, contacts and later faction events rather than acting as a simple game-over screen.
- [ ] Build reusable quest locations beyond prison: government office, pirate den, derelict, research lab, black-hole enclave, hyperspace wreck and captured base.
- [ ] Text quests may alter reputation, Alliance Grid, Index of Discord, local/system state and war layer.

## Planetary battles

- [ ] Separate planetary battle mode if technically viable in WebGL/mobile budget.
- [ ] Modular robot/unit construction and saved templates.
- [ ] Factories, repair structures, missile systems and battlefield objectives.
- [ ] Optional direct/manual unit control.
- [ ] Reinforcements from orbit and strategic galaxy consequences.
- [ ] Multiple maps/backgrounds/skyboxes rather than one generic arena.
- [ ] Planetary battles can decide local government survival, base capture, liberation, occupation and system-control modifiers.
- [ ] Klissan ground forces are biomechanical specialized organs/nodes rather than ordinary Coalition-style robots.

## Hyperspace arcade combat

- [ ] Separate arcade-like hyperspace battle mode during selected hyperspace transitions and missions.
- [ ] Hyperpirates as a persistent interception faction with their own leaders, loot, hideouts and quest chains.
- [ ] Kelleroid/Keller-associated encounters tied to the story rather than generic enemies only.
- [ ] Klissan/Mahpella forces can appear in hyperspace as mobile organs, pursuit groups, scouts and invasion elements.
- [ ] Unknown ships can inhabit hyperspace and black-hole routes with scan/reveal mechanics.
- [ ] Distinct hyperspace movement, hazards, anomalies, pickups and boss encounters.
- [ ] Hyper missions connect back to normal-space war objectives.
- [ ] Introduce **Архан Рачех**, self-proclaimed heir to Rachekhan, as a major hyperpirate leader with his own fleet, ideology, rivalry network and multi-stage story arc.
- [ ] Архан Рачех can become enemy, temporary ally, criminal patron or defeated claimant depending on pirate reputation and Smart Diplomacy choices.

## Z-mechanic implementation

- [ ] Normal space: trade, politics, governments, exploration, diplomacy and conventional war.
- [ ] Deep hyperspace: Keller guerrilla network, Kelleroids, sabotage, stealth, hyperpirates, Klissan incursions, unknown ships, anomalies and alternate routes.
- [ ] Black-hole shadow worlds: ancient allies, Shadow Fleets, reality-bending navigation, rare technology, Klissan/Kelleroid/unknown incursions where lore supports them.
- [ ] Ordinary hyperspace transitions can become playable arcade encounters rather than always being passive loading/travel.
- [ ] Black-hole entry can launch a distinct arcade/combat/exploration layer with unique physics and hazards.
- [ ] Actions in one layer affect the other two: destroyed hyper convoys reduce normal-space reinforcement, captured normal-space bases alter hyper routes, shadow-world alliances unlock strategic options.
- [ ] Dynamic War Map tracks coordinated strikes and faction presence across all three layers.
- [ ] Each major faction has an explicit Z-presence table defining where it can spawn, travel, fight, build influence and pursue story goals.

## Smart Diplomacy

- [ ] Alliance Grid: trust, fear, respect, ideology and hidden conflict triggers.
- [ ] Negotiation trees with bluff, bribery, evidence, leverage and psychological profiles.
- [ ] Index of Discord as a live campaign variable.
- [ ] Faction and leader memory of meaningful player actions.
- [ ] Race-specific diplomatic preferences and taboo actions.
- [ ] Coalition/hybrid/Shadow Fleet/Keller relationships can strengthen, fracture or realign.
- [ ] Keller begins as an ally in his initial relationship state, but trust, the retrovirus revelation and player choices can push him toward deeper alliance, neutrality, betrayal or open war.
- [ ] Klissan/Mahpella hostility is the default campaign pressure, but diplomacy/story routes may later unlock ceasefire, cure, alliance, schism or surrender outcomes.
- [ ] Smart Diplomacy feeds NPC AI: ships react differently to the same player based on faction memory, legal status, fear/respect and current treaties.
- [ ] Diplomacy must produce concrete gameplay effects: missions, prices, support, access, intelligence, war behavior, system ownership and endings.

## Faction lore and story tracks

- [ ] Humans: Coalition administration, military doctrine, frontier politics and institutional conflict.
- [ ] Maloks: martial honor, clan competition, heavy military role and red fleet identity.
- [ ] Pelengs: intelligence networks, covert trade, pragmatic piracy and swamp-green fleet identity.
- [ ] Feyans: science, experimentation, high-energy technology and violet fleet identity.
- [ ] Gaalians: philosophy, advanced technology, long-term diplomacy and gold/yellow fleet identity.
- [ ] Klissans/Mahpells: distributed organic civilization, Main Mahpella, retrovirus-driven threat model and green biomechanical organs.
- [ ] Keller/Kelleroids: Keller's deep-hyper network, cyan hypertech, responsibility for the retrovirus, uneasy alliance and possible ideological fracture.
- [ ] Hyperpirates: independent deep-hyper criminal civilization centered partly around Архан Рачех and competing pirate captains.
- [ ] Unknown ships: mystery track with intentionally hidden origin, objectives and possible connection to deeper Z-layer cosmology.
- [ ] Each faction receives at least one multi-stage storyline, unique encounters, faction services/rewards, diplomatic dilemmas and an ending-state contribution.

## SRHD + maintained mod ecosystem parity

All mechanics from the current `docs/KR2_MECHANICS_PARITY_MATRIX.md` remain mandatory long-term backlog. In particular continue auditing and implementing high-value mechanics from:

- [ ] Space Rangers HD: A War Apart current feature set;
- [ ] Universe current supported module families;
- [ ] Solyanka and maintained successors/repack work;
- [ ] Expansion / Evolution / Revolution;
- [ ] Shu's Rangers;
- [ ] Fairan, Polaria, ZelMods, DenMods, ArtiModsPack, Kotyanka/Cat, HukMods/Reflection;
- [ ] planetary-battle engine/maps/QoL module families.

Do not copy copyrighted text/assets verbatim. Translate mechanics into original KR3 code, balance, writing, audiovisual assets and Children-of-Eltan lore.

## Implementation order guideline

1. Fix/maintain canonical WebGL runtime stability.
2. Correct campaign date to 3550-01-01 and keep save compatibility.
3. Make full-system free camera + functional minimap navigation a real gameplay control layer.
4. Build communication + space pickup/salvage loop.
5. Build the faction/ship identity registry and role-aware scripted NPC AI foundation.
6. Build landing/station scene framework with race-aware backgrounds/music and strategic base state.
7. Build planets/governments/station services and faction territorial-war capture rules.
8. Build text-quest engine and authored vertical-slice quests, including prison/jail quest framework.
9. Deepen Smart Diplomacy, legal status, faction memory and default Keller/Klissan relationship logic.
10. Add hyper arcade mode, Kelleroids, hyperpirates, Архан Рачех and the first full Keller/Z-mechanic mission.
11. Add black-hole shadow-world arcade/exploration mode and cross-layer Z consequences.
12. Expand war layer, Klissan system conquest, planetary battles and remaining SRHD/mod parity.

## Definition of done

A checkbox is complete only when the feature is meaningfully playable in the current `master`, connected to the real runtime, tested where practical, and does not regress existing systems. Placeholder constants, dead helpers or mock UI do not count.
