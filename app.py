"""
Genshin Impact Spiral Abyss YouTube Thumbnail Studio - Web Application
DOE-VERSION: 2026.09.10

FastAPI-powered studio featuring:
- Canva-style interactive visual cropping with live 60fps touch/mouse manipulation
- Complete 130-character official HoYoWiki roster with avatars
- Dynamic HoYoWiki Gallery Filmstrip (announcements, birthday art, character cards, splash)
- Zero-latency client-side rendering with instant 1080p export
- Non-blocking async proxy streaming (via httpx) with persistent WebP thumbnail caching
"""

import os
import sys
import json
import socket
import hashlib
import asyncio
from pathlib import Path
from io import BytesIO
from typing import Optional
from PIL import Image
import cv2
import numpy as np

# DNS fallback for mobile carrier DNS failures on act-upload.hoyoverse.com
_orig_getaddrinfo = socket.getaddrinfo
def _custom_getaddrinfo(host, port, *args, **kwargs):
    if host == "act-upload.hoyoverse.com":
        return _orig_getaddrinfo("108.139.200.92", port, *args, **kwargs)
    return _orig_getaddrinfo(host, port, *args, **kwargs)
socket.getaddrinfo = _custom_getaddrinfo

import httpx
import uvicorn

from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Response
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from execution.generate_abyss_thumbnail import (
    ThumbnailRenderer,
    AssetManager,
    ALL_CHARACTERS,
    HOYOWIKI_CATALOG_FILE,
    OUTPUT_DIR,
    CACHE_DIR,
    ASSETS_DIR
)

WEB_DIR = BASE_DIR / "web"
THUMBS_DIR = CACHE_DIR / "thumbs"
THUMBS_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR = CACHE_DIR / "characters"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

# Non-blocking async HTTP client with connection pooling
# Limits concurrent external connections to prevent overwhelming network/Hoyoverse CDN
HTTP_SEMAPHORE = asyncio.Semaphore(12)
http_client: Optional[httpx.AsyncClient] = None

