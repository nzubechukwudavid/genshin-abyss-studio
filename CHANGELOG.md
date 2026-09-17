# Changelog

All notable changes to **Genshin Abyss Studio** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Complete 8-phase transformation hardening (Security, Pipeline Correctness, Modularization, Persistence, Video Confidence).

---

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
