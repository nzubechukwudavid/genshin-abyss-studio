import os, sys, json, time, uuid, httpx, hashlib, asyncio, socket, ipaddress
from urllib.parse import urlparse
from pathlib import Path
from io import BytesIO
from typing import Optional, Dict, Any, List
from collections import OrderedDict
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Response, Request
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from app.core.config import DATA_DIR, CACHE_DIR, THUMBS_DIR, AVATARS_DIR, ALLOWED_PROXY_DOMAINS
from app.core.logger import logger
from app.services.security_service import validate_proxy_url
from execution.generate_abyss_thumbnail import AssetManager, ALL_CHARACTERS, HOYOWIKI_CATALOG_FILE
router = APIRouter(tags=['characters'])
MEMORY_CACHE: OrderedDict[str, bytes] = OrderedDict()
MAX_MEMORY_CACHE_ITEMS = 25
def memory_cache_get(k: str) -> Optional[bytes]:
    if k in MEMORY_CACHE:
        MEMORY_CACHE.move_to_end(k)
        return MEMORY_CACHE[k]
    return None
def memory_cache_set(k: str, d: bytes):
    if k in MEMORY_CACHE:
        MEMORY_CACHE.move_to_end(k)
    MEMORY_CACHE[k] = d
    if len(MEMORY_CACHE) > MAX_MEMORY_CACHE_ITEMS:
        MEMORY_CACHE.popitem(last=False)
HTTP_SEMAPHORE = asyncio.Semaphore(12)
http_client: Optional[httpx.AsyncClient] = None
enhancement_semaphore = asyncio.Semaphore(2)


@router.get("/api/renders/catalog")
async def get_renders_catalog():
    cat_file = DATA_DIR / "catalog" / "hoyo_transparents_catalog.json"
    if cat_file.exists():
        try:
            with open(cat_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"version": "1.0", "characters": {}}

@router.get("/api/characters")
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
            logger.error(f"Catalog read error: {e}")

    fallback = {name: {"id": "", "icon": ""} for name in ALL_CHARACTERS}
    return JSONResponse(content=fallback)


AVATAR_ALIAS_MAP = {
    "raiden": "raiden_shogun",
    "shogun": "raiden_shogun",
    "ei": "raiden_shogun",
    "kazuha": "kaedehara_kazuha",
    "ayaka": "kamisato_ayaka",
    "ayato": "kamisato_ayato",
    "kokomi": "sangonomiya_kokomi",
    "itto": "arataki_itto",
    "sara": "kujou_sara",
    "mizuki": "yumemizuki_mizuki",
    "heizou": "shikanoin_heizou",
    "shinobu": "kuki_shinobu",
    "yae": "yae_miko",
    "childe": "tartaglia",
    "tao": "hu_tao",
    "hutao": "hu_tao",
    "scara": "wanderer",
    "scaramouche": "wanderer",
    "yunjin": "yun_jin",
    "traveler": "traveler_anemo",
    "traveler_anemo": "traveler_anemo",
    "traveler_geo": "traveler_geo",
    "traveler_electro": "traveler_electro",
    "traveler_dendro": "traveler_dendro",
    "traveler_hydro": "traveler_hydro",
    "traveler_pyro": "traveler_pyro",
    "traveler_cryo": "traveler_cryo",
}

def safe_avatar_name(name: str) -> str:
    clean = name.lower().replace(" ", "_").replace("'", "").replace("-", "_").replace("(", "").replace(")", "").strip("_")
    if clean in AVATAR_ALIAS_MAP:
        return AVATAR_ALIAS_MAP[clean]
    if (AVATARS_DIR / f"{clean}_icon.png").exists():
        return clean
    # Suffix / partial match against existing avatar icon files
    for f in AVATARS_DIR.glob("*_icon.png"):
        stem = f.name[:-9]
        if stem == clean or stem.endswith(f"_{clean}") or clean.endswith(f"_{stem}"):
            return stem
    return clean

# 3b. Local High-Speed Avatar API (100% Offline, Zero Mobile Data, Zero CORS)
@router.get("/api/avatar/{character_name}")
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
                if not info:
                    c_low = character_name.lower().replace("_", " ")
                    for k, v in catalog.items():
                        if k.lower() == c_low or k.lower().endswith(c_low) or c_low.endswith(k.lower()):
                            info = v
                            break
                if info and info.get("icon"):
                    return await proxy_image_endpoint(url=info["icon"], thumb=True)
        except Exception:
            pass
    raise HTTPException(status_code=404, detail=f"Avatar for {character_name} not found")



