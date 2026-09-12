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
        "capcut_template_schema.py"
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

    for cfile in ["all_galleries.json", "hoyowiki_characters.json"]:
        src_c = BASE / "data" / "cache" / cfile
        if src_c.exists():
            shutil.copy2(src_c, cache_dir / cfile)
            print(f"  Copied cache/{cfile} ({src_c.stat().st_size / 1024:.1f} KB)")

    # 6. Requirements.txt
    reqs_content = """fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pillow>=10.0.0
requests>=2.31.0
opencv-python-headless>=4.8.0
python-multipart>=0.0.9
pydantic>=2.0.0
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

    # 9. Standalone README.md
    readme_content = """# Genshin Impact Spiral Abyss YouTube Thumbnail Studio

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
                if dst_item.exists():
                    shutil.rmtree(dst_item)
                shutil.copytree(item, dst_item)
        print("  Successfully mirrored to sibling repository!")

    print("\nStandalone packaging complete!")

if __name__ == "__main__":
    package()
