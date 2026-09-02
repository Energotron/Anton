# KR3 — SRHD Technical Parity Gates

Status: canonical development/QA checklist derived from public SRHD technical evidence, especially `Xenomorphchyma/SRHD-XenoModKit`. Read together with `docs/SRHD_XENOMODKIT_REFERENCE.md` and `docs/KR2_MECHANICS_PARITY_MATRIX.md`.

## Purpose

KR3 does not need to reproduce SRHD binary formats internally, but legacy/mod parity work should preserve the **behavioral contracts** that XenoModKit makes inspectable: deterministic data, validated quest graphs, explicit script/resource dependencies, localization integrity, reproducible content builds and a clear distinction between static validation and actual runtime proof.

These gates are development infrastructure, not gameplay-completion checkboxes. A legacy mechanic remains incomplete until it is playable in the canonical `game/webgl/` runtime and passes the normal KR3 quality gate.

## Technical parity gates

### 1. Structured-data integrity

When a KR2/SRHD mechanic is translated into KR3 JSON/JS data, the KR3 representation must have explicit schema expectations, stable identifiers and deterministic load behavior. Unknown/unsupported source fields should be recorded during research rather than silently guessed.

### 2. Quest round-trip safety

XenoModKit can inspect, validate, export and rebuild QM/QMM quests. KR3's equivalent authored quest pipeline should therefore require that a quest can be serialized/deserialized without losing stage IDs, branches, conditions, rewards, failure paths or localized text. Broken references must fail validation before runtime.

### 3. Script/event registration consistency

SRHD modding relies on consistent script registration and CacheData relationships. KR3 equivalents must likewise prevent dead event handlers, orphaned quest actions, missing runtime registrations and references to nonexistent faction/item/location IDs. Registration audits should be deterministic and runnable without launching the full game where practical.

### 4. Localization and encoding integrity

Legacy SRHD content is sensitive to CP1251/UTF-8 corruption. KR3 uses UTF-8, but imported/researched Russian text must still be checked for replacement characters, mojibake, broken escape sequences and accidental loss of Cyrillic. Tests should cover representative Russian narrative/UI strings when a subsystem performs serialization or transformation.

### 5. Resource validation

XenoModKit exposes validation/inspection for GI/GAI/HAI/PKG families and image alpha geometry. KR3 should apply the same design principle to its own authored assets: verify file existence, dimensions/metadata where relevant, transparent bounds for sprites/icons, manifest references and graceful fallback behavior. Asset corruption must not trap navigation or crash the playable runtime.

### 6. Dependency/conflict visibility

When KR3 adopts a mechanic inspired by multiple SRHD mods, document incompatible behaviors and choose one coherent KR3 default. Data-driven feature flags/difficulty settings may expose useful alternatives, but incompatible historical variants must not be activated simultaneously by accident.

### 7. Reproducible content/build evidence

XenoModKit emphasizes audited, reproducible staging and SHA-256-backed release output. KR3 releases should preserve the same principle: a release/milestone must identify the exact Git SHA, validation result and artifact provenance. Generated/transient output must not be committed as source unless the repository explicitly treats it as canonical.

### 8. Static proof vs runtime proof

A parser/schema/lint success proves structure, not gameplay. Documentation and automated agents must distinguish:

- **static/structural validation** — file/schema/reference/syntax correctness;
- **unit/regression validation** — deterministic subsystem behavior;
- **runtime integration proof** — mechanic connected to the actual `game/webgl/` loop;
- **release proof** — tested canonical SHA/artifact ready for users.

No parity checkbox may be marked complete using only the first category.

## XenoModKit usage rule

Use XenoModKit as technical evidence and a research microscope for SRHD behavior/formats. Because its repository currently has no declared compatible license, do not copy/vendor its implementation into KR3. Reimplement behavior independently in original KR3 code/tests/data/assets.

## Autonomous-loop application

When a future run studies a KR2/SRHD/mod mechanic through XenoModKit, record any newly discovered behavioral contract in the relevant design/parity document, then implement only one small playable KR3 increment. Apply the gates above as appropriate without turning source-format archaeology into a replacement for gameplay development.
