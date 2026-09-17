# Changelog

All notable changes to **Genshin Abyss Studio** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-09-17 (Milestone 3: Production Hardened Release)

### Added
- **Multi-Format Export Presets**: Single-click export dropdown supporting Lossless 1080p PNG, YouTube-compliant compressed JPEG (<2.0MB strict cap with adaptive quality stepping), and Transparent Roster Overlay PNG for OBS/video editors.
- **Explainable BGM Recommender**: Multi-criteria combat-to-music duration matching with energy hints, duration delta margins, fade-out tails, and explainable badge cards.
- **Canonical Track Hashing**: Deterministic 16-character SHA-256 track identification across Windows/Linux path casing and directory separators.
- **Concurrency-Throttled Image Super-Sampling**: Asyncio semaphore (`Semaphore(2)`) queue preventing CPU/memory exhaustion during rapid super-resolution enhancement requests.
- **Full 32-Test Regression Suite**: 100% automated test coverage across baseline hygiene, security, correctness, domain models, catalog services, video confidence, project persistence, frontend capabilities, and audio intelligence.

---

## [1.3.0] - 2026-09-17 (Milestone 2: Reliable Creator Release)

### Added
- **40-Step Canvas History Engine**: Immutable undo/redo snapshot stack (`Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`) and toolbar quick-action buttons.
- **.abyss Project Persistence**: Complete workspace serialization format (`.abyss`) supporting 1-click project export and canvas drag-and-drop import.
- **Environment Capability Detection**: Runtime capability detection via `/api/environment` with live header badge (`🖥️ Desktop` vs `🌐 Cloud Sandbox`).
- **Video Analysis Confidence & Manual Overrides**: Multi-signal detection with temporal persistence, static motion checks, normalized confidence scoring, and `/api/recordings/trim-override`.
- **Modular Routers & Typed Domain Models**: Pydantic schemas for `Segment`, `RecordingAnalysis`, `MusicAssignment`, and `AbyssProject`.
- **Automated Regression Suite**: 28 automated pytest test cases covering security, media correctness, domain models, catalog services, video confidence, project persistence, and frontend capabilities.

---

## [1.2.0] - 2026-09-17 (Milestone 1: Safe Local Release)

### Security & Correctness Hardening
- **Path Traversal Restrictions**: Bounded video and audio file streaming to allowed media roots.
- **SSRF Protection**: Domain allowlist and private/loopback IP address blocking on `/api/proxy-image`.
- **Upload File Hardening**: UUID file sanitization and MIME-type enforcement.
- **Remote Sync Secret Protection**: Removed insecure default secrets and guarded sync endpoints.
- **Subprocess & Intermission Tuple Fix**: Resolved missing imports and tuple-unpacking bugs in auto-editor.

## [1.1.0] - 2026-09-17

### Added
- **On-Demand Character Caching**: Added `POST /api/assets/cache-character/{name}` and live `📥 Cache Unit` sidebar indicator for fast single-character offline asset downloads.
- **Offline Thumbnail Resilience**: Automatic graceful fallback to placeholder cards and proxy retry if offline.
- **TGozaru Abyss Spire Banner**: Center divider Abyss Floor Spire banner with customizable hook tags.
- **TGozaru Vertical Roster Layout**: 3-teammate vertical card arrangement along outer borders for unobstructed 100% character art visibility.

### Fixed
- Fixed HoYoWiki pre-caching truncation bug where only the first 3 images were downloaded.
- Fixed `NameError` in `_make_webp_thumbnail` invocation during batch cache initialization.

---

## [1.0.0] - 2026-09-10

### Added
- Initial release of Genshin Abyss Studio.
- Dual-character side-by-side interactive Canvas renderer with 60fps pan/zoom.
- 130-character HoYoWiki catalog with official artwork.
- Automated Spiral Abyss video segmentation, intermission detection, and CapCut PC draft synthesis.
- BGM duration-matching recommendation engine.
- YouTube chapter, title, and description generator.
