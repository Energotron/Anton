# Quest System — Дети Эльтана

## Goal
Поддержать:
- большие сюжетные квесты
- дипломатические цепочки
- гипер-операции Келлера
- миссии в теневых мирах черных дыр
- повторяемые encounter-шаблоны

## Design Principles
1. **Почти каждый важный квест меняет политическую карту.**
2. **Квесты питают Smart Diplomacy System.**
3. **Выборы влияют не только на награды, но и на Index of Discord.**
4. **Один и тот же конфликт может иметь космическое, гиперпространственное и теневое измерение.**

## Quest Types
- `main_story`
- `faction_arc`
- `diplomacy`
- `hyper_ops`
- `shadow_world`
- `contract`
- `encounter`

## Core State Model
- global flags
- world phase / war phase
- faction reputation deltas
- alliance membership
- index_of_discord
- keller_trust
- shadow_fleet_trust
- hybrid_race_alignment
- known_secrets / intel tokens
- timed deadlines

## Recommended Structure
```yaml
id: main_keller_signal
kind: main_story
entry_conditions:
  world_phase: crisis
  location: coalition_border
stages:
  - id: intro
    text: "The shattered relay repeats a pattern only gaal seers can parse."
    choices:
      - id: follow_signal
        text: "Trace the pattern"
        goto: signal_trace
      - id: suppress_report
        text: "Hide the information from Coalition command"
        effects:
          keller_trust: 1
          reputation:
            coalition: -2
        goto: signal_trace
  - id: signal_trace
    text: "The path leads into unstable hyper corridors."
    choices:
      - id: request_feyan_gaal_help
        text: "Ask Feyan-Gaal navigators for support"
        requirements:
          faction_trust:
            feyan_gaal: 2
        effects:
          index_of_discord: 1
        goto: hyper_entry
      - id: force_entry
        text: "Enter alone"
        effects:
          ship_damage: 10
        goto: hyper_entry
  - id: hyper_entry
    text: "Keller is waiting, but not with open arms."
    choices:
      - id: negotiate
        text: "Negotiate"
        goto: keller_dialogue
      - id: threaten
        text: "Threaten Keller"
        effects:
          keller_trust: -3
          index_of_discord: 2
        goto: keller_dialogue
```

## Diplomacy-Specific Mechanics
A diplomacy quest can modify:
- bilateral trust
- alliance admission state
- fear and resentment values
- access to fleets / technologies / routes
- Index of Discord

### Dialogue Tools
Choices may carry tags:
- `bluff`
- `intel`
- `bribe`
- `prophecy`
- `threat`
- `appeal_to_survival`
- `appeal_to_pride`

These tags should be checked against faction psychology.

## Multi-Layer Mission Pattern
One story mission may contain 3 linked steps:
1. **Ordinary space setup** — diplomacy, logistics, staging.
2. **Hyper operation** — stealth, sabotage, anomaly traversal.
3. **Shadow phase** — black hole insertion, relic or fleet contact.

## Validation Rules
- every `goto` must reference an existing stage
- every quest must have at least one terminal stage
- diplomacy effects must use known keys
- quests that alter alliance composition must define fallout on failure
- quests touching black hole worlds must define exit condition
- online-only content should be clearly flagged and kept separate from solo canon

## MVP Content Target
- 1 prologue chain
- 1 Keller contact chain
- 1 hybrid race recruitment chain
- 1 Shadow Fleet contact chain
- 3 diplomacy crises
- 5 random encounter templates
- 1 pre-finale alliance summit