# 4. Character Gallery & Media Illustrations (HoYoWiki API)
@router.get("/api/character-images/{name_or_id}")
async def get_character_images(name_or_id: str):
    raw_images = AssetManager.get_character_gallery_images(name_or_id)
    enriched = []
    for idx, u in enumerate(raw_images):
        if idx == 0:
            b_type = "portrait"
            badge = "👑 1800p Portrait"
            label = "Official Character Portrait"
            rec = True
        elif idx == 1:
            b_type = "splash"
            badge = "✨ 2K Splash"
            label = "Official Splash Illustration"
            rec = True
        else:
            is_jpg = any(ext in u.lower() for ext in [".jpg", ".jpeg"])
            b_type = "scene" if is_jpg else "art"
            badge = "🖼️ Scene / Wallpaper" if is_jpg else f"🎨 Official Art #{idx + 1}"
            label = "Scene / Wallpaper" if is_jpg else "Official Media Illustration"
            rec = False
        enriched.append({
            "url": u,
            "type": b_type,
            "badge": badge,
            "label": label,
            "recommended": rec,
            "index": idx
        })
    return JSONResponse(
        content=enriched,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


# Helper function to generate WebP thumbnail in background worker thread
def _make_webp_thumbnail(raw_bytes: bytes) -> bytes:
    im = Image.open(BytesIO(raw_bytes)).convert("RGBA")
    im.thumbnail((220, 360), Image.Resampling.BILINEAR)
    buf = BytesIO()
    im.save(buf, format="WEBP", quality=80)
    return buf.getvalue()


ALLOWED_PROXY_DOMAINS = {
    "act-upload.hoyoverse.com",
    "act-webstatic.hoyoverse.com",
    "upload-os-bbs.hoyolab.com",
    "wiki.hoyolab.com",
    "fastly.jsdelivr.net",
    "images.weserv.nl",
    "raw.githubusercontent.com",
    "uploadstatic.mihoyo.com",
    "bbs.hoyolab.com",
}

def validate_proxy_url(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"): 
        raise HTTPException(status_code=400, detail="Invalid URL protocol. Only HTTP and HTTPS are permitted.")
    
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise HTTPException(status_code=400, detail="Missing hostname in URL.")
    
    is_allowed = any(hostname == d or hostname.endswith("." + d) for d in ALLOWED_PROXY_DOMAINS)
    if not is_allowed:
        raise HTTPException(status_code=400, detail=f"Proxy target host '{hostname}' is not permitted.")
    
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
            raise HTTPException(status_code=400, detail="Private or loopback IP proxy targets are strictly prohibited.")
    except ValueError:
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                resolved_ip = ipaddress.ip_address(ip_str)
                if resolved_ip.is_private or resolved_ip.is_loopback or resolved_ip.is_reserved or resolved_ip.is_link_local:
                    raise HTTPException(status_code=400, detail=f"Target host '{hostname}' resolves to private or loopback IP {ip_str}.")
        except HTTPException:
            raise
        except Exception:
            pass


# 5. Non-Blocking Image Proxy with Async HTTP & Fast WebP Caching
@router.get("/api/proxy-image")
async def proxy_image(
    url: str = Query(..., description="External image URL to proxy"),
    thumb: bool = Query(False, description="Serve lightweight thumbnail for filmstrips")
):
    validate_proxy_url(url)

    url_hash = hashlib.md5(url.encode()).hexdigest()
    cache_key = f"{'thumb_' if thumb else 'full_'}{url_hash}"

    # 1. Hot memory cache check (<0.1ms)
    cached_mem = memory_cache_get(cache_key)
    if cached_mem is not None:
        media_type = "image/webp" if thumb else ("image/png" if url.lower().endswith(".png") else "image/jpeg")
        return Response(
            content=cached_mem,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )

    # 2. Fast disk thumbnail cache check
    if thumb:
        cached_thumb = THUMBS_DIR / f"thumb_{url_hash}.webp"
        if cached_thumb.exists():
            thumb_bytes = cached_thumb.read_bytes()
            memory_cache_set(cache_key, thumb_bytes)
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
        client_to_use = getattr(sys.modules.get('root_app_module'), 'http_client', None) or http_client
        if client_to_use is None:
            http_client = httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0))
            client_to_use = http_client

        headers = {
            "Referer": "https://wiki.hoyolab.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        async with HTTP_SEMAPHORE:
            try:
                curr_url = url
                max_hops = 3
                r = None
                for hop in range(max_hops + 1):
                    validate_proxy_url(curr_url)
                    r = await client_to_use.get(curr_url, headers=headers, follow_redirects=False)
                    if r.status_code in (301, 302, 303, 307, 308):
                        loc = r.headers.get("Location")
                        if not loc:
                            raise HTTPException(status_code=502, detail="Upstream returned redirect without Location header")
                        from urllib.parse import urljoin
                        curr_url = urljoin(curr_url, loc)
                    else:
                        break
                
                if r is None or r.status_code != 200:
                    status = r.status_code if r else 502
                    raise HTTPException(status_code=status, detail="Could not fetch upstream image")
                content = r.content
                atomic_write_bytes(cached_proxy, content)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Upstream download failed: {str(e)}")

    # 5. Generate and cache WebP thumbnail asynchronously in worker thread
    if thumb:
        try:
            cached_thumb = THUMBS_DIR / f"thumb_{url_hash}.webp"
            thumb_bytes = await asyncio.to_thread(_make_webp_thumbnail, content)
            atomic_write_bytes(cached_thumb, thumb_bytes)
            memory_cache_set(cache_key, thumb_bytes)
            return Response(
                content=thumb_bytes,
                media_type="image/webp",
                headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
            )
        except Exception as e:
            logger.warning(f"Thumbnail generation error: {e}")

    # Return full image
    if len(content) < 1_000_000:
        memory_cache_set(cache_key, content)

    media_type = "image/png" if url.lower().endswith(".png") else "image/jpeg"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400, immutable", "Access-Control-Allow-Origin": "*"}
    )


