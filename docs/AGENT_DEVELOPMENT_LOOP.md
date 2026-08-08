# Agent Development Loop

## Purpose

Bootstrap a repeatable development loop for **Космические Рейнджеры 3: Дети Эльтана**.

## Current iteration

1. Inspect repository state and existing design.
2. Convert the highest-value game-design requirement into a small, testable artifact.
3. Implement one vertical slice rather than expanding scope broadly.
4. Review the change for consistency with the README architecture.
5. Commit the iteration separately so progress remains reversible.

## First vertical slice target

Implement the foundations of **Smart Diplomacy** as deterministic data and rules before connecting it to UI or combat.

### Minimal model

- factions have diplomatic attitudes;
- relationships are represented numerically;
- actions modify relationships through explicit rules;
- outcomes remain deterministic for identical inputs;
- the model can later feed the Alliance Grid and quest systems.

## Agent loop

`inspect -> design -> implement -> review -> test -> commit -> next iteration`

## Constraint

Do not introduce a full online architecture while the solo gameplay foundation is still undefined. Prefer small, composable systems that can later be reused by the Galactic Network.
