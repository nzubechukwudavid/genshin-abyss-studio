# 🌟 Genshin Impact Spiral Abyss Creator Suite

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas%2060fps-E34F26?style=for-the-badge&logo=html5)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![CapCut](https://img.shields.io/badge/CapCut-PC%20Draft%20Engine-000000?style=for-the-badge&logo=capcut)](https://www.capcut.com/)
[![Render](https://img.shields.io/badge/Render-Live%20Deploy-46E3B7?style=for-the-badge&logo=render)](https://genshin-abyss-studio.onrender.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Genshin Impact](https://img.shields.io/badge/Genshin%20Impact-7.0%20Abyss-FFD54F?style=for-the-badge)](https://genshin.hoyoverse.com/)

**The ultimate all-in-one production workstation for Genshin Impact Spiral Abyss content creators: Canva-style 60fps thumbnail design, zero-friction character rosters, 1-click CapCut video auto-editing, and reactive YouTube metadata automation.**

[Live Web Studio](https://genshin-abyss-studio.onrender.com) • [Key Features](#-key-features) • [Video Auto-Editor](#-automated-video-editor-capcut-pc) • [Creator Ergonomics](#-creator-ergonomics--shortcuts) • [Quick Start](#-quick-start) • [Architecture](#-architecture)

</div>

---

## 📸 Overview

Producing high-retention, viral Genshin Impact Spiral Abyss showcases traditionally requires hours of fragmented work across multiple programs: manually cutting out loading screens in video timelines, hunting down official HoYoWiki assets, tweaking Photoshop templates, and hand-calculating YouTube chapter timestamps.

**Genshin Abyss Creator Suite (v4.0.0)** unifies the entire creation pipeline into two seamlessly decoupled yet synergistically integrated tools that can be run together or 100% independently:

1. **🎨 Thumbnail & Metadata Studio**: A Canva-style, zero-latency visual web app (running locally or deployed globally on Render) to frame characters at 60fps, upscale artwork with anime super-resolution, select teammates with clean-slate auto-reset ergonomics, and generate YouTube metadata.
2. **🎬 CapCut PC Video Auto-Editor**: A native 1-click Windows desktop application that ingests your raw mobile or PC screen recordings, automatically cuts out mid-chamber loading screens, applies smooth Black Fade transitions, loops background music, opens the ready-to-export CapCut draft in under 1 second, and pushes exact cut timecodes to the cloud studio.

---

## ✨ Key Features (v4.0.0)

### 🎨 1. Canva-Style Direct Manipulation Canvas
* **Fluid 60fps Rendering**: Direct touch and mouse manipulation—drag to pan, mouse-wheel or multi-touch pinch to zoom, and frame characters in real time.
* **Cinematic Framing Guides**: Toggleable golden eye-level alignment guide (`G`) ensuring characters stay in focal harmony across the 50/50 split.
* **1-Click Transform Controls**: Instant mirror flip (`F`), side swap (`S`), torso framing, and headshot focus presets.
* **Authentic Center Medallion**: Procedural golden scalloped patch rosette (e.g. `7.0`) and optional Floor 12 badge.

### 👥 2. Zero-Friction Teammate & Character Picker Ergonomics
* **Clean-Slate Lifecycle on Every Open**: Clicking any character or teammate slot automatically resets the search field, restores the elemental filter to **"All (130)"**, and instantly focuses the search input so you can type the next teammate immediately without manual clearing.
* **Contextual Modal Header**: Clearly indicates which slot is being configured (e.g. `Select Teammate for Side 1 (Slot 2)`).
* **Inline Quick-Clear & Keyboard Ergonomics**: Includes an inline `✕` clear icon button and smart `Esc` key handling (first press clears query; second press closes modal).

### 🎬 3. Automated Video Editor & CapCut Synthesizer
* **Zero Timeline Slicing**: Automatically analyzes raw recording clips, identifies the mid-chamber intermission loading screen between Side 1 and Side 2, and trims dead time and trailing notification drawer pull-downs.
* **CapCut PC Native Synthesis**: Directly writes binary `draft_content.json` and `draft_meta_info.json` directly into your `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft\` directory without slow video re-encoding.
* **Seamless Transitions & BGM Looping**: Embeds official Black Fade transitions and seamlessly loops background music OST leveled to your chosen volume (default 10%).
* **1-Click Desktop GUI**: Streamlined interface featuring real-time visual gameplay cards, clip reordering, BGM preview button (`▶ Play` / `⏹ Stop`), and zero redundant text inputs.

### ⚡ 4. Decoupled Timecodes & Reactive YouTube Chapter Hub
* **Separation of Concerns**: The video editor acts purely as an audio-visual time engine, exporting raw temporal segment markers (`00:00`, `01:22`, `02:48`, `04:10`...).
* **Real-Time Dynamic Templating**: In the Thumbnail Studio, the YouTube description generator dynamically formats these cut timestamps with whatever characters, custom names, and archetypes are active on your canvas. Tweak an archetype or change a character in the thumbnail, and your YouTube chapters update instantly.
* **Cold-Start Resilient Sync**: Desktop editor pushes timecodes with a 35-second timeout and background daemon thread, easily handling Render free-tier cold boot without UI freezing.
* **Ergonomic Fallbacks**: Includes a `Teams in Chapters` toggle and a 1-click `📋 Paste Timestamps` modal for offline work.

### 🔍 5. Hybrid Intelligent Anime Super-Resolution Engine
* **Intelligent Edge Restoration**: Cleans JPEG macroblock noise with bilateral surface smoothing, thins dark contours via Canny edge detection, sharpens fine anime pupils and metallic details, and restores 8% elemental saturation.
* **1-Click `👑 HD Art` Button**: Instantly selects the character's official 1800p transparent portrait card from HoYoWiki with zero searching.

---

## 🚀 Quick Start

### 1. Launch Desktop Video Auto-Editor
Double-click the desktop shortcut:
```
🎬 Genshin Abyss Auto-Editor.lnk
```
Or run from terminal:
```bash
pythonw execution/abyss_editor_gui.pyw
```
1. Select your 3 chamber clips + 1 builds showcase clip.
2. Select your transition (**Black Fade**) and background music.
3. Click `🚀 1-CLICK AUTO-EDIT & OPEN CAPCUT`.
4. CapCut PC opens instantly with your assembled timeline ready for export!

### 2. Launch Thumbnail & Metadata Studio
```bash
python app.py
```
Open **`http://localhost:7860`** (or access globally via **`https://genshin-abyss-studio.onrender.com`**).
1. Select your Side 1 and Side 2 characters and archetypes.
2. Click **"📝 YouTube Studio"** in the top bar.
3. Click **"⚡ Sync Video Chapters"** to pull exact timestamps from your edit!
4. Click **"📋 Copy Description"** and export your 1080p thumbnail.

---

## ⌨️ Creator Ergonomics & Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| `1` | Select Side 1 (Left) | Activates left character slot for transform & styling |
| `2` | Select Side 2 (Right) | Activates right character slot for transform & styling |
| `S` | Swap Sides | Seamlessly swaps left and right characters and team rosters |
| `F` | Mirror / Flip | Horizontally flips the active character portrait |
| `G` | Toggle Eye Guide | Displays the golden eye-level alignment crosshair |
| `E` | HD Clarity Boost | Triggers bilateral super-resolution upscale |
| `Ctrl + V` | Paste Screenshot | Opens the in-game lineup crop modal |
| `Esc` | Clear / Close | Clears search input or closes active modal |

---

## 🌐 Cloud Deployment (Render.com)

The project includes a production `render.yaml` specification configured for continuous deployment on Render:
* **Repository**: `https://github.com/nzubechukwudavid/genshin-abyss-studio`
* **Live Deployment**: `https://genshin-abyss-studio.onrender.com`
* **Health Check**: `https://genshin-abyss-studio.onrender.com/api/health`

---

## 🏛️ Architecture & Directory Structure

```
genshin-abyss-studio/
├── app.py                         # FastAPI Web Server & API proxy
├── requirements.txt               # Web dependencies (Pillow, FastAPI, Uvicorn, httpx)
├── render.yaml                    # Render auto-deployment configuration
├── web/                           # Canva-Style Web Studio
│   ├── index.html                 # UI Structure & Modals
│   ├── style.css                  # Responsive dark mode CSS design system
│   └── studio.js                  # 60fps client canvas, dynamic timestamps & picker
├── execution/                     # Standalone Python Engines
│   ├── abyss_editor_gui.pyw       # 1-Click Desktop GUI for Video Auto-Editing
│   ├── auto_edit_abyss.py         # Video Cutting Engine & CapCut PC Synthesizer
│   ├── capcut_template_schema.py  # Binary CapCut Draft JSON Generator
│   ├── generate_abyss_thumbnail.py# Server-side 1080p renderer
│   └── install_desktop_shortcut.py# Windows desktop icon installer
├── data/                          # Shared Cached Contracts
│   ├── characters.json            # 130-character canonical HoYoWiki catalog
│   └── cache/
│       ├── latest_abyss_chapters.json # Synced segment timecodes (v2.0)
│       └── thumbnails/                # Fast WebP preview cache
└── directives/                    # Operational SOPs & Versioned Directives
    ├── auto_edit_abyss.md         # Video editor workflow specification
    └── abyss_thumbnail.md         # Thumbnail & metadata workflow specification
```

---

## 📄 License

MIT License. Designed with passion for the Genshin Impact creator community.
