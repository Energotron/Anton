# KR3 Visual Style Reference — Children of Eltan

Status: canonical art-direction reference for KR3. Read together with `docs/MASTER_IMPLEMENTATION_TODO.md`, `docs/GDD.md`, `docs/KR2_MECHANICS_PARITY_MATRIX.md` and the current `game/webgl/` runtime.

## Goal

KR3 should immediately read as a modern continuation of the classic Space Rangers visual language, especially the presentation associated with Space Rangers HD / Universe-era modded play: dense colorful space backgrounds, readable tactical objects, compact information panels, a functional minimap, strong faction color identity, and a bottom HUD that keeps the playfield dominant.

This is an **inspiration/parity target**, not an asset-copying task. All KR3 art, UI textures, icons, ship sprites/models, station art, backgrounds, fonts, effects and layouts must be original or properly licensed. Do not reproduce protected source assets pixel-for-pixel.

## Reference-reading principles

When reviewing screenshots and gameplay videos, extract high-level visual grammar rather than exact assets:

- space is visually rich rather than flat: layered starfields, nebulae, dust, local glow, distant suns and subtle parallax;
- planets and stations are large readable landmarks, not tiny generic dots;
- ships remain identifiable at gameplay zoom through silhouette, faction color and engine/effect language;
- tactical information is compact and anchored around the edges so the center remains a navigable space scene;
- selected targets use clear range/selection cues and concise context panels;
- the minimap is visually prominent and useful for navigation, contacts and orbital context;
- the lower HUD acts as the persistent command/status strip for date, money/resources, ship state and major modes;
- bright projectiles, explosions, shields, engine trails and anomalies contrast strongly with the darker space background;
- the visual style should feel handcrafted and slightly retro-futuristic rather than minimalist/mobile-generic.

## KR3 rendering target

### Space scene

- Use multi-layer starfields with depth/parallax and authored nebula backplates per system family.
- Add subtle animated dust, distant glows, stars and environmental particles without making navigation noisy.
- Planet art should have strong unique coloration, atmosphere rims, city/night-light variants where appropriate, and visible moons/satellites when present.
- Major stations and bases need unmistakable silhouettes and faction/service-specific geometry.
- Black-hole and deep-hyper environments must be visually distinct from normal space, not simple recolors.

### Camera/readability

- Keep the playable field dominant; UI should frame the scene rather than cover it.
- At normal gameplay zoom, ships must remain readable from silhouette + faction palette + class profile.
- At zoomed-out/system-navigation views, replace detail with clean tactical markers rather than letting ships become unreadable noise.
- Selected targets should receive a restrained outline/reticle/range cue and a small contextual information panel.

## HUD language

Target a modernized continuation of the classic blue sci-fi command-console feel:

- persistent bottom command/status bar;
- compact top/side target-information panels;
- top-right minimap/radar as the default desktop placement, with responsive relocation on narrow/mobile screens;
- beveled/industrial frame language with restrained glow rather than flat generic web cards;
- blue/cyan neutral coalition UI base, with faction-specific accents only where context demands it;
- major screens (cargo, ship, market, quests, diplomacy, map) should feel like parts of the same ship computer rather than unrelated HTML pages;
- mobile/touch layout may reorganize controls but should preserve the same visual identity.

## Faction palettes and ship readability

These colors are canonical KR3 identification accents, not the only colors allowed on a hull:

- Malok — red / dark red;
- Peleng — swamp green / olive;
- Human — blue / steel blue;
- Feyan — violet / purple;
- Gaalian — yellow / gold;
- Klissan / Mahpella — organic green;
- Keller / Kelleroids — cyan / light blue;
- Unknown — deliberately nonstandard / unrevealed palette.

Each faction should also have a distinct **shape language**. Color alone is insufficient. Traders, military, pirate/raider, ranger/specialist, transport, interceptor, heavy combat and support ships must be recognizable by class before opening an info panel.

## Stations and bases

Do not represent all stations as the same hub with a recolor. Give each service a recognizable exterior and interior identity:

- ranger center — operational/navigation/contract motif;
- military base — armored, defensive, dock-heavy geometry;
- science base — sensor arrays, laboratories, experimental structures;
- medical center — cleaner organic/biotech motifs;
- business center — cargo/logistics/commercial traffic;
- technology center — fabrication, engineering and upgrade motifs;
- pirate base — improvised asymmetry, patched structures, contraband traffic.

Faction ownership can add secondary palette/material changes while preserving the service-type silhouette.

## Effects language

- Projectile, shield and engine effects should be readable by weapon/faction family.
- Hits should combine flash, particles, localized hull feedback and floating combat information without excessive screen clutter.
- Explosions need layered timing (flash → debris/particles → fading smoke/energy residue) rather than one-frame sprites.
- Tractor/salvage interaction should have a clear beam/path effect and readable pickup confirmation.
- Deep hyperspace should favor broken-energy trails, chromatic distortion and fast directional flow.
- Black-hole shadow worlds should use lensing, sparse light, silhouette-heavy composition and reality-distortion effects.

## Planet, docking and quest presentation

- Planet landing screens should use authored race/world-specific backgrounds, ambient animation and service overlays.
- Station docking must visually differ from planetary landing.
- Text quests should use a unified illustrated terminal/book-like presentation with location art, portraits where appropriate, and clear choice hierarchy.
- Prison, government, pirate den, laboratory, derelict and shadow-world quest locations should each have distinct scene art.

## UI modernization rule

Modernize usability, not identity. Keep classic strengths — compact information density, persistent spatial awareness, strong frame language and tactical readability — while improving:

- responsive scaling;
- touch targets;
- readable typography;
- contrast/accessibility;
- hover/touch tooltips;
- animation smoothness;
- high-DPI rendering;
- widescreen/mobile safe areas.

Avoid generic dashboard aesthetics, oversized rounded cards, excessive whitespace and full-screen modal flows that make KR3 look like a web admin panel instead of a space game.

## Reference workflow for future agents

Before implementing a major visual surface, review a small reference set of public screenshots/gameplay footage from Space Rangers HD / Universe and record only high-level observations: composition, information density, HUD placement, silhouette readability, background treatment, effects and interaction feedback.

Then implement an original KR3 interpretation. Never import screenshots, rip textures/sprites/UI pieces, trace protected art, or copy exact layouts/assets. When a reference is ambiguous, prefer consistency with the current KR3 art-direction rules above.

## Visual acceptance criteria

A visual increment is complete only when:

1. it is integrated into the real `game/webgl/` runtime;
2. it improves recognizability/readability or atmosphere in actual gameplay;
3. it preserves touch and desktop usability;
4. it uses original/properly licensed assets;
5. faction/class identity remains understandable without relying only on text labels;
6. it passes the normal WebGL QA gate and does not regress navigation or gameplay.