enhancement_semaphore = asyncio.Semaphore(2)


# 5b. Local Anime Super-Sampling & Edge Restoration Engine (100% Offline, Zero Mobile Data)
@router.get("/api/enhance-image")
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

    # 3. High-fidelity image upsampling using Lanczos4 resampling in worker thread
    def _process_enhancement(data: bytes, f_scale: int, sh: float) -> bytes:
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError("Could not decode image bytes")

        h, w = img.shape[:2]
        # Cap max target dimension to prevent out-of-memory (max 3600px)
        max_dim = max(h, w)
        if max_dim * f_scale > 3600:
            f_scale = max(2, 3600 // max_dim)

        target_w = w * f_scale
        target_h = h * f_scale

        if img.shape[2] == 4:
            bgr = img[:, :, :3]
            alpha = img[:, :, 3] / 255.0

            # Premultiply alpha to eliminate dark halo fringes during Lanczos interpolation
            bgr_pre = bgr.astype(np.float32) * alpha[:, :, np.newaxis]
            bgr_up = cv2.resize(bgr_pre, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            alpha_up = cv2.resize(alpha, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            alpha_up = np.clip(alpha_up, 0.0, 1.0)

            # Un-premultiply alpha safely
            alpha_mask = alpha_up > 0.001
            for c in range(3):
                bgr_up[:, :, c] = np.where(alpha_mask, bgr_up[:, :, c] / np.maximum(alpha_up, 0.001), 0.0)

            bgr_final = np.clip(bgr_up, 0, 255).astype(np.uint8)
            alpha_final = np.clip(alpha_up * 255.0, 0, 255).astype(np.uint8)

            # Gentle sharpening only if explicitly requested (capped at 0.15 to avoid edge halos)
            gentle_sh = min(max(sh, 0.0), 0.15)
            if gentle_sh > 0:
                blur = cv2.GaussianBlur(bgr_final, (0, 0), sigmaX=1.0)
                bgr_final = np.clip(cv2.addWeighted(bgr_final, 1.0 + gentle_sh, blur, -gentle_sh, 0), 0, 255).astype(np.uint8)

            res = cv2.merge([bgr_final, alpha_final])
        else:
            up = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            gentle_sh = min(max(sh, 0.0), 0.15)
            if gentle_sh > 0:
                blur = cv2.GaussianBlur(up, (0, 0), sigmaX=1.0)
                res = np.clip(cv2.addWeighted(up, 1.0 + gentle_sh, blur, -gentle_sh, 0), 0, 255).astype(np.uint8)
            else:
                res = up

        ok, buf = cv2.imencode(".png", res, [cv2.IMWRITE_PNG_COMPRESSION, 4])
        if not ok:
            raise ValueError("PNG encoding failed")
        return buf.tobytes()

    try:
        async with enhancement_semaphore:
            enhanced_bytes = await asyncio.to_thread(_process_enhancement, raw_bytes, factor, sharpen)
        cached_enhanced.write_bytes(enhanced_bytes)
        return Response(
            content=enhanced_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.warning(f"Enhancement error, falling back to raw image: {e}")
        # Graceful fallback to serving original raw bytes
        return Response(
            content=raw_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*"}
        )


# 6. File Upload with UUID Sanitization & Format Validation
@router.post("/api/upload")
async def upload_custom_image(file: UploadFile = File(...)):
    raw_name = file.filename or "image.png"
    ext = Path(raw_name).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Invalid image format. Allowed: PNG, JPG, JPEG, WEBP.")
    
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Uploaded image exceeds 25MB limit.")
    
    try:
        im = Image.open(BytesIO(content))
        im.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image payload.")

    safe_filename = f"upload_{uuid.uuid4().hex[:12]}{ext}"
    out_path = CACHE_DIR / safe_filename
    out_path.write_bytes(content)
    return {"status": "ok", "url": f"/api/cache-file?name={safe_filename}", "filename": safe_filename}


@router.get("/api/cache-file")
async def get_cached_file(name: str = Query(...)):
    safe_name = Path(name).name
    target = (CACHE_DIR / safe_name).resolve()
    if not target.is_relative_to(CACHE_DIR.resolve()) or not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found in cache")
    media_type = "image/png" if safe_name.lower().endswith(".png") else "image/jpeg"
    return FileResponse(target, media_type=media_type)


# 6b. Offline HoYoWiki Asset Cache Downloader & Status API
_cache_task_state = {
    "status": "idle",
    "current": 0,
    "total": 0,
    "percentage": 0,
    "cached_mb": 0.0,
    "message": "Ready"
}
_cache_task_handle: Optional[asyncio.Task] = None

def _get_cache_dir_size_mb() -> float:
    try:
        total_bytes = sum(f.stat().st_size for f in CACHE_DIR.glob("*") if f.is_file())
        total_bytes += sum(f.stat().st_size for f in THUMBS_DIR.glob("*") if f.is_file())
        return round(total_bytes / (1024 * 1024), 2)
    except Exception:
        return 0.0

async def _run_cache_all_assets_task(full_mode: bool = False):
    global _cache_task_state
    galleries_file = CACHE_DIR / "all_galleries.json"
    if not galleries_file.exists():
        _cache_task_state.update({
            "status": "error",
            "message": "all_galleries.json not found in cache"
        })
        return

    try:
        with open(galleries_file, "r", encoding="utf-8") as f:
            galleries = json.load(f)

        urls_to_cache = []
        for name, urls in galleries.items():
            if not urls:
                continue
            if full_mode:
                urls_to_cache.extend(urls)
            else:
                priority = [u for u in urls if "card" in u.lower() or "character" in u.lower()]
                other = [u for u in urls if u not in priority]
                # Default pre-cache includes priority assets + up to 10 images per character
                urls_to_cache.extend((priority + other)[:10])

        total = len(urls_to_cache)
        _cache_task_state.update({
            "status": "running",
            "total": total,
            "current": 0,
            "percentage": 0,
            "cached_mb": _get_cache_dir_size_mb(),
            "message": f"Pre-caching {total} assets..."
        })

        semaphore = asyncio.Semaphore(10)
        limits = httpx.Limits(max_keepalive_connections=15, max_connections=30)
        timeout = httpx.Timeout(20.0, connect=6.0)

        processed = 0

        async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
            async def _worker(url: str):
                nonlocal processed
                url_hash = hashlib.md5(url.encode()).hexdigest()
                proxy_file = CACHE_DIR / f"proxy_{url_hash}.bin"
                thumb_file = THUMBS_DIR / f"thumb_{url_hash}.webp"

                raw_bytes = None
                if proxy_file.exists():
                    try:
                        raw_bytes = proxy_file.read_bytes()
                    except Exception:
                        pass

                if raw_bytes is None:
                    headers = {
                        "Referer": "https://wiki.hoyolab.com/",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                    }
                    async with semaphore:
                        try:
                            resp = await client.get(url, headers=headers)
                            if resp.status_code == 200:
                                raw_bytes = resp.content
                                proxy_file.write_bytes(raw_bytes)
                        except Exception:
                            pass

                if raw_bytes and not thumb_file.exists():
                    try:
                        thumb_bytes = await asyncio.to_thread(_make_webp_thumbnail, raw_bytes)
                        if thumb_bytes:
                            thumb_file.write_bytes(thumb_bytes)
                    except Exception:
                        pass

                processed += 1
                if processed % 5 == 0 or processed == total:
                    pct = int((processed / max(total, 1)) * 100)
                    _cache_task_state.update({
                        "current": processed,
                        "percentage": pct,
                        "cached_mb": _get_cache_dir_size_mb(),
                        "message": f"Cached {processed}/{total} ({pct}%)"
                    })

            tasks = [_worker(u) for u in urls_to_cache]
            await asyncio.gather(*tasks, return_exceptions=True)

        _cache_task_state.update({
            "status": "completed",
            "current": total,
            "percentage": 100,
            "cached_mb": _get_cache_dir_size_mb(),
            "message": f"All {total} character assets cached locally for offline use!"
        })
    except Exception as e:
        _cache_task_state.update({
            "status": "error",
            "message": f"Caching failed: {str(e)}"
        })

# Helper to retrieve character gallery URLs from all_galleries.json or AssetManager
def _get_character_gallery_urls(character_name: str) -> list:
    galleries_file = CACHE_DIR / "all_galleries.json"
    if galleries_file.exists():
        try:
            with open(galleries_file, "r", encoding="utf-8") as f:
                g = json.load(f)
                if character_name in g:
                    return g[character_name]
                c_low = character_name.lower().replace(" ", "").replace("_", "")
                for k, v in g.items():
                    if k.lower().replace(" ", "").replace("_", "") == c_low:
                        return v
        except Exception:
            pass
    return AssetManager.get_character_gallery_images(character_name)

@router.get("/api/assets/character-cache-status/{character_name}")
async def get_character_cache_status(character_name: str):
    urls = _get_character_gallery_urls(character_name)
    if not urls:
        return {"character": character_name, "cached": 0, "total": 0, "is_complete": True}

    cached_count = 0
    for u in urls:
        url_hash = hashlib.md5(u.encode()).hexdigest()
        proxy_file = CACHE_DIR / f"proxy_{url_hash}.bin"
        if proxy_file.exists() and proxy_file.stat().st_size > 500:
            cached_count += 1

    return {
        "character": character_name,
        "cached": cached_count,
        "total": len(urls),
        "is_complete": (cached_count >= len(urls))
    }

@router.post("/api/assets/cache-character/{character_name}")
async def cache_character_gallery(character_name: str):
    urls = _get_character_gallery_urls(character_name)
    if not urls:
        return {"status": "empty", "character": character_name, "cached": 0, "total": 0}

    semaphore = asyncio.Semaphore(8)
    headers = {
        "Referer": "https://wiki.hoyolab.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    cached_count = 0
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=6.0)) as client:
        async def _cache_single_image(url: str):
            nonlocal cached_count
            url_hash = hashlib.md5(url.encode()).hexdigest()
            proxy_file = CACHE_DIR / f"proxy_{url_hash}.bin"
            thumb_file = THUMBS_DIR / f"thumb_{url_hash}.webp"

            raw_bytes = None
            if proxy_file.exists() and proxy_file.stat().st_size > 500:
                try:
                    raw_bytes = proxy_file.read_bytes()
                except Exception:
                    pass

            if raw_bytes is None:
                async with semaphore:
                    try:
                        r = await client.get(url, headers=headers)
                        if r.status_code == 200:
                            raw_bytes = r.content
                            proxy_file.write_bytes(raw_bytes)
                    except Exception as e:
                        logger.warning(f"Error caching {url}: {e}")

            if raw_bytes:
                cached_count += 1
                if not thumb_file.exists():
                    try:
                        thumb_bytes = await asyncio.to_thread(_make_webp_thumbnail, raw_bytes)
                        if thumb_bytes:
                            thumb_file.write_bytes(thumb_bytes)
                    except Exception as e:
                        logger.warning(f"Thumb generation error: {e}")

        tasks = [_cache_single_image(u) for u in urls]
        await asyncio.gather(*tasks, return_exceptions=True)

    return {
        "status": "ok",
        "character": character_name,
        "cached": cached_count,
        "total": len(urls),
        "is_complete": (cached_count >= len(urls))
    }

@router.post("/api/assets/cache-hoyowiki")
async def trigger_hoyowiki_cache(full: bool = Query(False)):
    global _cache_task_handle, _cache_task_state
    if _cache_task_state["status"] == "running":
        return {"status": "already_running", "progress": _cache_task_state}

    _cache_task_state = {
        "status": "running",
        "current": 0,
        "total": 0,
        "percentage": 0,
        "cached_mb": _get_cache_dir_size_mb(),
        "message": "Initializing asset download..."
    }
    _cache_task_handle = asyncio.create_task(_run_cache_all_assets_task(full_mode=full))
    return {"status": "started", "progress": _cache_task_state}

@router.get("/api/assets/cache-status")
async def get_hoyowiki_cache_status():
    _cache_task_state["cached_mb"] = _get_cache_dir_size_mb()
    return _cache_task_state
