# Genshin Impact Spiral Abyss YouTube Thumbnail Studio

A high-performance Canva-style interactive web application for generating professional, viral Genshin Impact Spiral Abyss YouTube thumbnails in 1080p.

![Studio Preview](https://raw.githubusercontent.com/nzubechukwudavid/agentic-workflows-template/main/data/output/latest_abyss_thumbnail.png)

## Features
- **Canva-Style Visual Editing**: Touch and mouse direct manipulation — pan, pinch-to-zoom, and frame characters directly on canvas with live 60fps responsiveness.
- **Complete 130 Playable Roster**: Full character catalog including Natlan characters (Mavuika, Citlali, Chasca, Kinich, Xilonen, Flins, etc.) with official avatars and element filters.
- **Official HoYoWiki Artwork Filmstrip**: 20–80+ high-resolution illustrations per unit (official announcements, birthday art, character cards, splash art) with instant WebP thumbnail previews.
- **One-Click Tools**:
  - `🔄 Swap Sides`: Swap left and right characters instantly.
  - `👁️ Eye Guide`: Toggle golden alignment line for perfect cinematic framing.
  - `↔️ Flip`: Mirror character direction.
  - `🎯 Focus Head` & `🧍 Focus Torso`: Instant presets.
- **Clean 1080p PNG Export**: Exports high-resolution 1920x1080 thumbnail without selection borders or guide lines.

---

## Free Cloud Hosting (100% Free)

### Option 1: Hugging Face Spaces (Recommended - Easiest & Most Generous)
Hugging Face Spaces provides **free hosting with 2 vCPUs and 16 GB of RAM**, custom domain support, and zero sleep timeouts on public spaces.

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2. Set **Space name**: `genshin-abyss-studio`.
3. Select **Space SDK**: **Docker** (Blank).
4. Set visibility to **Public**.
5. Push this repository to the Hugging Face Space Git URL:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Genshin Abyss Studio"
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/genshin-abyss-studio
   git push space main
   ```
6. Hugging Face will automatically build the `Dockerfile` and launch the app at `https://YOUR_USERNAME-genshin-abyss-studio.hf.space`!

### Option 2: Render.com (Free Tier)
1. Push this repository to your GitHub account.
2. Sign in to [render.com](https://render.com) and click **New > Web Service**.
3. Connect your GitHub repository.
4. Set:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**.

---

## Local Development

```bash
# 1. Clone repository
git clone <your-repo-url>
cd genshin-abyss-studio

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start local server
python app.py
```
Open your browser at `http://localhost:7860`.
