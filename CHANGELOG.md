# Changelog

All notable changes to **Genshin Abyss Studio** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.0] - 2026-09-24 (Milestone: Overlay Engine, Export Resilience, A/B Comparison & YouTube Studio Deep-Links)

### Added
- **Modular Draggable Canvas Text Overlays (web/modules/text_overlay_manager.js, web/studio.js)**: Added live interactive text overlay stamp engine supporting arbitrary stamps (C0, SOLO, F12, NO HEALER, TOP, BOTTOM, C6 R5), custom fonts, sizes, colors, stroke outlines, canvas drag-to-position, and 40-step undo/redo persistence.
- **36★ Golden Clear Badge & Safe-Zone Channel Watermark**: Integrated customizable gold gradient clear badges and channel watermark overlays with opacity and drop-shadow controls, adhering to YouTube mobile duration timestamp safe-zones.
- **A/B Variant Compare Modal (web/modules/ab_compare_modal.js)**: Side-by-side YouTube desktop browse feed simulator with dark theme styling, channel avatar, title preview, and 1-click dual thumbnail download.
- **OBS Transparent Stream Overlay Preset**: Added an OBS overlay export preset to generate 1080p transparent PNG team docks without character art for OBS stream layers.
- **YouTube Playlist & Studio Deep-Link Integration (pp.py, web/index.html)**: Added /api/youtube/playlists endpoint, playlist selection in metadata modal, and 1-click pre-filled YouTube Studio upload deep-link.

### Fixed & Hardened
- **Double Thumbnail Export Bug**: Eliminated duplicate event listener collision between web/studio.js and web/modules/thumbnail_toolbar.js, wrapped canvas rasterization in atomic state.isExporting mutex lock, and converted to Promise-based wait canvas.toBlob().
- **YouTube Description Overwrite on Drag**: Added state.descriptionLocked flag with UI lock badge (🔒 Custom Edited) and reset button (↺ Auto) preventing canvas dragging and character adjustments from wiping user edits.
- **CapCut Draft Chapter Sync Feedback**: Added instant high-visibility toast alert and .flash-highlight animation confirmation upon successful chapter timecode synchronization.
- **Team Duplicate Button Keyboard Shortcut**: Bound [Alt+D] global hotkey and added explicit tooltips for 1-click team duplication.

---

## [2.5.3] - 2026-09-23 (Milestone: Team Duplicate, Arranger Decoupling & Interactive Card Reordering)

### Added
- **1-Click Team Duplicate Action (`web/studio.js`, `web/index.html`)**: Added `👯 Duplicate Side 1 to Side 2` under the thumbnail side tabs for single-team showcases. Instantly clones character art, vision, archetype, constellation, and teammates, with automated horizontal mirroring and symmetric framing.
- **Dedicated Arranger Pipeline Switcher**: Added an in-container toggle between `⚔️ Basic Mode` (4-clip single run per chamber + builds) and `✨ Showcase Dual-Run` (7–8 clips inverse dual-run) completely isolated from the thumbnail editor.
- **Interactive Basic Mode Card Controls**: Integrated in-studio clip picking (`📂 Browse`), slot swapping (`🔄 Swap`), and adjacent chamber reordering (`▲ / ▼`) into standard 4-clip arranger cards.
- **Smart Multi-Clip Session Partitioning (`app.py`)**: Automatically partitions recording sessions containing > 4 clips into `Run 1 (Clips 1–4)`, `Run 2 (Clips 5–8)`, and `All Clips`.
- **In-App What's New Changelog**: Added an integrated "What's New in v2.5.3" card in the desktop About modal for clear user-facing release transparency.

### Fixed
- **Canvas Pointer Interaction Hijacking**: Retired experimental overlay hooks from `thumbnailCanvas` so selecting characters to drag, pan, or scroll-zoom works smoothly without triggering mode resets.
- **Arranger-Thumbnail Layout Coupling**: Fixed global `state.layoutMode` leakage so toggling Arranger pipelines never hides thumbnail sidebar controls or alters canvas state.
- **Markup Structure Restoration**: Restored missing `<header>` closing tag and `<main class="studio-container">` layout hierarchy, fixing top bar element crowding and viewport distortion.

