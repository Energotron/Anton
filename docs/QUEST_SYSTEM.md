# Quest System

## Goal
Support handcrafted story quests and reusable random encounter templates.

## Quest format (draft)
```yaml
id: quest_intro_signal
kind: story
entry_conditions:
  min_reputation:
    federation: 0
  location: sol_hub
stages:
  - id: intro
    text: "A damaged relay repeats a strange signal from the outer sector."
    choices:
      - id: investigate
        text: "Trace the signal"
        goto: trace_signal
      - id: ignore
        text: "Ignore it"
        effects:
          reputation:
            federation: -1
        goto: end_ignore
  - id: trace_signal
    text: "You narrow it down to a dead trade corridor..."
    choices:
      - id: continue
        text: "Continue"
        goto: end_continue
```

## Quest types
- `story`
- `side`
- `contract`
- `encounter`

## State model
- global flags
- faction reputation deltas
- local system state
- ship / cargo requirements
- optional timed deadlines

## Validation rules
- every `goto` must reference an existing stage
- every quest must have at least one terminal stage
- effects must use known keys
- optional localization later

## MVP content target
- 1 prologue chain
- 3 faction quests per faction
- 5 random encounter templates
- 1 finale trigger
