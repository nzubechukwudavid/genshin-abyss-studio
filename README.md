# 🌟 Genshin Impact Spiral Abyss YouTube Thumbnail Studio

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas%2060fps-E34F26?style=for-the-badge&logo=html5)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Render](https://img.shields.io/badge/Render-Live%20Deploy-46E3B7?style=for-the-badge&logo=render)](https://genshin-abyss-studio.onrender.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Genshin Impact](https://img.shields.io/badge/Genshin%20Impact-7.0%20Abyss-FFD54F?style=for-the-badge)](https://genshin.hoyoverse.com/)

**The ultimate Canva-style interactive visual editor and YouTube Studio metadata automation engine built specifically for Genshin Impact Spiral Abyss creators.**

[Live Web Studio](https://genshin-abyss-studio.onrender.com) • [Key Features](#-key-features) • [Hotkeys & Ergonomics](#-creator-ergonomics--shortcuts) • [Quick Start](#-quick-start) • [Cloud Deployment](#-cloud-deployment-rendercom) • [Architecture](#-architecture)

</div>

---

## 📸 Overview

Creating high-CTR, viral 1080p YouTube thumbnails for Genshin Impact Abyss showcases traditionally requires complicated Photoshop templates, manual layer masking, asset hunting, and tedious description formatting.

**Genshin Abyss Studio (v3.7.0)** delivers a zero-latency, mobile-responsive visual web application that combines Canva-style direct manipulation with the signature aesthetics of top Abyss creators (**Donaturine**, **Gust21**, and **Sireula**).

Whether running locally on desktop or on mobile browsers (iOS Safari & Android Chrome), creators can design, frame, super-sample, and export publication-ready thumbnails in under 30 seconds—complete with automated YouTube titles and chapter descriptions.

---

## ✨ Key Features (v3.7.0)

### 🎨 1. Canva-Style Direct Manipulation Canvas
* **Fluid 60fps Rendering**: Direct touch and mouse manipulation—drag to pan, mouse-wheel or multi-touch pinch to zoom, and frame characters in real time.
* **Cinematic Framing Guides**: Toggleable golden eye-level alignment guide (`G`) ensuring characters stay in focal harmony across the 50/50 split.
* **1-Click Transform Controls**: Instant mirror flip (`F`), side swap (`S`), torso framing, and headshot focus presets.
* **Authentic Center Medallion**: Procedural golden scalloped patch rosette (e.g. `7.0`) and optional Floor 12 badge.

### 🔍 2. Hybrid Intelligent Anime Super-Resolution Engine
* **No Zoom Pixelation**: Solves the classic blurriness of zoomed-in crops using an intelligent OpenCV anime restoration pipeline:
  * **Bilateral Surface Smoothing**: Cleans JPEG macroblock noise and compression dithering without blurring delicate line art.
  * **Canny Edge Contour Thinning**: Extracts anime boundary contours and reinforces dark outline definitions for a crisp vector finish.
  * **Adaptive High-Frequency Unsharp Mask**: Sharpening tailored to anime pupils, hair strands, and metallic accessories.
  * **Vibrance Restoration**: Subtle 8% HSV saturation adjustment to make Genshin elemental colors pop.
  * **Alpha Channel Preservation**: Full 4-channel RGBA support for transparent portrait cards.
* **High-Speed Caching**: Instant sub-millisecond loads for previously enhanced assets.

### 👑 3. Smart Asset Curation & Visual Quality Badges
* **Color-Coded Quality Badges**:
  * `👑 1800p Portrait` (Gold badge): Dedicated official transparent character cards (`750×1800` / `1080×2160`).
  * `✨ 2K Splash` (Cyan badge): Full official wish splash art (`1280×1280` / `2048×2048`).
  * `🖼️ Scene / Wallpaper` (Slate badge): Wide event banners and scene wallpapers.
  * `🎨 Official Art` (Neutral badge): Character media and birthday illustrations.
* **1-Click `👑 HD Art` Shortcut Button**: Added directly in the character header next to *Switch Unit*. Clicking this instantly selects the character's official 1800p portrait card with zero manual searching.
* **Scoped On-Demand Filmstrip**: Ultra-lightweight WebP thumbnail caching with intersection-observer loading for smooth mobile scrolling.

### 📱 4. Full Mobile UI/UX Responsiveness
* **Universal Browser Support**: Tested and optimized for iOS Safari, iPadOS, Android Chrome, and all desktop browsers.
* **Touch-First Vertical Layout Stack**:
  * Sticky canvas viewport with touch gestures (drag to pan, pinch to zoom).
  * Horizontally scrollable quick-action toolbar.
  * Segmented constellation pills (`C0`–`C6`), element filters, and collapsible drawers.
  * Zero viewport jump or virtual keyboard layout breakage.

### 👥 5. 130-Character Canonical Roster & Custom Lineup Cropper
* **Complete Canonical Database**: All 130 playable units (including Mavuika, Chasca, Citlali, Skirk, Columbina, Xilonen, Kinich, and more) with canonical Vision elements and 5★/4★ rarity badges.
* **Donaturine Showcase 4-Man Team Docks**: Donaturine-standard cards with character avatars, rarity gradients, Vision element badges, and signature `Lv. 90` footer pills.
* **Smart Meta Synergy**: 1-click auto-fill for meta team compositions and archetypes (Overload, Rainbow Hyper, Freeze, Vaporize, Hypercarry, etc.).
* **Custom Lineup Screenshot Cropper**: Paste your in-game Floor 12 party setup screenshot directly with `Ctrl+V` and drag a box to crop your exact in-game strip.

### 📝 6. YouTube Studio Title & Description Hub
* **1-Click Title Presets**:
  * **Donaturine**: `7.0 Spiral Abyss!! | C0 Mavuika OVERLOAD & C0 Chasca RAINBOW HYPER | Genshin Impact`
  * **Gust21**: `C0 Mavuika OVERLOAD & C0 Chasca RAINBOW HYPER | Spiral Abyss 7.0 Floor 12 | Genshin Impact`
  * **Sireula**: `C0 Mavuika OVERLOAD and C0 Chasca RAINBOW HYPER | Genshin Impact Abyss 7.0 Floor 12 9 Stars`
  * **Hype 9★**: `C0 MAVUIKA OVERLOAD & C0 CHASCA DESTROY FLOOR 12! | Genshin Impact 7.0 Spiral Abyss 9★`
* **Formatted Description Generator**: Pre-spaced chapter timestamps (`00:00 - Chamber 1-1 ... 05:30 - Builds & Stats`), full 4-man roster lineups for both halves, and dynamic SEO hashtags ready to paste directly into YouTube Studio.

### 🔒 7. 100% Offline Capable & Data-Saver Mode
* Operates locally with zero external API dependencies, zero tracking, and zero mobile data consumption once cached.

---

## ⌨️ Creator Ergonomics & Shortcuts

| Hot-key | Action |
| :---: | :--- |
| <kbd>1</kbd> | Select Side 1 (Left Character) |
| <kbd>2</kbd> | Select Side 2 (Right Character) |
| <kbd>S</kbd> | Swap Left and Right Sides |
| <kbd>F</kbd> | Flip / Mirror Active Character |
| <kbd>G</kbd> | Toggle Golden Eye-Level Alignment Guide |
| <kbd>E</kbd> | Trigger HD Anime Super-Resolution Boost |
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

## ☁️ Cloud Deployment (Render.com)

The application includes a production-ready `render.yaml` specification for immediate deployment on Render:

1. Push this repository to your GitHub account.
2. Sign in to **[render.com](https://render.com)** and click **New > Web Service**.
3. Connect your `genshin-abyss-studio` repository.
4. Render automatically detects `render.yaml`, builds the lightweight Python environment, and deploys the service.
5. Access your live studio from any device worldwide: **[https://genshin-abyss-studio.onrender.com](https://genshin-abyss-studio.onrender.com)**.

---

## 🏗️ Architecture

```
genshin-abyss-studio/
├── app.py                      # FastAPI backend: Async image proxy, gallery API, anime enhancement
├── Dockerfile                  # Production container for cloud deployments
├── render.yaml                 # Render.com deployment blueprint
├── requirements.txt            # Minimal, lightweight Python dependencies (fastapi, uvicorn, opencv, pillow, httpx)
├── README.md                   # Complete studio documentation & guide
├── data/
│   ├── assets/                 # Custom fonts (Anton, Montserrat) & official badges
│   └── cache/                  # 130-character canonical metadata & gallery caches
├── execution/
│   ├── enrich_character_metadata.py  # Automated Vision/Element verification
│   └── generate_abyss_thumbnail.py   # Headless CLI rendering engine
└── web/
    ├── index.html              # Responsive studio interface & modal pickers
    ├── style.css               # Design system, glassmorphism, & mobile media queries
    └── studio.js               # 60fps canvas engine, touch interaction, & YouTube generator
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

*Genshin Impact and HoYoWiki are registered trademarks of Cognosphere Pte., Ltd. / miHoYo. This project is an independent open-source creator tool and is not affiliated with or endorsed by HoYoverse.*