---

## [2.5.2] - 2026-09-23 (Milestone: UI Streamlining, BGM Tab Retirement & Version Hygiene)

### Removed
- **Dedicated Frontend BGM Studio Tab**: Fully retired the manual in-browser music audition tab (`#viewBGMStudio`) and library browser modal. Automated background soundtrack selection, duration matching, and `-30 dB` leveling remain fully active in the backend auto-editor and CapCut timeline assembler (`auto_edit_abyss.py` / `/api/assemble-capcut`).

### Improved & Hardened
- **Zero-Drift Version Alignment (`execution/bump_version.py`)**: Enhanced atomic version synchronization to cover `execution/build_exe.py` fallback and `tests/test_version_consistency.py`.
- **UI Performance & Bundle Hygiene**: Eliminated 250+ lines of dead DOM markup and unhooked inactive audio audition listeners.

---

## [2.5.0] - 2026-09-21 (Milestone: Creator Workflow Direction, Dual-Showcase Cuts, Victory Retention & BGM Intelligence)

### Added
- **Smooth Dual-Showcase Video Cuts**: Intelligently unified A-side and B-side Abyss runs with seamless cross-chamber matching and automatic transition alignment.
- **Victory Screen & Chamber Cleared Retention**: Intelligent banner detection in auto_edit_abyss.py preserving 1.8s-2.0s of the 3-star victory screen and challenge completion moments at the tail of each chamber.
- **Intelligent Multi-Track BGM Engine**: Automatic per-chamber soundtrack matching, tempo synchronization, and fadeout timing directly onto CapCut Track 1.
- **Calibrated Audio Mastering**: Standardized gameplay clips at `-20.0 dB` (linear `0.10`) and background music at `-30.0 dB` (linear `0.0316`), ensuring combat sound effects and voicelines cut through distinctly.
- **Automated Version Consistency Protection**: Added `tests/test_version_consistency.py` preventing future version drift across UI, API, and packaging artifacts.

### Improved & Hardened
- **Render Cloud 512MB RAM Ceiling Hardening**: Throttled in-memory cache to 25 items, disabled high-concurrency warmup on cloud boots, and bypassed RAM buffering for images > 1MB.
- **Accurate Video Dimension Probing**: Enhanced `probe_video_metadata` to probe exact video stream dimensions via OpenCV, fixing synthetic pipeline assertions.
- **Universal PyInstaller Bundling**: Added `execution.dialog_service`, `mp4_fast_parser`, `abyss_editor_gui`, and modular routers to standalone distribution.

### Release Note
This release represents a major product-direction milestone focusing on automated dual-team Abyss editing and cloud performance hardening. The earlier temporary release tag `v1.5.0` was an indexing error and has been formally superseded by `v2.5.0`.

---

## [2.1.2] - 2026-09-18 (Milestone 6: Single Source of Truth & Zero-Drift Release Hygiene)

### Added
- **Single Source of Truth Version Manager (`execution/bump_version.py`)**: Centralized tool supporting atomic version bumps (`python execution/bump_version.py <version>`) and validation (`--check`) across `app/core/config.py`, Inno Setup installer (`installer.iss`), PyInstaller binary metadata (`build_exe.py`), GitHub Actions workflow (`release.yml`), and web assets.
- **Dynamic Frontend Version Synchronization**: Web client now queries `/api/environment` on launch to dynamically bind the authoritative backend `APP_VERSION` to all UI badges and modals (`.app-version-display`), preventing stale cached markup.
- **Automated CI Version Alignment Test**: Added `test_version_hygiene_and_alignment` to pytest regression suite ensuring zero version drift across all artifacts in CI.

### Fixed
- **Version Drift**: Eliminated hardcoded stale version numbers (`v2.1.0`) in the desktop About modal and sidebar credits badge.
- **Cache-Busting Query Synchronization**: Aligned `style.css` and `studio.js` cache-busting queries with the exact active release version.
- **Dynamic PyInstaller Version Metadata**: Updated `execution/build_exe.py` to derive `FileVersion` and `ProductVersion` directly from `app.core.config.APP_VERSION` rather than static strings.

