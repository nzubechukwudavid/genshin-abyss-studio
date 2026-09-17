# Automated Spiral Abyss Video Editor & CapCut Synthesizer
<!-- DOE-VERSION: 2026.09.12 -->

## Goal
Transform 4 raw mobile screen recordings (Chamber 1, Chamber 2, Chamber 3, and optional Builds showcase) into a production-ready, fully assembled **CapCut PC project** with zero manual timeline slicing. Automatically detects mid-chamber loading screens, applies 16:9 center framing, inserts seamless transitions (**Black Fade**, **Woosh**, or **None**), loops background music at custom volume (default 10%), and pushes exact **Pure Temporal Cut Markers** (`00:00`, `01:22`, `02:48`...) directly to the online Render Thumbnail Studio with 35s cold-start resilience so mobile users have real timestamps anywhere in the world.

## Trigger Phrases
- "auto edit abyss run"
- "assemble abyss video"
- "launch abyss editor gui"
- "create capcut abyss project"
- "edit my abyss video"
- "generate abyss chapters"
- "sync abyss video editor"

## Quick Start

### 1. 1-Click Desktop GUI (Recommended)
Double-click the desktop shortcut:
```
🎬 Genshin Abyss Auto-Editor.lnk
```
Or run directly from terminal:
```bash
pythonw execution/abyss_editor_gui.pyw
```
**Features in the GUI:**
- **Zero-Friction Workflow**: No team names to enter! Simply select your 7 clips, pick transitions and music, and generate. Team names are dynamically chosen in the Thumbnail Studio.
- **Visual Gameplay Cards**: Displays real 16:9 in-game thumbnails at ~24s for each chamber (showing the Floor 12 banner and benediction cards) and character builds screen!
- **Run Session Auto-Detection**: Automatically clusters recordings taken within 20–25 minutes of each other and filters out short wipes/retakes (< 35s).
- **Direct Clip Slot Selector**: 1-click slot re-assignment (`[ Chamber 1 ▼ ]`, `[ Chamber 2 ▼ ]`, etc.) and `[ ◀ ]` / `[ ▶ ]` swap buttons.
- **`[ ▶ Check ]` Video Button**: Opens the clip in Windows media player to scrub and verify in 1 click.
- **BGM Audio Preview Button**: 1-click `[ ▶ Play ]` / `[ ⏹ Stop ]` button beside the music dropdown to preview background tracks without opening external windows.
- **Transition Selector**: Choose between **Black Fade** (default), **Woosh**, or **None**.
- **Music Volume**: Interactive slider (5% – 50%, default 10%).
- **Cold-Start Resilient Sync**: Background daemon thread pushes timecodes to cloud with 35s timeout and health probe.
- `[ 🚀 1-CLICK AUTO-EDIT & OPEN CAPCUT ]`: Assembles the project in $<1$s, launches CapCut PC ready to export, and pushes timestamps to the cloud.

### 2. Command-Line Interface (CLI)
```bash
python execution/auto_edit_abyss.py --transition black_fade --volume 0.10 --open-capcut
```
Or specify explicit files:
```bash
python execution/auto_edit_abyss.py --files "C:\path\c1.mp4" "C:\path\c2.mp4" "C:\path\c3.mp4" "C:\path\builds.mp4" --transition black_fade
```

### 3. Integrated Cloud Sync in YouTube Studio
Open **`https://genshin-abyss-studio.onrender.com`** on your phone (or **`http://localhost:7860`** on your laptop):
1. Click **"📝 YouTube Studio"** in the top bar.
2. Click **"⚡ Sync Video Chapters"**.
3. Exact timestamps are merged dynamically with your active thumbnail characters and archetypes!
4. Check or uncheck **"Teams in Chapters"** to toggle between full archetype labels and clean chapter titles.
5. Use **"📋 Paste Timestamps"** for manual fallback if offline.

---

## What It Does

1. **Flexible Clip Input & Reordering**:
   - Accepts direct multi-file selection from any drive or folder, or auto-detects `Desktop\saved screen recording`.
   - Supports 3 chamber files + 1 optional builds file.
2. **Two-Stage Coarse-to-Fine Loading Screen Detection**:
   - Broad scan from `15.0s` to `dur_s - 12.0s` in `2.5s` steps — mathematically guaranteed to hit Genshin loading screens (>= 3.5s wide).
   - Accommodates fast speedrun clears (20s–45s) and standard clears without arbitrary percentage clamping.
   - Detects black transition frames (mean brightness < 4.0 on 60x30 downsample) and tracks global darkest points.
   - Probes boundaries in 0.5s sub-second increments to precisely isolate the cut.
   - Burst animation guard ensures clips < 1.5s are never mistaken for loading screens.
   - Slices the run into 7 clean segments without ever cutting into active combat.
3. **CapCut PC Project Synthesis (Zero Re-encoding)**:
   - Builds `draft_content.json` and `draft_meta_info.json` in CapCut PC drafts folder (`%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft\`).
   - Configures 16:9 canvas (`1920x1080 @ 30fps`).
   - Inserts official **Black Fade** transitions (`effect_id: 9290995`, `resource_id: 6724239388189921806`) or "Woosh" between all cuts.
   - Embeds looping background OST music leveled to custom volume (default 10%).
   - Registers project into CapCut's `root_meta_info.json`.
4. **Cloud Chapter Sync Bridge**:
   - Calculates exact cumulative timestamps.
   - Pushes metadata via HTTPS to `https://genshin-abyss-studio.onrender.com/api/sync-chapters` using secret sync token.
   - Caches locally to `data/cache/latest_abyss_chapters.json`.

---

## Output
- **CapCut PC Project Directory**:
  `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft\Abyss Floor 12 Run (Auto-Edited)\`
- **Desktop Shortcut**:
  `C:\Users\David\Desktop\Genshin Abyss Auto-Editor.lnk`
- **Cloud-Synced YouTube Chapters**:
  Instantly accessible in the Web Studio description generator from phone or laptop.
