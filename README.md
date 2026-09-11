# 🌟 Genshin Impact Spiral Abyss YouTube Thumbnail Studio

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas%2060fps-E34F26?style=for-the-badge&logo=html5)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Genshin Impact](https://img.shields.io/badge/Genshin%20Impact-7.0%20Abyss-FFD54F?style=for-the-badge)](https://genshin.hoyoverse.com/)

**The ultimate Canva-style interactive visual editor and YouTube Studio metadata engine built specifically for Genshin Impact Spiral Abyss creators.**

[Live Demo](https://genshin-abyss-studio.onrender.com) • [Key Features](#-key-features) • [Quick Start](#-quick-start) • [Keyboard Shortcuts](#-creator-ergonomics--shortcuts) • [Architecture](#-architecture)

</div>

---

## 📸 Overview

Creating high-CTR, viral 1080p YouTube thumbnails for Genshin Impact Abyss showcases used to require complex Photoshop setups, manual layer masking, asset downloads, and tedious description formatting.

**Genshin Abyss Studio** solves this with a 100% offline, zero-latency visual web studio that combines Canva-style direct touch/mouse manipulation with the signature aesthetics of top Abyss creators (**Donaturine**, **Gust21**, and **Sireula**).

---

## ✨ Key Features

### 🎨 1. Canva-Style Direct Manipulation Canvas
* **Fluid 60fps Rendering**: Direct touch and mouse manipulation—drag to pan, mouse-wheel or pinch to zoom, and frame characters in real time.
* **Cinematic Framing Guides**: Toggleable golden eye-level alignment line (`G`) ensuring characters stay in focal harmony.
* **1-Click Transform Controls**: Instant mirror flip (`F`), Side swap (`S`), Torso framing, and Headshot focus presets.
* **Sub-Pixel Golden Rosette**: Centered patch medallion (e.g. `7.0`) and optional Floor 12 badge.

### 🔍 2. Offline HD Super-Sampling & Sharpening
* **No Zoom Pixelation**: Integrated offline image upscaler utilizing bicubic super-sampling and unsharp masking.
* **Adaptive Clarity**: Automatically scales zoom levels up to 4.5x while keeping character textures, eyes, and line art razor sharp.

### 👥 3. 130-Character Canonical Roster & HoYoWiki Gallery
* **Complete Database**: 130 fully audited characters (including Mavuika, Chasca, Citlali, Skirk, Columbina, Xilonen, Kinich, and more) with canonical Vision elements and 5★/4★ rarity badges.
* **Official Artwork Filmstrip**: Scoped on-demand loading of official character cards, splash art, birthday illustrations, and special banners.
* **Custom Lineup Screenshot Cropper**: Paste your in-game Floor 12 party setup screenshot directly with `Ctrl+V` and drag a box to crop your exact in-game strip.

### 🏷️ 4. Donaturine Showcase Team Docks & Typography
* **Signature Two-Tone Typography**: High-impact Anton/Montserrat dual-tone text with multi-layer shadow and glow for maximum mobile readability.
* **Custom Accent Color Bar**: Auto-matches character Vision element or allows 1-click selection of Donaturine Warm Gold, Cryo Frost, Electro Violet, Pyro Coral, or custom hex color.
* **Showcase 4-Man Team Docks**: Donaturine-standard 602px wide cards with character avatars, rarity gradients, Vision element badges, and signature `Lv. 90` footer pills.
* **Smart Meta Synergy**: 1-click auto-fill for meta team compositions and archetypes (Overload, Rainbow Hyper, Freeze, Vaporize, Hypercarry, etc.).

### 📝 5. YouTube Studio Title & Description Hub
* **1-Click Title Presets**:
  * **Donaturine**: `7.0 Spiral Abyss!! | C0 Mavuika OVERLOAD & C0 Chasca RAINBOW HYPER | Genshin Impact`
  * **Gust21**: `C0 Mavuika OVERLOAD & C0 Chasca RAINBOW HYPER | Spiral Abyss 7.0 Floor 12 | Genshin Impact`
  * **Sireula**: `C0 Mavuika OVERLOAD and C0 Chasca RAINBOW HYPER | Genshin Impact Abyss 7.0 Floor 12 9 Stars`
  * **Hype 9★**: `C0 MAVUIKA OVERLOAD & C0 CHASCA DESTROY FLOOR 12! | Genshin Impact 7.0 Spiral Abyss 9★`
* **Formatted Description Generator**: Pre-spaced chapter timestamps (`00:00 - Chamber 1-1 ... 05:30 - Builds & Stats`), full 4-man roster lineups for both halves, and dynamic SEO hashtags ready to paste directly into YouTube Studio.

### 🔒 6. 100% Offline & Free
* Operates locally with zero external API dependencies, zero tracking, and zero mobile data consumption.

---

## ⌨️ Creator Ergonomics & Shortcuts

| Hot-key | Action |
| :---: | :--- |
| <kbd>1</kbd> | Select Side 1 (Left Character) |
| <kbd>2</kbd> | Select Side 2 (Right Character) |
| <kbd>S</kbd> | Swap Left and Right Sides |
| <kbd>F</kbd> | Flip / Mirror Active Character |
| <kbd>G</kbd> | Toggle Golden Eye-Level Alignment Guide |
| <kbd>E</kbd> | Trigger HD Super-Sampling Clarity Boost |
| <kbd>Z</kbd> / <kbd>Shift</kbd>+<kbd>Z</kbd> | Zoom In / Zoom Out |
| <kbd>Arrow Keys</kbd> | Precision Nudge Pan (Hold <kbd>Shift</kbd> for 5x speed) |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste in-game screenshot to Party Lineup Cropper |

---

## 🚀 Quick Start

### Prerequisites
* Python 3.10+
* Git

### Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/nzubechukwudavid/genshin-abyss-studio.git
cd genshin-abyss-studio

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch Studio
python app.py
```

Open your browser and navigate to **`http://localhost:7860`**.

---

## ☁️ Cloud Deployment

### Render.com (1-Click Deployment)
The application includes a production-ready `render.yaml` specification for immediate deployment on Render:

1. Push this repository to GitHub.
2. Sign in to **[render.com](https://render.com)** and click **New > Web Service**.
3. Select your `genshin-abyss-studio` repository.
4. Render automatically detects `render.yaml`, configures the Python 3 environment and Uvicorn web server, and publishes your site.
5. Access your live studio from any desktop or mobile browser worldwide! (Official live deployment: **[genshin-abyss-studio.onrender.com](https://genshin-abyss-studio.onrender.com)**)

---

## 🏗️ Architecture

```
genshin-abyss-studio/
├── app.py                      # FastAPI lightweight high-concurrency engine
├── Dockerfile                  # Production container for cloud deployments
├── render.yaml                 # Render.com deployment specification
├── requirements.txt            # Minimal, lightweight Python dependencies
├── data/
│   ├── assets/                 # Custom fonts (Anton, Montserrat) & official badges
│   └── cache/                  # 130-character canonical metadata & gallery caches
├── execution/
│   ├── enrich_character_metadata.py  # Automated Vision/Element verification
│   └── generate_abyss_thumbnail.py   # Headless CLI rendering engine
└── web/
    ├── index.html              # Studio interface markup & modals
    ├── style.css               # Responsive design system & glassmorphism styling
    └── studio.js               # 60fps canvas engine & YouTube metadata generator
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).

*Genshin Impact and HoYoWiki are registered trademarks of Cognosphere Pte., Ltd. / miHoYo. This project is an independent open-source creator tool and is not affiliated with or endorsed by HoYoverse.*
