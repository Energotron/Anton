# KR3 ↔ QuantDeus Mesh integration

Status: active foundation.

## Source of truth

GitHub repository `Energotron/space_rangers3`, branch `master`, remains the canonical KR3 engineering state. The full playable runtime under `game/webgl/` must never be replaced by a reduced scaffold.

Machine-readable public project state lives at `quantdeus-mesh/kr3-project-state.json`. Event payloads exchanged by agents should follow `quantdeus-mesh/event-schema.json`.

## Wix mirror

QuantDeus public portal: `https://elektron2345.wixsite.com/quantdeus`.

Wix CMS is enabled for the site. Collection `quantdeus-mesh-project-state` mirrors canonical public-safe state. The stable KR3 record ID is `kr3-canonical`. Collection permissions are public read and admin-only insert/update/remove.

The initial bridge record stores project, repository, canonical branch, runtime, release, current status, provenance source URL and synchronization timestamp.

## Synchronization contract

1. GitHub `master` is authoritative for code, tests, roadmap, parity backlog and release intent.
2. Agent runs may update the Wix mirror only from verified GitHub state.
3. Routine internal commits remain `visibility=internal` and must not create public-news noise.
4. A public QuantDeus milestone requires a user-meaningful tested KR3 change, provenance to a concrete GitHub SHA/release, and a concise public-safe summary.
5. `.github/release-decision.json` remains the release-intent gate; ordinary development keeps `release=false`.
6. Wix is a presentation/community node, not an alternate source of engineering truth.
7. Future asset, audio and telemetry feeds should extend this contract instead of creating incompatible one-off integrations.

## Planned Mesh nodes

- KR3 build/release events from GitHub Actions.
- Public milestone feed for the QuantDeus portal.
- Asset provenance feed for original/licensed game visuals.
- Data-driven music routing feed by race/location/state.
- Privacy-safe aggregate gameplay telemetry.
- Coordinator-agent task routing across KR3, QuantDeus and research repositories.

## Current bridge status

GitHub state feed: active.

Wix CMS mirror: active.

Event contract: active.

Automatic unattended GitHub-to-Wix push: not yet active; it requires a dedicated authenticated delivery path rather than embedding credentials in the repository. Until that transport exists, authorized agents synchronize the Wix record from verified GitHub state.