---

## [2.1.1] - 2026-09-18 (Milestone 5: Streamlined Navigation & Dynamic Arranger Suite)

### Added
- **Dynamic Recording Session Switcher**: Full session-level parameterization across `/api/recordings/sessions`, `/api/recording-slots`, and `/api/assemble-capcut`, allowing instant chronological switching across recorded Abyss runs with real-time clip card updates.
- **Graceful Music Tab Empty State**: Clean fallback card in the Music tab when recordings are cleared or absent, with a 1-click shortcut to explore and audition the 1,295 indexed tracks in the full library browser.
- **Support for 3-Chamber Runs**: Added visual placeholder for Floor 12 runs without a 4th build clip, supporting continuous direct 3-chamber assembly in CapCut.
- **Extended Domain Whitelist**: Added `act-webstatic.hoyoverse.com` to `ALLOWED_PROXY_DOMAINS` for character artwork rendering.

### Changed
- **Streamlined Navigation Nomenclature**: Simplified top navigation and header names across the board to single-word, high-clarity terms: **`🎨 Thumbnail` • `🎬 Arranger` • `🎵 Music`**.
- **Top Header Responsive Layout**: Added high-priority flex positioning and intermediate screen width collapse (`@media (max-width: 1500px)`), eliminating button overflow and guaranteeing 100% visibility for the orange `#btnExport` button on 1366px and 1080p scaled displays.

### Fixed
- Fixed inverted dropdown selection bug where the oldest session was pre-selected while showing newest clips.
- Fixed duplicated `(4 clips) (4 clips)` suffix rendering in the session dropdown.
- Fixed missing `change` event listener on the recording session selector.
- Fixed phantom `01:30` track assignments being generated when the captures directory was completely empty.

---

## [2.1.0] - 2026-09-18 (Milestone 4: Operational Hardening & Cloud Stability)

### Added
- **Structured Logging Architecture**: Centralized logging system (`app/core/logger.py`) with ISO-8601 timestamps, log level markers, and module hierarchy, eliminating unformatted stdout output.
- **Atomic CapCut PC Draft Synthesis**: Direct integration of `atomic_write_json` across `draft_content.json`, `draft_meta_info.json`, `draft_virtual_store.json`, `draft_agency_config.json`, and `root_meta_info.json` to prevent draft corruption.
- **End-to-End Creator Pipeline Test Harness**: Comprehensive test suite (`tests/test_e2e_creator_workflow.py`) validating CapCut timeline generation, 4-track BGM duration matching, `.abyss` project save/load roundtrips, and 1080p canvas image upload/dimension constraints.
- **Extended Path Traversal & Boundary Test Suite**: 36 automated security tests (`tests/test_path_security_extended.py`) verifying rejection of URL encoding, double encoding, null bytes, and Windows UNC shares.
- **Expanded Pytest Regression Harness**: Test suite expanded to **82 automated passing tests** with 100% pass rate.

### Changed
- **Dynamic Single Source of Truth for Versioning**: Bound `FastAPI(version=APP_VERSION)` in `app.py` directly to `app.core.config.APP_VERSION` ("2.1.0"), eliminating version drift.
- **Exception Handling Hygiene**: Replaced broad `except Exception:` catches with explicit handled types (`json.JSONDecodeError`, `OSError`, `ValueError`, `KeyError`) and added `logger.exception(...)` trace diagnostics.
- **Headless Cloud Container Dependencies**: Migrated to `opencv-python-headless` for zero-dependency operation in headless Linux containers (Render, Hugging Face Spaces), resolving missing `libGL.so.1` failures.
- **Pinned Production Dependencies**: Declared `python-multipart>=0.0.9`, `tinytag>=2.0.0`, and `requests>=2.31.0` in `requirements.txt`.

### Fixed
- Fixed Render cloud deployment container startup crashes caused by missing `libGL.so.1` and missing `python-multipart`.
- Fixed potential partial write corruption during `.abyss` and CapCut draft saving by applying atomic filesystem writes.

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
