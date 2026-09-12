import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
STANDALONE = BASE / "genshin-abyss-studio"

def package():
    print(f"Packaging standalone repo into: {STANDALONE}")
    STANDALONE.mkdir(parents=True, exist_ok=True)

    # 1. Web files
    web_dir = STANDALONE / "web"
    web_dir.mkdir(exist_ok=True)
    for f in ["index.html", "style.css", "studio.js"]:
        src = BASE / "web" / f
        if src.exists():
            shutil.copy2(src, web_dir / f)
            print(f"  Copied web/{f}")

    # 2. Execution / Engine
    exec_dir = STANDALONE / "execution"
    exec_dir.mkdir(exist_ok=True)
    for ef in [
        "generate_abyss_thumbnail.py",
        "cache_all_assets.py",
        "auto_edit_abyss.py",
        "abyss_editor_gui.pyw",
        "capcut_template_schema.py",
        "install_desktop_shortcut.py",
        "install_desktop_app_shortcut.py",
        "launch_studio_desktop.pyw",
        "desktop_main.py",
        "build_exe.py",
        "music_indexer.py",
        "music_recommender.py"
    ]:
        src_ef = BASE / "execution" / ef
        if src_ef.exists():
            shutil.copy2(src_ef, exec_dir / ef)
            print(f"  Copied execution/{ef}")

    # 3. Main app.py
    shutil.copy2(BASE / "app.py", STANDALONE / "app.py")
    print("  Copied app.py")

    # 4. Data assets
    assets_dir = STANDALONE / "data" / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    src_assets = BASE / "data" / "assets"
    for item in src_assets.glob("*"):
        if item.is_file():
            shutil.copy2(item, assets_dir / item.name)
            print(f"  Copied asset: {item.name}")
        elif item.is_dir() and item.name == "fonts":
            dst_fonts = assets_dir / "fonts"
            dst_fonts.mkdir(exist_ok=True)
            for font_f in item.glob("*"):
                shutil.copy2(font_f, dst_fonts / font_f.name)
            print("  Copied fonts/")

    # 5. Data cache (essential catalogs)
    cache_dir = STANDALONE / "data" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    (STANDALONE / "data" / "output").mkdir(parents=True, exist_ok=True)
    (cache_dir / "thumbs").mkdir(parents=True, exist_ok=True)

    for cfile in ["all_galleries.json", "hoyowiki_characters.json", "latest_abyss_chapters.json", "music_catalog.json"]:
        src_c = BASE / "data" / "cache" / cfile
        if src_c.exists():
            shutil.copy2(src_c, cache_dir / cfile)
            print(f"  Copied cache/{cfile} ({src_c.stat().st_size / 1024:.1f} KB)")

    # Copy character avatars
    src_chars_dir = BASE / "data" / "cache" / "characters"
    dst_chars_dir = cache_dir / "characters"
    dst_chars_dir.mkdir(parents=True, exist_ok=True)
    if src_chars_dir.exists():
        count = 0
        for icon_file in src_chars_dir.glob("*.png"):
            shutil.copy2(icon_file, dst_chars_dir / icon_file.name)
            count += 1
        print(f"  Copied {count} avatar icons to cache/characters/")

    # 6. Requirements.txt
    reqs_content = """fastapi>=0.110.0
uvicorn[standard]>=0.28.0
httpx>=0.25.0
pillow>=10.0.0
requests>=2.31.0
opencv-python-headless>=4.8.0
python-multipart>=0.0.9
pydantic>=2.0.0
tinytag>=2.0.0
"""
    (STANDALONE / "requirements.txt").write_text(reqs_content, encoding="utf-8")
    print("  Created requirements.txt")

    # 7. Dockerfile (ready for Hugging Face Spaces Docker SDK or Render)
    dockerfile_content = """FROM python:3.11-slim

# Install system dependencies for OpenCV and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \\
    libgl1 \\
    libglib2.0-0 \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set up user for Hugging Face Spaces (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \\
    PATH=/home/user/.local/bin:$PATH \\
    PYTHONUNBUFFERED=1

COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user . .

# Hugging Face Spaces runs on port 7860 by default
EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
"""
    (STANDALONE / "Dockerfile").write_text(dockerfile_content, encoding="utf-8")
    print("  Created Dockerfile")

    # 8. .gitignore
    gitignore_content = """__pycache__/
*.py[cod]
.tmp/
data/output/*
!data/output/.gitkeep
data/cache/characters/
data/cache/thumbs/*
!data/cache/thumbs/.gitkeep
.env
.DS_Store
"""
    (STANDALONE / ".gitignore").write_text(gitignore_content, encoding="utf-8")
    (STANDALONE / "data" / "output" / ".gitkeep").touch()
    (STANDALONE / "data" / "cache" / "thumbs" / ".gitkeep").touch()
    print("  Created .gitignore")

    # 8b. GitHub Workflows
    wf_dir = STANDALONE / ".github" / "workflows"
    wf_dir.mkdir(parents=True, exist_ok=True)
    src_wf = BASE / ".github" / "workflows" / "release.yml"
    if src_wf.exists():
        shutil.copy2(src_wf, wf_dir / "release.yml")
        print("  Copied .github/workflows/release.yml")

    # 9. Standalone README.md
    readme_content = r"""<div align="center">

# 🎬 Genshin Impact Spiral Abyss Studio

**The All-in-One Content Creation Suite for Spiral Abyss Creators**  
*Canva-Style 1080p Thumbnail Designer • 1-Click CapCut PC Timeline Synthesizer • Smart Multi-Track BGM Engine*

[![Download Standalone Windows App](https://img.shields.io/badge/Download-Standalone_Windows_App_(.exe)-00E5FF?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/nzubechukwudavid/genshin-abyss-studio/releases/latest)
<br/>
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![CapCut PC Ready](https://img.shields.io/badge/CapCut_PC-Native_Drafts-00C4CC.svg?style=flat-square)](https://www.capcut.com)
[![Hardware Accelerated](https://img.shields.io/badge/RFC_7233-206_Streaming-blueviolet.svg?style=flat-square)](#-in-app-hardware-accelerated-audition-player)
[![1080p HD Export](https://img.shields.io/badge/Render-1080p_60fps-FF0055.svg?style=flat-square)](#-canva-style-thumbnail-studio)

<br/>

![Studio Interface Preview](data/assets/studio_preview.png)

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

<p align="center">
  <img src="data/assets/thumbnail_example.png" alt="Exported 1080p Thumbnail Sample" width="880" />
</p>

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

### 🌟 Option 1: Standalone Portable Windows App (Zero Installation)
**Recommended for most users.** No Python, terminal, or Git required!
1. Download **[`GenshinAbyssStudio-Windows-x64.zip`](https://github.com/nzubechukwudavid/genshin-abyss-studio/releases/latest)** from the latest GitHub Release.
2. Extract the ZIP anywhere on your PC.
3. Double-click **`GenshinAbyssStudio.exe`** (or `Launch Genshin Abyss Studio.bat`).
4. The studio opens instantly in an isolated, hardware-accelerated desktop window!

### 🐍 Option 2: Run from Source (Python 3.10+)

#### 1. Installation
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
"""
    (STANDALONE / "README.md").write_text(readme_content, encoding="utf-8")
    print("  Created README.md")

    # Also mirror directly to sibling standalone repo (the active Git repository for Render)
    sibling = BASE.parent / "genshin-abyss-studio"
    if sibling.exists() and (sibling / ".git").exists():
        print(f"\nMirroring to active sibling Git repository: {sibling}")
        for item in STANDALONE.glob("*"):
            if item.name == ".git": continue
            dst_item = sibling / item.name
            if item.is_file():
                shutil.copy2(item, dst_item)
            elif item.is_dir():
                shutil.copytree(item, dst_item, dirs_exist_ok=True)
        print("  Successfully mirrored to sibling repository!")

    print("\nStandalone packaging complete!")

if __name__ == "__main__":
    package()
