<div align="center">

# 🎬 Genshin Impact Spiral Abyss Studio

**The All-in-One Content Creation Suite for Spiral Abyss Creators**  
*Canva-Style 1080p Thumbnail Designer • 1-Click CapCut PC Timeline Synthesizer • Smart Multi-Track BGM Engine*

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![CapCut PC Ready](https://img.shields.io/badge/CapCut_PC-Native_Drafts-00C4CC.svg?style=flat-square)](https://www.capcut.com)
[![Hardware Accelerated](https://img.shields.io/badge/RFC_7233-206_Streaming-blueviolet.svg?style=flat-square)](#-in-app-hardware-accelerated-audition-player)
[![1080p HD Export](https://img.shields.io/badge/Render-1080p_60fps-FF0055.svg?style=flat-square)](#-canva-style-thumbnail-studio)

<br/>

![Studio Preview](https://raw.githubusercontent.com/nzubechukwudavid/agentic-workflows-template/main/data/output/latest_abyss_thumbnail.png)

</div>

---

## ⚡ Overview

**Genshin Abyss Studio** automates the entire post-production workflow for Genshin Impact Spiral Abyss YouTube creators. Instead of spending hours manually trimming screen recordings, scrubbing audio libraries for tracks that match chamber durations, setting up keyframe fades, and aligning thumbnail layers, this suite completes the entire pipeline in **under 15 seconds**.

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
│   Smart BGM Recommender   │   │  Canva Thumbnail Studio   │
│ - Ultra-fast header scan  │   │ - 130 character roster    │
│ - Zero duplicates across  │   │ - Official HoYoWiki art   │
│   Chambers 1-3 & Builds   │   │ - Direct canvas controls  │
│ - Synchronized in-app     │   │ - Golden eye alignment    │
│   audition player         │   │ - Instant 1080p export    │
└─────────────┬─────────────┘   └─────────────┬─────────────┘
              │                               │
              ▼                               ▼
 ┌───────────────────────────┐   ┌───────────────────────────┐
 │   Native CapCut PC Draft  │   │  YouTube Chapter Timestamps
 │ (Timeline + Audio Fades)  │   │   (Synced to Phone Studio)
 └───────────────────────────┘   └───────────────────────────┘
```

---

## ✨ Key Features

### 🎨 Canva-Style Thumbnail Studio
- **Direct Canvas Manipulation**: Interactive touch & mouse panning, pinch-to-zoom, and free framing directly on the 1080p canvas with live 60fps responsiveness.
- **Complete 130+ Character Roster**: Full official character catalog up to Natlan (*Mavuika, Citlali, Chasca, Kinich, Xilonen, Flins, etc.*) with element filters and official avatars.
- **Official HoYoWiki Artwork Filmstrip**: 20–80+ high-resolution illustrations per unit (*announcements, birthday art, character cards, splash art*) with instant WebP thumbnail caching.
- **Cinematic Framing Tools**:
  - `🔄 Swap Sides`: Swap left and right characters instantly.
  - `👁️ Eye Guide`: Toggle golden alignment line for perfect cinematic framing.
  - `↔️ Flip`: Mirror character orientation.
  - `🎯 Focus Head` & `🧍 Focus Torso`: Instant framing presets.
- **Crisp 1080p PNG Export**: Exports high-resolution 1920x1080 thumbnail without selection borders or guide lines.

---

### 🎬 Automated CapCut PC Video Editor
- **Intelligent Loading Screen Removal**: Proprietary coarse-to-fine color difference scanner trims dead time and mid-chamber loading screens while preserving the entire combat run.
- **7-Cut Assembly**: Automatically stitches First Half, Second Half, and Character Builds into a ready-to-render 16:9 CapCut timeline.
- **Cinematic Transitions**: Seamless 0.5s `black_fade` or `woosh` blur cross-zooms between chambers.
- **Native CapCut PC Draft Generator**: Writes native `draft_content.json` and `draft_meta_info.json` directly into your local CapCut drafts folder.

---

### 🎵 Smart Multi-Track BGM Engine
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

### ⏱️ Automatic YouTube Chapter Generator
- Computes microsecond-accurate timecodes for each chamber and team composition.
- Formats ready-to-paste description blocks for YouTube Studio:
  ```
  00:00 - Chamber 1-1 (Mavuika OVERLOAD)
  01:24 - Chamber 1-2 (Chasca LUNAR HEX)
  02:45 - Chamber 2-1 (Mavuika OVERLOAD)
  04:02 - Chamber 2-2 (Chasca LUNAR HEX)
  05:30 - Character Builds, Weapons & Artifacts
  ```
- Automatically syncs metadata between local desktop and Render cloud web app.

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/nzubechukwudavid/genshin-abyss-studio.git
cd genshin-abyss-studio
pip install -r requirements.txt
```

### 2. Launching the Web Studio
```bash
python app.py
```
Open your browser at **`http://localhost:7860`**.

### 3. Launching the Desktop Arranger GUI (Windows)
```bash
pythonw execution/abyss_editor_gui.pyw
```
*(Optionally run `python execution/install_desktop_shortcut.py` to create a Desktop shortcut icon).*

---

## 💻 Command-Line Automation

### Index Audio Library
```bash
python execution/music_indexer.py --scan "C:\\Users\\David\\Music" --rescan
```

### Generate BGM Suite Recommendations
```bash
python execution/music_recommender.py --durations 85.0 112.0 96.0 --builds 90.0
```

### Run Automated CapCut Assembly
```bash
python execution/auto_edit_abyss.py --input-dir "C:\\Users\\David\\Desktop\\ScreenRecorder" --transition black_fade --open-capcut
```

---

## ☁️ Free Cloud Deployment

### Option 1: Hugging Face Spaces (Docker SDK)
1. Create a new Space at [huggingface.co/new-space](https://huggingface.co/new-space).
2. Choose **Docker** (Blank) SDK.
3. Push this repository:
   ```bash
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/genshin-abyss-studio
   git push space main
   ```
4. Access your online Studio from anywhere (including your phone or tablet)!

### Option 2: Render.com (Web Service)
1. Create a **New Web Service** pointing to your GitHub repository.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, Uvicorn, OpenCV (`cv2`), TinyTag, Pillow (`PIL`), HTTPX
- **Frontend**: Vanilla HTML5/CSS3, Canvas API, Glassmorphic Design System
- **Video / Audio Pipeline**: RFC 7233 Range Streaming, CapCut PC Schema Compiler, Exponential Audio Fades
- **Metadata**: Official HoYoWiki Public REST API with WebP caching

---

## 📄 License
MIT License • Built with ❤️ for Genshin Impact content creators.
