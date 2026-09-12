# Spiral Abyss YouTube Thumbnail Workflow
<!-- DOE-VERSION: 2026.09.12 -->

## Goal
Generate high-impact, professional 1920x1080 (16:9) YouTube thumbnails and video metadata for Genshin Impact Spiral Abyss gameplay in the signature creator style (**Donaturine**, **Gust21**, and **Sireula**). Features **Canva-style touch/mouse direct manipulation**, an interactive **HoYoWiki Official Gallery Filmstrip** with **Smart Quality Badges**, a **1-Click 👑 HD Art** shortcut, an **Anime Edge-Refinement Super-Resolution Engine**, zero-friction **Teammate Picker Auto-Reset**, and an integrated **Reactive YouTube Studio Title/Description Hub** with live video chapter sync.

## Trigger Phrases
- "generate abyss thumbnail"
- "create spiral abyss thumbnail"
- "make abyss thumbnail for my latest clear"
- "launch abyss thumbnail studio"
- "start canva thumbnail editor"

## Quick Start

### 1. Interactive Visual Web Studio (Recommended)
```bash
python app.py
```
Open **`http://localhost:7860`** (or deployed live at **`https://genshin-abyss-studio.onrender.com`**).

- **Direct Touch / Mouse Manipulation**:
  - Pan by dragging with finger or mouse.
  - Zoom smoothly at 60fps via mouse wheel or multi-touch pinch.
  - Hotkeys: `1`, `2` to switch slots, `S` to swap sides, `F` to flip/mirror, `G` for eye-level guide, `E` for HD Boost.
- **Zero-Friction Teammate & Character Picker Ergonomics**:
  - Clean slate on every open: automatically clears previous search query, resets element filters to **"All (130)"**, and immediately focuses the search box for instant typing.
  - Contextual modal title: informs you exactly which slot you're configuring (e.g. `Select Teammate for Side 1 (Slot 2)`).
  - Quick inline `✕` clear button & `Esc` keyboard shortcut.
- **Smart Asset Curation & Badges**:
  - Color-coded quality tags: `👑 1800p Portrait` (official character cards), `✨ 2K Splash` (wish splash art), `🖼️ Scene / Wallpaper` (event banners), and `🎨 Official Art`.
  - **1-Click `👑 HD Art` Button**: Instantly loads the official 1800p HD transparent portrait card into the active slot.
- **Hybrid Intelligent Anime Super-Resolution**:
  - Bilateral noise smoothing + Canny edge-guided contour thinning + high-frequency unsharp mask + 8% vibrance restoration.
  - Zero zoom pixelation even when magnifying crops up to 4.5x.
- **4-Character Team Roster Dock**:
  - Renders 4 avatar cards along each side with 5★ Gold / 4★ Purple gradients, element vision indicators, and CARRY badge.
  - 1-click `⚡ Meta Team` synergy auto-fill for all 130 characters.
  - Optional `Ctrl+V` in-game lineup screenshot marquee cropper.
- **Reactive YouTube Studio Metadata Generator**:
  - 1-click title presets (Donaturine, Gust21, Sireula, Hype 9★).
  - Dynamically merges pure video cut timestamps (`00:00`, `01:22`...) with active thumbnail characters and archetypes in real-time.
  - "Teams in Chapters" toggle and "📋 Paste Timestamps" fallback for offline use.

### 2. Cloud Deployment (Render.com)
The studio is packaged in `genshin-abyss-studio/` with a production `render.yaml` specification for 1-click deployment on Render:
- Repository: `https://github.com/nzubechukwudavid/genshin-abyss-studio`
- Live URL: `https://genshin-abyss-studio.onrender.com`

### 3. Command-Line (CLI)
```bash
# Basic generation with presets
python execution/generate_abyss_thumbnail.py --side1 Clorinde --side1-archetype "OVERVAPE" --side2 "Hu Tao" --side2-archetype "VAPORIZE" --patch "7.0"

# Specify custom image files or direct URLs
python execution/generate_abyss_thumbnail.py --side1 path/to/art1.png --side1-archetype "HYPERCARRY" --side2 path/to/art2.png --side2-archetype "SPREAD"
```

## Output
- High-resolution PNG thumbnail saved to:
  `data/output/latest_abyss_thumbnail.png`
- Client-side download directly to desktop/mobile Photos.
