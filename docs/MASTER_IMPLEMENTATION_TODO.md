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

## Planets and governments

- [ ] Race-specific inhabited planets with government buildings and services.
- [ ] Government building as the main source of official missions, local politics, faction dialogue and legal status.
- [ ] Planetary markets, local technology level, population/economy and projects.
- [ ] Race-specific architecture/backgrounds/audio.
- [ ] Uninhabited planet exploration and colonization chains.
- [ ] Surface events, anomalies, digger/exploration missions and rare finds.

## Stations

- [ ] Ranger center, science base, military base, medical center, pirate base, business center and technology center.
- [ ] Each station gets unique background/interior, animation, music/ambience and mechanically distinct services.
- [ ] Docking context must visibly differ from a planet landing.
- [ ] Station upgrades/modernization and strategic capture/destruction where supported by war layer.

## Text quests and authored narrative

- [ ] Full branching text-quest engine with checks, inventory/resources, multiple endings and delayed consequences.
- [ ] 5–10 polished text quests for vertical slice.
- [ ] Government missions and one-off faction quests.
- [ ] Keller chain, Children of Eltan encounters, hybrid-race dilemmas and Shadow Fleet negotiations.
- [ ] Special-agent mission chains.
- [ ] Text quests may alter reputation, Alliance Grid, Index of Discord, local/system state and war layer.

## Planetary battles

- [ ] Separate planetary battle mode if technically viable in WebGL/mobile budget.
- [ ] Modular robot/unit construction and saved templates.
- [ ] Factories, repair structures, missile systems and battlefield objectives.
- [ ] Optional direct/manual unit control.
- [ ] Reinforcements from orbit and strategic galaxy consequences.
- [ ] Multiple maps/backgrounds/skyboxes rather than one generic arena.

## Hyperspace arcade combat

- [ ] Separate arcade-like hyperspace battle mode.
- [ ] Hyperpirates as interception enemies.
- [ ] Kelleroid/Keller-associated encounters tied to the story rather than generic enemies only.
- [ ] Klissan remnants/derivatives and Mahpella forces can appear in deep hyper where lore supports it.
- [ ] Distinct hyperspace movement, hazards, anomalies, pickups and boss encounters.
- [ ] Hyper missions connect back to normal-space war objectives.

## Z-mechanic implementation

- [ ] Normal space: trade, politics, governments, exploration, diplomacy and conventional war.
- [ ] Deep hyperspace: Keller guerrilla network, sabotage, stealth, hyperpirates, anomalies and alternate routes.
- [ ] Black-hole shadow worlds: ancient allies, Shadow Fleets, reality-bending navigation and rare technology.
- [ ] Actions in one layer affect the other two.
- [ ] Dynamic War Map tracks coordinated strikes across all three layers.

## Smart Diplomacy

- [ ] Alliance Grid: trust, fear, respect, ideology and hidden conflict triggers.
- [ ] Negotiation trees with bluff, bribery, evidence, leverage and psychological profiles.
- [ ] Index of Discord as a live campaign variable.
- [ ] Faction and leader memory of meaningful player actions.
- [ ] Race-specific diplomatic preferences and taboo actions.
- [ ] Coalition/hybrid/Shadow Fleet/Keller relationships can strengthen, fracture or realign.
- [ ] Diplomacy must produce concrete gameplay effects: missions, prices, support, access, intelligence, war behavior and endings.

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
5. Build landing/station scene framework with race-aware backgrounds/music.
6. Build planets/governments/station services.
7. Build text-quest engine and authored vertical-slice quests.
8. Deepen Smart Diplomacy and NPC memory.
9. Add hyper arcade mode and first Keller/Z-mechanic mission.
10. Add black-hole shadow-world mode.
11. Expand war layer, planetary battles and remaining SRHD/mod parity.

## Definition of done

A checkbox is complete only when the feature is meaningfully playable in the current `master`, connected to the real runtime, tested where practical, and does not regress existing systems. Placeholder constants, dead helpers or mock UI do not count.
