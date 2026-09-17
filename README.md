<div align="center">

# 🎬 Genshin Impact Spiral Abyss Studio

**The All-in-One Content Creation Suite for Spiral Abyss Creators**  
*1080p Thumbnail Studio • Automated CapCut PC Video Arranger • Smart BGM Engine • YouTube Chapter Generator*

[![Release](https://img.shields.io/badge/Release-v2.0.0-00E5FF?style=for-the-badge&logo=github)](https://github.com/nzubechukwudavid/genshin-abyss-studio/releases/latest)
[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20x64-0078d4?style=for-the-badge&logo=windows)](https://github.com/nzubechukwudavid/genshin-abyss-studio/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)
<br/>
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Tests](https://img.shields.io/badge/Pytest-32_Passing_Tests-brightgreen.svg?style=flat-square&logo=pytest&logoColor=white)](tests/)
[![CapCut PC](https://img.shields.io/badge/CapCut_PC-Native_Drafts-00C4CC.svg?style=flat-square)](https://www.capcut.com)
[![1080p 60fps](https://img.shields.io/badge/Canvas-1080p_60fps-FF0055.svg?style=flat-square)](#1--1080p-visual-thumbnail-studio-100-offline-first)

<br/>

[✨ Key Features](#-key-features) • [🚀 What's New in v2.0](#-whats-new-in-v200) • [⚡ Architecture](#-system-architecture) • [🚀 Quick Start](#-quick-start) • [⌨️ Shortcuts](#️-creator-ergonomics--shortcuts) • [🖥️ Requirements](#️-system-requirements) • [👨‍💻 Author](#-author--acknowledgments)

<br/>

![Studio Interface Preview](data/assets/studio_preview.png)

</div>

---

### 🚀 What's New in v2.0.0 (Production Hardened Release)
- **40-Step Canvas History Engine**: Full undo/redo snapshot stack (`Ctrl + Z` / `Ctrl + Y` / `Ctrl + Shift + Z`) with instant toolbar quick-action buttons for frictionless thumbnail experimentation.
- **`.abyss` Project Persistence**: Self-contained project workspace file format. Single-click 💾 **Save Project** downloads `[Run].abyss`, and canvas drag-and-drop instantly restores transforms, roster setups, and video metadata in 0ms.
- **Multi-Format Export Presets**: Export dropdown menu supporting **Lossless 1080p PNG**, **Web-Optimized JPEG** (adaptive quality stepping guaranteed under YouTube's 2MB cap), and **Transparent Roster Overlay PNG** for OBS/video editor overlays.
- **Multi-Signal Video Cut Analysis & Confidence**: Temporal persistence (≥3 sampled frames) and static motion pixel variance detection eliminates false cuts from white elemental bursts. Includes normalized 0.0–1.0 confidence scoring and manual creator trim override persistence.
- **Explainable BGM Intelligence**: Multi-criteria combat-to-soundtrack duration matching with duration delta margins, combat pacing energy tags, fade-out tails, and cross-platform canonical SHA-256 track identification.
- **Environment Capability Detection**: Runtime capability discovery via `/api/environment` with a dynamic header status pill (`🖥️ Desktop` vs `🌐 Cloud Sandbox`).
- **Enterprise-Grade Security Hardening**: Bound media streaming roots, SSRF domain allowlists with private IP/loopback blocking on proxy routes, UUID file upload sanitization, and elimination of hardcoded secrets.
- **Automated Regression Test Harness**: 32 automated Pytest test cases covering security, media correctness, domain models, catalog services, video confidence, project persistence, and frontend capabilities.

---

### 💡 Why Genshin Abyss Studio?
Producing high-retention Spiral Abyss showcase videos typically requires juggling 4 separate applications:
1. **Graphic design software** for split-screen 1080p thumbnails, character alignment, and lineup docks.
2. **Video editors** to manually scrub through recordings, cutting loading screens and dead air.
3. **Audio tools** to find battle music that matches exact chamber clear durations.
4. **Calculators & text editors** to manually compute chapter timecodes for YouTube descriptions.

**Genshin Abyss Studio eliminates the friction.** Built from the ground up as a native, 100% offline-first workstation, it automates the entire preparation and post-production workflow in seconds.

*Architected & crafted with ⚡ by [David (@nzubechukwudavid)](https://github.com/nzubechukwudavid).*

---

## ⚡ System Architecture

Instead of spending hours manually trimming clips, finding matching music, and layering graphics, the suite completes the entire pipeline in **under 15 seconds**:

```
[Raw Screen Recordings (Chambers 1-3 + Builds)]
                       │
                       ▼
 ┌───────────────────────────────────────────────┐
 │       Auto-Edit & Loading Screen Trimmer      │
 │  - Coarse-to-fine intermission detection      │
 │  - 7 clean cuts + cinematic transitions       │
 │  - -14 dB LUFS broadcast audio normalization  │
 └───────────────────────┬───────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   Smart BGM Recommender   │   │  1080p Thumbnail Studio   │
│ - Ultra-fast header scan  │   │ - 150+ character roster   │
│ - Zero duplicates across  │   │ - Official HoYoWiki art   │
│   Chambers 1-3 & Builds   │   │ - Direct canvas controls  │
│ - Synchronized in-app     │   │ - Golden eye alignment    │
│   video audition player   │   │ - 4-man showcase docks    │
└─────────────┬─────────────┘   └─────────────┬─────────────┘
              │                               │
              ▼                               ▼
 ┌───────────────────────────┐   ┌───────────────────────────┐
 │   Native CapCut PC Draft  │   │  YouTube Chapter Timestamps
 │ (Timeline + Audio Fades)  │   │ (Ready for YouTube Studio)│
 └───────────────────────────┘   └───────────────────────────┘
```

---

## ✨ Key Features

### 1. 🎨 1080p Visual Thumbnail Studio (100% Offline-First)
- **Direct Canvas Manipulation**: Interactive touch & mouse panning, pinch-to-zoom, and free framing directly on the 1080p canvas with live 60fps responsiveness.
- **100% Offline-First Architecture**: Over 150 official character avatars, typography fonts (Anton, Montserrat, Rubik, Inter), rosette medallions, and dividers are bundled directly in the application. No missing image icons or CDN network bottlenecks.
- **Complete 150+ Character Roster**: Full character catalog up to Natlan (*Mavuika, Citlali, Chasca, Kinich, Xilonen, Flins, Skirk, etc.*) with element filters and high-speed local avatar rendering.
- **Adaptive Patch Rosette Medallion**: Procedural metallic 16-lobed medallion shader that auto-adapts its gradient lighting to active character visions (Pyro, Hydro, Electro, Cryo, Anemo, Geo, Dendro, Gold) with custom hex color picker support.
- **4-Man Team Roster Docks & Screenshot Cropper**:
  - Donaturine / Sireula / Gust21 standard Level 90 Showcase cards with role badges.
  - Interactive In-Game Lineup Screenshot Cropper (`Ctrl + V` paste or file import) for instant in-game fidelity.
- **Official HoYoWiki Artwork Filmstrip**: 20–80+ high-resolution illustrations per unit (*announcements, birthday art, character cards, splash art*) with instant WebP thumbnail caching and 1-click 1800p HD portrait loader.
- **Cinematic Framing Tools**:
  - `🔄 Swap Sides`: Swap left and right characters instantly.
  - `👁️ Eye Guide`: Toggle golden alignment line for perfect cinematic framing.
  - `↔️ Flip`: Mirror character orientation.
  - `🎯 Focus Head` & `🧍 Focus Torso`: Instant framing presets.
- **Crisp 1080p PNG Export & Direct Clipboard**: Exports high-resolution 1920x1080 thumbnail without selection borders or guide lines, plus 1-click copy directly to system clipboard.

---

### 2. 🎬 Automated CapCut PC Video Editor
- **Intelligent Loading Screen Removal**: Proprietary coarse-to-fine color difference scanner trims dead time and mid-chamber loading screens while preserving the entire combat run.
- **7-Cut Assembly**: Automatically stitches First Half, Second Half, and Character Builds into a ready-to-render 16:9 CapCut timeline.
- **Cinematic Transitions**: Seamless 0.5s `black_fade` or `woosh` blur cross-zooms between chambers.
- **Native CapCut PC Draft Generator**: Writes native `draft_content.json` and `draft_meta_info.json` directly into your local CapCut drafts folder without slow re-encoding.

---

### 3. 🎵 Smart Multi-Track BGM Engine
- **Ultra-Fast Recursive Indexing**: Scans 400–1,200 audio files per second using lightweight header parsing (`tinytag`) without decoding heavy audio waveforms.
- **Combat Duration & Energy Matcher**:
  - Matches high-energy battle music to Chambers 1, 2, and 3 clear times ($T_{C1}, T_{C2}, T_{C3}$).
  - Matches relaxed/lo-fi outro music to the Character Builds showcase (~1:30).
  - **Zero Duplicate Guarantee**: Enforces unique tracks across the entire run.
- **Broadcast Loudness Standards**: -14 dB linear gain matching with 1.5s exponential fade-outs on victory screens.
- **In-App Dual-Track Audition Player**:
  - Phase-locked video/audio playback synchronized within $\pm 10\text{ms}$.
  - RFC 7233 HTTP 206 Partial Content byte-range streaming for instantaneous seeking.
  - `⚡ Jump to Drop`: Instantly seek directly to the track's combat drop point.
  - Alternative candidate switcher dropdown per chamber slot.

---

### 4. ⏱️ Automatic YouTube Chapter Generator
- Computes microsecond-accurate timecodes for each chamber and team composition.
- Formats ready-to-paste description blocks for YouTube Studio:
  ```
  00:00 - Chamber 1-1 (Mavuika OVERLOAD)
  01:24 - Chamber 1-2 (Chasca LUNAR HEX)
  02:45 - Chamber 2-1 (Mavuika OVERLOAD)
  04:02 - Chamber 2-2 (Chasca LUNAR HEX)
  05:30 - Character Builds, Weapons & Artifacts
  ```
- Automatically syncs metadata between local desktop and web studio.

---

## ⌨️ Creator Ergonomics & Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Ctrl + Z` | Undo | Reverts the last canvas transform, preset, or roster change (up to 40 steps) |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo | Restores the previously undone canvas action |
| `Ctrl + S` | Save Project | Instantly exports self-contained `.abyss` project file with all current canvas state |
| `Ctrl + O` | Open Project | Prompts file picker to load an existing `.abyss` project workspace |
| `1` | Select Side 1 (Left) | Activates left character slot for transform & styling |
| `2` | Select Side 2 (Right) | Activates right character slot for transform & styling |
| `S` | Swap Sides | Seamlessly swaps left and right characters and team rosters |
| `F` | Mirror / Flip | Horizontally flips the active character portrait |
| `G` | Toggle Eye Guide | Displays the golden eye-level alignment crosshair |
| `E` | HD Clarity Boost | Triggers bilateral super-resolution edge restoration |
| `Ctrl + V` | Paste Screenshot | Opens the in-game lineup crop modal from clipboard |
| `Esc` | Clear / Close | Clears search input or closes active modal |

---

## 🚀 Quick Start

### 🌟 Option 1: Single-File Setup Installer (Recommended)
**Best for all creators.** No Python, terminal, or Git required!
1. Download **[`GenshinAbyssStudio-Setup.exe`](https://github.com/nzubechukwudavid/genshin-abyss-studio/releases/latest)** from the latest GitHub Release.
2. Run the installer wizard. It will install the application and create Desktop and Start Menu shortcuts.
3. Launch **Genshin Abyss Studio** and start creating!

### 📦 Option 2: Portable ZIP Package
1. Download **[`GenshinAbyssStudio-Windows-x64.zip`](https://github.com/nzubechukwudavid/genshin-abyss-studio/releases/latest)**.
2. Extract the ZIP anywhere on your PC.
3. Double-click **`GenshinAbyssStudio.exe`** (or `Launch Genshin Abyss Studio.bat`).
4. The studio opens instantly in an isolated desktop window.

### 🐍 Option 3: Run from Source (Python 3.10+)

#### 1. Clone & Install
```bash
git clone https://github.com/nzubechukwudavid/genshin-abyss-studio.git
cd genshin-abyss-studio
pip install -r requirements.txt
```

#### 2. Launching the Suite
- **Web Browser Studio**:
  ```bash
  python app.py
  ```
  Open **`http://localhost:7860`** in any browser.

- **Dedicated Desktop Studio**:
  ```bash
  python execution/desktop_main.py
  ```

- **Standalone Video Auto-Editor**:
  ```bash
  python execution/abyss_editor_gui.pyw
  ```

---

## 💻 Command-Line Automation

For advanced users and automated rendering pipelines:

```bash
# Index a local audio folder
python execution/music_indexer.py --scan "C:\Path\To\Music" --rescan

# Get BGM recommendations for specific chamber durations (in seconds)
python execution/music_recommender.py --durations 85.0 112.0 96.0 --builds 90.0

# Run automated CapCut assembly from screen recordings
python execution/auto_edit_abyss.py --input-dir "C:\Path\To\Recordings" --transition black_fade --open-capcut
```

---

## 🖥️ System Requirements

| Component | Minimum | Recommended |
|:---|:---|:---|
| **Operating System** | Windows 10 (64-bit) | Windows 10 / 11 (64-bit) |
| **Processor** | Dual-core 2.0 GHz | Quad-core 3.0 GHz or higher |
| **RAM** | 4 GB | 8 GB or more |
| **Display Resolution** | 1366 × 768 | 1920 × 1080 (Full HD) |
| **Video Editor** | CapCut PC (optional, for video auto-assembly) | CapCut PC latest version |

---

## 🛠️ Tech Stack

- **Backend Runtime**: Python 3.11, FastAPI, Uvicorn, Starlette
- **Computer Vision & Media**: OpenCV (`cv2`), Pillow (`PIL`), TinyTag
- **Frontend Architecture**: Vanilla HTML5, High-Performance Canvas API, Glassmorphic CSS3
- **Media Streaming**: RFC 7233 Range Streaming with exponential audio fade curves
- **Packaging**: PyInstaller, Inno Setup Compiler

---

## 👨‍💻 Author & Acknowledgments

**Genshin Abyss Studio** is architected and maintained by **[David (@nzubechukwudavid)](https://github.com/nzubechukwudavid)**.

- 🐛 **Report a Bug / Request a Feature**: [GitHub Issues](https://github.com/nzubechukwudavid/genshin-abyss-studio/issues)
- 🌟 **Star the Project**: If this tool streamlines your workflow, consider giving it a star on GitHub!
- 🤝 **Contributions**: Community pull requests, discussions, and feature suggestions are welcome.

---

## ⚖️ Legal & Community Fair-Use Disclaimer

This software is an independent, non-commercial fan-made project developed in accordance with HoYoverse's Overseas Fan-Made Content Policy.

- **Genshin Impact™**, characters, visual assets, game audio, and trademarks are the intellectual property and copyright of **COGNOSPHERE PTE. LTD. / miHoYo**.
- This suite is provided free of charge for community content creators under the **MIT License**.

---

## 📄 License
Released under the [MIT License](LICENSE) • Copyright © 2026 David.
