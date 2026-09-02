# KR3 SRHD Technical Reference — XenoModKit

Status: canonical external technical research source for KR3 parity work.

Primary reference repository: `Xenomorphchyma/SRHD-XenoModKit`.

## Role in KR3 development

Use SRHD XenoModKit as a **high-priority technical research and inspection source** when reconstructing or validating Space Rangers HD mechanics, data structures, quest formats, mod behavior, resource formats, scripting relationships and release/audit workflows.

It is especially useful for studying:

- BlockPar/DAT structure and validation;
- SCR/RSON/RSM/SVR script representation and relationships;
- script registration and CacheData consistency;
- runtime-danger patterns and deterministic auditing;
- QM/QMM text-quest structure and round-trip behavior;
- GI/PNG, GAI, HAI and PKG resource formats;
- mod dependency/conflict structure;
- localization/encoding issues;
- reproducible build, audit and release concepts;
- XenoNativeLoader Host API references where relevant to understanding the modern SRHD mod ecosystem.

## Mandatory autonomous-loop behavior

On KR3 parity/research runs, when a missing legacy mechanic, quest behavior, resource family, scripting concept or mod feature needs technical clarification, inspect `Xenomorphchyma/SRHD-XenoModKit` before relying only on screenshots, forum descriptions or memory.

Use it together with:

- vanilla Space Rangers 2 / Space Rangers HD behavior;
- `docs/KR2_MECHANICS_PARITY_MATRIX.md`;
- `docs/KR2_EXHAUSTIVE_FEATURE_AUDIT.md`;
- current maintained mod documentation and gameplay evidence;
- the canonical KR3 runtime under `game/webgl/`.

Any newly discovered mechanic must still flow through the normal KR3 pipeline:

`source evidence -> mechanic summary -> KR3 gap -> design adaptation -> small playable increment -> regression test -> parity status`.

## Important licensing boundary

As of the repository check on 2026-09-02, GitHub exposes **no declared repository license** for `Xenomorphchyma/SRHD-XenoModKit`, and no root `LICENSE` file was found.

Therefore:

- do **not** copy XenoModKit source code into KR3 by default;
- do **not** vendor its code, assets or generated third-party game resources into KR3 without an explicit compatible license or permission;
- do use the repository for factual/technical research, format understanding, interface concepts, behavioral validation and provenance;
- independently implement KR3 code, tests, data models, tools, writing and assets;
- if a future explicit compatible license appears, reassess reuse under that license and preserve attribution/notice requirements.

This restriction also applies to proprietary Space Rangers game assets and third-party tools referenced by XenoModKit.

## Source-of-truth hierarchy

For KR3 itself, `Energotron/space_rangers3` `master` remains the source of truth.

For SRHD technical research, prefer the following evidence order where practical:

1. reproducible behavior in vanilla/current SRHD;
2. XenoModKit's parsers/audits/documentation as technical evidence;
3. official/mod author documentation and changelogs;
4. maintained mod packages and public demonstrations;
5. screenshots/videos/community descriptions for behavior that cannot be inspected structurally.

Conflicts are resolved by preserving verified SRHD behavior while implementing an original KR3-compatible design rather than reproducing historical bugs or incompatible mod variants.