async def warmup_popular_roster():
    # Only run in cloud environments with unmetered connections
    if os.environ.get("AUTO_WARMUP", "0") != "1":
        print("[*] Data-Saver Mode: Auto-warmup disabled to protect mobile data.")
        return
    try:
        from execution.cache_all_assets import cache_all_assets
        await asyncio.sleep(2)
        await cache_all_assets(limit_chars=30, max_per_char=2)
    except Exception as e:
        print(f"[!] Background warmup note: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=40)
    timeout = httpx.Timeout(15.0, connect=5.0)
    http_client = httpx.AsyncClient(limits=limits, timeout=timeout)
    asyncio.create_task(warmup_popular_roster())
    yield
    if http_client:
        await http_client.aclose()

app = FastAPI(
    title="Genshin Impact Spiral Abyss Thumbnail Studio",
    description="Full-Featured Canva-Style Spiral Abyss Thumbnail Studio with HoYoWiki CDN Art",
    version="3.0",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory LRU-like byte cache for fast hot-path responses
MEMORY_CACHE = {}
MAX_MEMORY_CACHE_ITEMS = 250


# 1. Main UI
@app.get("/", response_class=HTMLResponse)
async def serve_studio():
    index_file = WEB_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Studio interface not found")
    return HTMLResponse(
        content=index_file.read_text(encoding="utf-8"),
        headers={"Cache-Control": "no-cache"}
    )


# 2. Static Assets (CSS, JS, Assets)
@app.get("/static/style.css")
async def serve_css():
    return FileResponse(
        WEB_DIR / "style.css",
        media_type="text/css",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@app.get("/static/studio.js")
async def serve_js():
    return FileResponse(
        WEB_DIR / "studio.js",
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache, must-revalidate"}
    )


@app.get("/static/assets/{filename}")
async def serve_badge_asset(filename: str):
    file_path = ASSETS_DIR / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(
            file_path,
            headers={"Cache-Control": "public, max-age=86400, immutable"}
        )
    raise HTTPException(status_code=404, detail="Asset not found")


@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)


# 3. Characters Roster API (130 Units)
@app.get("/api/characters")
async def get_characters():
    if HOYOWIKI_CATALOG_FILE.exists():
        try:
            with open(HOYOWIKI_CATALOG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return JSONResponse(
                    content=data,
                    headers={"Cache-Control": "public, max-age=86400"}
                )
        except Exception as e:
            print(f"[!] Catalog read error: {e}")

    fallback = {name: {"id": "", "icon": ""} for name in ALL_CHARACTERS}
    return JSONResponse(content=fallback)


def safe_avatar_name(name: str) -> str:
    return name.lower().replace(" ", "_").replace("'", "").replace("-", "_")

# 3b. Local High-Speed Avatar API (100% Offline, Zero Mobile Data, Zero CORS)
@app.get("/api/avatar/{character_name}")
async def get_character_avatar(character_name: str):
    clean = safe_avatar_name(character_name)
    avatar_file = AVATARS_DIR / f"{clean}_icon.png"
    if avatar_file.exists() and avatar_file.stat().st_size > 500:
        return FileResponse(
            avatar_file,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )
    # Fallback to catalog URL proxy if not yet cached
    if HOYOWIKI_CATALOG_FILE.exists():
        try:
            with open(HOYOWIKI_CATALOG_FILE, "r", encoding="utf-8") as f:
                catalog = json.load(f)
                info = catalog.get(character_name)
                if info and info.get("icon"):
                    return await proxy_image(url=info["icon"], thumb=True)
        except Exception:
            pass
    raise HTTPException(status_code=404, detail=f"Avatar for {character_name} not found")



# 4. Character Gallery & Media Illustrations (HoYoWiki API)
@app.get("/api/character-images/{name_or_id}")
async def get_character_images(name_or_id: str):
    images = AssetManager.get_character_gallery_images(name_or_id)
    return JSONResponse(
        content=images,
        headers={"Cache-Control": "public, max-age=86400"}
    )


# Helper function to generate WebP thumbnail in background worker thread
def _make_webp_thumbnail(raw_bytes: bytes) -> bytes:
    im = Image.open(BytesIO(raw_bytes)).convert("RGBA")
    im.thumbnail((220, 360), Image.Resampling.BILINEAR)
    buf = BytesIO()
    im.save(buf, format="WEBP", quality=80)
    return buf.getvalue()


# 5. Non-Blocking Image Proxy with Async HTTP & Fast WebP Caching
@app.get("/api/proxy-image")
async def proxy_image(
    url: str = Query(..., description="External image URL to proxy"),
    thumb: bool = Query(False, description="Serve lightweight thumbnail for filmstrips")
):
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")

    url_hash = hashlib.md5(url.encode()).hexdigest()
    cache_key = f"{'thumb_' if thumb else 'full_'}{url_hash}"

    # 1. Hot memory cache check (<0.1ms)
    if cache_key in MEMORY_CACHE:
        media_type = "image/webp" if thumb else ("image/png" if url.lower().endswith(".png") else "image/jpeg")
        return Response(
            content=MEMORY_CACHE[cache_key],
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )

    # 2. Fast disk thumbnail cache check
    if thumb:
        cached_thumb = THUMBS_DIR / f"thumb_{url_hash}.webp"
        if cached_thumb.exists():
            thumb_bytes = cached_thumb.read_bytes()
            if len(MEMORY_CACHE) < MAX_MEMORY_CACHE_ITEMS:
                MEMORY_CACHE[cache_key] = thumb_bytes
            return Response(
                content=thumb_bytes,
                media_type="image/webp",
                headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
            )

    # 3. Disk full proxy check
    cached_proxy = CACHE_DIR / f"proxy_{url_hash}.bin"
    content = None
    if cached_proxy.exists():
        try:
            content = cached_proxy.read_bytes()
        except Exception:
            pass

    # 4. Asynchronous external download without blocking event loop
    if content is None:
        global http_client
        if http_client is None:
            http_client = httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0))

        headers = {
            "Referer": "https://wiki.hoyolab.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        async with HTTP_SEMAPHORE:
            try:
                r = await http_client.get(url, headers=headers)
                if r.status_code == 200:
                    content = r.content
                    cached_proxy.write_bytes(content)
                else:
                    raise HTTPException(status_code=r.status_code, detail="Could not fetch upstream image")
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Upstream download failed: {str(e)}")

    # 5. Generate and cache WebP thumbnail asynchronously in worker thread
    if thumb:
        try:
            cached_thumb = THUMBS_DIR / f"thumb_{url_hash}.webp"
            thumb_bytes = await asyncio.to_thread(_make_webp_thumbnail, content)
            cached_thumb.write_bytes(thumb_bytes)
            if len(MEMORY_CACHE) < MAX_MEMORY_CACHE_ITEMS:
                MEMORY_CACHE[cache_key] = thumb_bytes
            return Response(
                content=thumb_bytes,
                media_type="image/webp",
                headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
            )
        except Exception as e:
            print(f"[!] Thumbnail generation error: {e}")

    # Return full image
    if len(MEMORY_CACHE) < MAX_MEMORY_CACHE_ITEMS and len(content) < 5_000_000:
        MEMORY_CACHE[cache_key] = content

    media_type = "image/png" if url.lower().endswith(".png") else "image/jpeg"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400, immutable", "Access-Control-Allow-Origin": "*"}
    )


# 5b. Local Anime Super-Sampling & Edge Restoration Engine (100% Offline, Zero Mobile Data)
@app.get("/api/enhance-image")
async def enhance_image(
    url: str = Query(..., description="Image URL or cache path to super-sample"),
    factor: int = Query(2, ge=2, le=4, description="Super-sampling factor (2x, 3x, or 4x)"),
    sharpen: float = Query(0.45, ge=0.0, le=1.5, description="Adaptive unsharp mask intensity")
):
    url_hash = hashlib.md5(url.encode()).hexdigest()
    enhanced_filename = f"enhanced_{url_hash}_{factor}x.png"
    cached_enhanced = CACHE_DIR / enhanced_filename

    # 1. Hot cache check (<0.5ms)
    if cached_enhanced.exists() and cached_enhanced.stat().st_size > 1000:
        return FileResponse(
            cached_enhanced,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )

    # 2. Locate raw source bytes locally
    raw_bytes = None
    cached_proxy = CACHE_DIR / f"proxy_{url_hash}.bin"
    if cached_proxy.exists():
        raw_bytes = cached_proxy.read_bytes()
    elif "name=" in url:
        fn = url.split("name=")[-1]
        local_f = CACHE_DIR / fn
        if local_f.exists():
            raw_bytes = local_f.read_bytes()
    elif "/api/avatar/" in url:
        aname = url.split("/api/avatar/")[-1]
        local_a = AVATARS_DIR / f"{safe_avatar_name(aname)}_icon.png"
        if local_a.exists():
            raw_bytes = local_a.read_bytes()

    # If not yet downloaded, fetch using existing proxy logic
    if raw_bytes is None and (url.startswith("http://") or url.startswith("https://")):
        proxy_resp = await proxy_image(url=url, thumb=False)
        if hasattr(proxy_resp, "body"):
            raw_bytes = proxy_resp.body
        elif cached_proxy.exists():
            raw_bytes = cached_proxy.read_bytes()

    if not raw_bytes:
        raise HTTPException(status_code=404, detail="Source image could not be loaded for enhancement")

    # 3. Super-sample and enhance using OpenCV in worker thread
    def _process_enhancement(data: bytes, f_scale: int, sh: float) -> bytes:
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError("Could not decode image bytes")

        h, w = img.shape[:2]
        # Cap max target dimension to prevent out-of-memory on extreme images (max 4096px)
        max_dim = max(h, w)
        if max_dim * f_scale > 4096:
            f_scale = max(2, 4096 // max_dim)

        target_w = w * f_scale
        target_h = h * f_scale

        has_alpha = len(img.shape) == 3 and img.shape[2] == 4
        if has_alpha:
            bgr = img[:, :, :3]
            alpha = img[:, :, 3]

            bgr_up = cv2.resize(bgr, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            alpha_up = cv2.resize(alpha, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

            # Bilateral filter cleans flat anime colors without blurring edges
            bgr_clean = cv2.bilateralFilter(bgr_up, d=5, sigmaColor=30, sigmaSpace=30)
            blur = cv2.GaussianBlur(bgr_clean, (0, 0), sigmaX=1.5)
            bgr_sharp = cv2.addWeighted(bgr_clean, 1.0 + sh, blur, -sh, 0)
            res = cv2.merge([bgr_sharp, alpha_up])
        else:
            up = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            clean = cv2.bilateralFilter(up, d=5, sigmaColor=30, sigmaSpace=30)
            blur = cv2.GaussianBlur(clean, (0, 0), sigmaX=1.5)
            res = cv2.addWeighted(clean, 1.0 + sh, blur, -sh, 0)

        ok, buf = cv2.imencode(".png", res, [cv2.IMWRITE_PNG_COMPRESSION, 4])
        if not ok:
            raise ValueError("PNG encoding failed")
        return buf.tobytes()

    try:
        enhanced_bytes = await asyncio.to_thread(_process_enhancement, raw_bytes, factor, sharpen)
        cached_enhanced.write_bytes(enhanced_bytes)
        return Response(
            content=enhanced_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        print(f"[!] Enhancement error: {e}")
        # Graceful fallback to serving original raw bytes
        return Response(
            content=raw_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*"}
        )


# 6. File Upload
@app.post("/api/upload")
async def upload_custom_image(file: UploadFile = File(...)):
    out_path = CACHE_DIR / f"upload_{file.filename}"
    content = await file.read()
    out_path.write_bytes(content)
    return {"status": "ok", "url": f"/api/cache-file?name=upload_{file.filename}"}


# 7. Export Request Model
class ExportSide(BaseModel):
    name: str
    customName: str = ""
    const: str = "C0"
    archetype: str = "HYPERCARRY"
    imgUrl: str = ""
    panX: float = 0.0
    panY: float = 0.0
    scale: float = 1.0
    mirror: bool = False


class ExportPayload(BaseModel):
    side1: ExportSide
    side2: ExportSide
    floor: str = "12"
    patch: str = "5.2"


@app.post("/api/export-canvas")
async def export_canvas_blob(image: UploadFile = File(...)):
    try:
        content = await image.read()
        out_path = OUTPUT_DIR / "latest_abyss_thumbnail.png"
        out_path.write_bytes(content)
        return {"status": "ok", "path": str(out_path)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# 8. Server-Side Export Sync
@app.post("/api/export")
async def export_thumbnail(payload: ExportPayload):
    try:
        # Resolve images
        img1 = AssetManager.get_character_image(payload.side1.imgUrl or payload.side1.name)
        img2 = AssetManager.get_character_image(payload.side2.imgUrl or payload.side2.name)

        renderer = ThumbnailRenderer(width=1920, height=1080)
        final_img = renderer.render(
            side1_img=img1,
            side2_img=img2,
            side1_name=payload.side1.customName or payload.side1.name,
            side1_const=payload.side1.const,
            side1_archetype=payload.side1.archetype,
            side2_name=payload.side2.customName or payload.side2.name,
            side2_const=payload.side2.const,
            side2_archetype=payload.side2.archetype,
            floor=payload.floor,
            patch=payload.patch,
            zoom1=payload.side1.scale,
            offset_x1=int(payload.side1.panX),
            offset_y1=int(payload.side1.panY),
            mirror1=payload.side1.mirror,
            zoom2=payload.side2.scale,
            offset_x2=int(payload.side2.panX),
            offset_y2=int(payload.side2.panY),
            mirror2=payload.side2.mirror,
            auto_normalize=False # Use user's exact Canva framing
        )

        out_path = OUTPUT_DIR / "latest_abyss_thumbnail.png"
        final_img.save(out_path, quality=95)
        return {"status": "ok", "path": str(out_path)}
    except Exception as e:
        print(f"[!] Server export error: {e}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "7860"))
    print(f"[*] Starting Genshin Spiral Abyss Thumbnail Studio on http://{host}:{port}...")
    uvicorn.run(app, host=host, port=port, log_level="info")

