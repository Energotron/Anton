# WebGL integration

The repository now treats the WebGL implementation as a first-class parallel runtime alongside the existing Godot prototype.

## Architecture boundary

- `game/` remains the Godot/core gameplay prototype.
- `game/webgl/` is the browser/WebGL implementation imported from the SR3 reference archive.
- `docs/` remains the design authority for lore, MVP scope, Smart Diplomacy, Z-Mechanic and online-mode boundaries.
- `diplomacy_rules.json` remains the repository-level structured diplomacy data source.

The WebGL code should be extended rather than replacing the Godot prototype. New mechanics should map to the existing pillars: Smart Diplomacy, Alliance Grid, Index of Discord, three-dimensional/Z-space warfare and the Text Quest legacy.

## Import policy

The integration workflow downloads the reference `sr3-webgl.zip`, extracts it into `game/webgl/`, and excludes `node_modules` and nested duplicate archives. This keeps generated dependencies out of the repository while preserving source and runtime build files.

## Runtime

The browser entry point is `game/webgl/dist/index.html`. The source entry point is `game/webgl/src/main.js`.
