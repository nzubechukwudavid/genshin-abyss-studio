"""
Genshin Impact Spiral Abyss YouTube Thumbnail Generator
DOE-VERSION: 2026.09.10

Generates high-impact 50/50 split-screen YouTube thumbnails matching top Genshin creators:
- Automatic anime face/head detection and size normalization
- HoYoWiki / official art support with portrait framing
- Authentic Spiral Abyss Floor 12 emblem
- Golden scalloped patch rosette medallion (e.g., 5.2, 5.4)
- High-contrast YouTube headline typography with dark bottom vignette
"""

import os
import sys
import re
import math
import argparse
import asyncio
import urllib.request
from pathlib import Path
from dotenv import load_dotenv
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import cv2
import numpy as np

load_dotenv()

# Configure utf-8 stdout for Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"
CHAR_CACHE_DIR = CACHE_DIR / "characters"
ASSETS_DIR = DATA_DIR / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"
OUTPUT_DIR = DATA_DIR / "output"

CHAR_CACHE_DIR.mkdir(parents=True, exist_ok=True)
FONTS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CASCADE_URL = "https://raw.githubusercontent.com/nagadomi/lbpcascade_animeface/master/lbpcascade_animeface.xml"
CASCADE_FILE = CACHE_DIR / "lbpcascade_animeface.xml"

ANTON_FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf"
ANTON_FONT_FILE = FONTS_DIR / "Anton-Regular.ttf"

HOYOWIKI_CATALOG_FILE = CACHE_DIR / "hoyowiki_characters.json"

def _load_all_characters():
    if HOYOWIKI_CATALOG_FILE.exists():
        try:
            import json
            with open(HOYOWIKI_CATALOG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data and len(data) > 80:
                    return sorted(list(data.keys()))
        except Exception:
            pass
    return sorted([
        "Aino", "Albedo", "Alhaitham", "Aloy", "Alyosha", "Amber", "Arataki Itto", "Arlecchino", "Baizhu", "Barbara",
        "Beidou", "Bennett", "Candace", "Charlotte", "Chasca", "Chevreuse", "Chiori", "Chongyun",
        "Citlali", "Clorinde", "Collei", "Cyno", "Dehya", "Diluc", "Diona", "Dori", "Emilie",
        "Eula", "Faruzan", "Fischl", "Freminet", "Furina", "Gaming", "Ganyu", "Gorou", "Hu Tao",
        "Iansan", "Jean", "Kachina", "Kaedehara Kazuha", "Kaeya", "Kamisato Ayaka", "Kamisato Ayato",
        "Kaveh", "Keqing", "Kinich", "Kirara", "Klee", "Kujou Sara", "Kuki Shinobu", "Layla",
        "Lisa", "Lynette", "Lyney", "Mavuika", "Mika", "Mona", "Mualani", "Nahida", "Navia",
        "Neuvillette", "Nilou", "Ningguang", "Noelle", "Odette", "Ororon", "Qiqi", "Raiden Shogun", "Razor",
        "Rosaria", "Sangonomiya Kokomi", "Sayu", "Sethos", "Shenhe", "Shikanoin Heizou", "Sigewinne",
        "Sucrose", "Tartaglia", "Thoma", "Tighnari", "Traveler (Anemo)", "Traveler (Geo)", "Traveler (Electro)",
        "Traveler (Dendro)", "Traveler (Hydro)", "Traveler (Pyro)", "Venti", "Vesna", "Vodyanitsa",
        "Wanderer", "Wriothesley", "Xiangling", "Xianyun", "Xiao", "Xilonen", "Xingqiu", "Xinyan",
        "Yae Miko", "Yanfei", "Yaoyao", "Yelan", "Yoimiya", "Yumemizuki Mizuki", "Yun Jin", "Zhongli"
    ])

ALL_CHARACTERS = _load_all_characters()
POPULAR_CHARACTERS = ALL_CHARACTERS

COMMON_ARCHETYPES = [
    "OVERVAPE", "DOUBLE PYRO", "HYPERCARRY", "QUICKBLOOM", "SPREAD",
    "AGGRAVATE", "VAPORIZE", "MELT", "FREEZE", "NATIONAL",
    "BURGEON", "BLOOM", "MONO PYRO", "MONO HYDRO", "TASaser",
    "ELECTRO CHARGED", "SWIRL HYPER", "PLUNGE", "PHYSICAL"
]

CHARACTER_ALIASES = {
    "raiden": "raiden",
    "raiden shogun": "raiden",
    "shogun": "raiden",
    "ei": "raiden",
    "childe": "tartaglia",
    "tartaglia": "tartaglia",
    "kazuha": "kazuha",
    "kaedehara kazuha": "kazuha",
    "ayaka": "ayaka",
    "kamisato ayaka": "ayaka",
    "ayato": "ayato",
    "kamisato ayato": "ayato",
    "itto": "arataki-itto",
    "kokomi": "sangonomiya-kokomi",
    "tao": "hu-tao",
    "hutao": "hu-tao",
    "scara": "wanderer",
    "scaramouche": "wanderer",
}

def normalize_slug(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9\s-]", "", name.strip().lower())
    slug = re.sub(r"[\s_]+", "-", clean)
    return CHARACTER_ALIASES.get(slug, slug)


def ensure_dependencies():
    """Ensures face cascade and font files exist locally."""
    if not CASCADE_FILE.exists():
        try:
            print("[*] Downloading anime face cascade...")
            urllib.request.urlretrieve(CASCADE_URL, CASCADE_FILE)
        except Exception as e:
            print(f"[!] Could not download cascade: {e}")

    if not ANTON_FONT_FILE.exists():
        try:
            print("[*] Downloading Anton font...")
            urllib.request.urlretrieve(ANTON_FONT_URL, ANTON_FONT_FILE)
        except Exception as e:
            print(f"[!] Could not download font: {e}")


ensure_dependencies()


class HeadNormalizer:
    """Detects anime heads/faces and normalizes their size and framing."""

    def __init__(self):
        if CASCADE_FILE.exists():
            self.cascade = cv2.CascadeClassifier(str(CASCADE_FILE))
        else:
            self.cascade = None

    def detect_head(self, img_pil: Image.Image) -> tuple:
        """
        Detects anime face bounding box (x, y, w, h) on uncropped image.
        Uses multi-angle search for robust detection on tilted heads.
        """
        if self.cascade is None:
            return None

        rgb = np.array(img_pil.convert("RGB"))
        h_orig, w_orig = rgb.shape[:2]

        # Multi-angle search (-15, 0, 15 degrees)
        for angle in [0, 12, -12]:
            if angle != 0:
                M = cv2.getRotationMatrix2D((w_orig / 2, h_orig / 2), angle, 1.0)
                rotated = cv2.warpAffine(rgb, M, (w_orig, h_orig))
            else:
                rotated = rgb

            gray = cv2.equalizeHist(cv2.cvtColor(rotated, cv2.COLOR_RGB2GRAY))
            faces = self.cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=2,
                minSize=(int(min(w_orig, h_orig) * 0.08), int(min(w_orig, h_orig) * 0.08))
            )

            if len(faces) > 0:
                # Filter candidates: head must be in the upper 75% of image
                valid = [f for f in faces if f[1] < h_orig * 0.75 and f[3] >= 35]
                if valid:
                    best = max(valid, key=lambda f: f[2] * f[3])
                    if angle != 0:
                        # Transform center back
                        fx, fy, fw, fh = best
                        cx, cy = fx + fw / 2, fy + fh / 2
                        M_inv = cv2.getRotationMatrix2D((w_orig / 2, h_orig / 2), -angle, 1.0)
                        orig_pt = M_inv @ np.array([cx, cy, 1.0])
                        return (int(orig_pt[0] - fw / 2), int(orig_pt[1] - fh / 2), fw, fh)
                    return (int(best[0]), int(best[1]), int(best[2]), int(best[3]))

        return None

    def frame_character_half(
        self,
        img_pil: Image.Image,
        frame_w: int,
        frame_h: int,
        target_head_ratio: float = 0.31,
        target_eye_y: float = 0.28,
        zoom: float = 1.0,
        offset_x: int = 0,
        offset_y: int = 0,
        mirror: bool = False,
        auto_normalize: bool = True
    ) -> Image.Image:
        """
        Scales and crops character image to fill half-frame (frame_w, frame_h)
        with normalized head size, eye-level alignment, and GUARANTEED edge-to-edge coverage (no black gaps).
        """
        img = img_pil.copy()
        
        # Detect face on original orientation
        face = self.detect_head(img) if auto_normalize else None

        if mirror:
            img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if face is not None:
                fx, fy, fw, fh = face
                face = (img.width - (fx + fw), fy, fw, fh)

        # 1. Calculate minimum scale required to cover the half-frame without any black gaps
        cover_scale = max(frame_w / img.width, frame_h / img.height)

        # 2. Determine scaling with head normalization
        if face is not None:
            fx, fy, fw, fh = face
            face_cx = fx + fw / 2
            face_cy = fy + fh / 2
            target_head_h = frame_h * target_head_ratio
            head_scale = (target_head_h / fh) * zoom
            scale = max(cover_scale, head_scale)
        else:
            scale = cover_scale * 1.25 * zoom
            face_cx = img.width * 0.5
            face_cy = img.height * 0.32

        new_w = max(frame_w, int(img.width * scale))
        new_h = max(frame_h, int(img.height * scale))
        scaled = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        scaled_face_cx = face_cx * scale
        scaled_face_cy = face_cy * scale

        # Target center point in half frame
        target_cx = (frame_w / 2) + offset_x
        target_cy = (frame_h * target_eye_y) + offset_y

        cam_center_x = scaled_face_cx - (target_cx - frame_w / 2)
        cam_center_y = scaled_face_cy - (target_cy - frame_h / 2)

        # Clamp crop coordinates strictly within scaled image boundaries (guarantee edge-to-edge fill)
        max_x = max(0, new_w - frame_w)
        max_y = max(0, new_h - frame_h)

        crop_x1 = max(0, min(max_x, int(cam_center_x - frame_w / 2)))
        crop_y1 = max(0, min(max_y, int(cam_center_y - frame_h / 2)))
        crop_x2 = crop_x1 + frame_w
        crop_y2 = crop_y1 + frame_h

        cropped = scaled.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        return cropped.convert("RGBA")


class AssetManager:
    """Manages character art resolution, HoYoWiki API scraping, and badge assets."""

    @staticmethod
    def get_character_gallery_images(name_or_id: str) -> list:
        """Fetches all official illustrations (announcements, birthdays, splash, cards) from HoYoWiki."""
        # Check master galleries cache first (<1ms)
        all_galleries_path = CACHE_DIR / "all_galleries.json"
        if all_galleries_path.exists():
            try:
                import json
                with open(all_galleries_path, "r", encoding="utf-8") as f:
                    master = json.load(f)
                    for k, v in master.items():
                        if k.lower() == str(name_or_id).lower() or normalize_slug(k) == normalize_slug(str(name_or_id)):
                            if v:
                                return v
            except Exception:
                pass

        entry_id = None
        if str(name_or_id).isdigit():
            entry_id = str(name_or_id)
        elif HOYOWIKI_CATALOG_FILE.exists():
            try:
                import json
                with open(HOYOWIKI_CATALOG_FILE, "r", encoding="utf-8") as f:
                    cat = json.load(f)
                    # Exact or case-insensitive match
                    for k, v in cat.items():
                        if k.lower() == str(name_or_id).lower() or normalize_slug(k) == normalize_slug(str(name_or_id)):
                            entry_id = v.get("id")
                            break
            except Exception:
                pass

        if not entry_id:
            match = re.search(r"entry/([0-9]+)", str(name_or_id))
            if match:
                entry_id = match.group(1)

        if not entry_id:
            return []

        cache_path = CACHE_DIR / f"gallery_list_{entry_id}.json"
        if cache_path.exists():
            try:
                import json
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached_list = json.load(f)
                    if cached_list:
                        return cached_list
            except Exception:
                pass

        api_url = f"https://sg-wiki-api.hoyolab.com/hoyowiki/wapi/entry_page?entry_page_id={entry_id}"
        headers = {
            "Referer": "https://wiki.hoyolab.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        try:
            res = requests.get(api_url, headers=headers, timeout=12)
            if res.status_code == 200:
                data = res.json().get("data", {}).get("page", {})
                images = []
                for m in data.get("modules", []):
                    if m.get("name") in ["Gallery", "Media", "Pictures"]:
                        raw = requests.compat.json.dumps(m)
                        found = re.findall(r"https://[^\",\s\\]+\.(?:png|jpg|jpeg|webp)", raw)
                        for u in found:
                            lower = u.lower()
                            if not any(x in lower for x in ["avatar_icon", "talent", "constellation", "badge", "upload_icon", "point_icon"]):
                                if u not in images:
                                    images.append(u)
                if images:
                    import json
                    with open(cache_path, "w", encoding="utf-8") as f:
                        json.dump(images, f, indent=2)
                    return images
        except Exception as e:
            print(f"[!] Gallery fetch error for {name_or_id}: {e}")
        return []

    @staticmethod
    def fetch_from_hoyowiki_url(url_or_id: str) -> Image.Image:
        """Fetches character illustration directly from HoYoWiki entry URL or ID."""
        match = re.search(r"entry/([0-9]+)", url_or_id)
        entry_id = match.group(1) if match else url_or_id.strip()

        if not entry_id.isdigit():
            return None

        cached_file = CHAR_CACHE_DIR / f"hoyowiki_entry_{entry_id}.png"
        if cached_file.exists():
            try:
                return Image.open(cached_file).convert("RGBA")
            except Exception:
                pass

        gallery = AssetManager.get_character_gallery_images(entry_id)
        if gallery:
            # Prefer card art (taller portrait) or first image
            best_url = gallery[0]
            for u in gallery:
                if "card" in u.lower() or "character" in u.lower():
                    best_url = u
                    break
            try:
                img_res = requests.get(best_url, timeout=10)
                if img_res.status_code == 200:
                    img = Image.open(BytesIO(img_res.content)).convert("RGBA")
                    img.save(cached_file)
                    return img
            except Exception:
                pass
        return None

    @staticmethod
    def get_character_image(name_or_path: str) -> Image.Image:
        """Loads from file path, direct image URL, HoYoWiki URL, or resolves official artwork from CDN."""
        # 1. Direct Web Image URL
        if str(name_or_path).startswith("http://") or str(name_or_path).startswith("https://"):
            if "entry/" in name_or_path or ("hoyolab.com" in name_or_path and "entry" in name_or_path):
                hw_img = AssetManager.fetch_from_hoyowiki_url(name_or_path)
                if hw_img is not None:
                    return hw_img
            try:
                import hashlib
                url_hash = hashlib.md5(name_or_path.encode()).hexdigest()
                cached_url_file = CHAR_CACHE_DIR / f"url_{url_hash}.png"
                if cached_url_file.exists():
                    return Image.open(cached_url_file).convert("RGBA")
                res = requests.get(name_or_path, timeout=10)
                if res.status_code == 200 and len(res.content) > 1000:
                    img = Image.open(BytesIO(res.content)).convert("RGBA")
                    img.save(cached_url_file)
                    return img
            except Exception as e:
                print(f"[!] Direct image URL load failed: {e}")

        # 2. Local File Path
        p = Path(name_or_path)
        if p.exists() and p.is_file():
            return Image.open(p).convert("RGBA")

        # 3. Check cached images
        slug = normalize_slug(name_or_path)
        cached_art = CHAR_CACHE_DIR / f"{slug}_art.png"
        if cached_art.exists():
            try:
                return Image.open(cached_art).convert("RGBA")
            except Exception:
                pass

        # 4. Check HoYoWiki entry via character catalog
        gallery = AssetManager.get_character_gallery_images(name_or_path)
        if gallery:
            best_url = gallery[0]
            try:
                res = requests.get(best_url, timeout=10)
                if res.status_code == 200:
                    img = Image.open(BytesIO(res.content)).convert("RGBA")
                    img.save(cached_art)
                    return img
            except Exception:
                pass

        # 4. Check Mizuki local cache or special characters
        mizuki_card = CHAR_CACHE_DIR / "mizuki" / "mizuki_gallery_2.png"
        if "mizuki" in slug and mizuki_card.exists():
            return Image.open(mizuki_card).convert("RGBA")

        # 5. Candidate endpoints on genshin.jmp.blue
        candidate_urls = [
            f"https://genshin.jmp.blue/characters/{slug}/card",
            f"https://genshin.jmp.blue/characters/{slug}/gacha-splash",
            f"https://genshin.jmp.blue/characters/{slug}/portrait",
        ]

        for url in candidate_urls:
            try:
                res = requests.get(url, timeout=8)
                if res.status_code == 200 and len(res.content) > 10000:
                    img = Image.open(BytesIO(res.content)).convert("RGBA")
                    img.save(cached_art)
                    return img
            except Exception:
                continue

        # Fallback generated silhouette
        print(f"[!] Warning: Artwork not found for '{name_or_path}'. Using fallback silhouette.")
        dummy = Image.new("RGBA", (800, 1000), (30, 25, 45, 255))
        d = ImageDraw.Draw(dummy)
        d.ellipse([250, 150, 550, 450], fill=(160, 160, 200, 255))
        d.polygon([(400, 480), (180, 950), (620, 950)], fill=(120, 120, 170, 255))
        return dummy

    @staticmethod
    def get_floor_badge(size: int) -> Image.Image:
        """Loads and scales authentic Floor 12 badge."""
        badge_path = ASSETS_DIR / "badge_floor_12_shadowed.png"
        if not badge_path.exists():
            badge_path = ASSETS_DIR / "badge_floor_12.png"

        if badge_path.exists():
            img = Image.open(badge_path).convert("RGBA")
            return img.resize((size, size), Image.Resampling.LANCZOS)

        # Fallback circular badge
        fallback = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(fallback)
        d.ellipse([4, 4, size - 5, size - 5], fill=(235, 240, 245, 255), outline=(100, 110, 130, 255), width=int(size * 0.06))
        return fallback

    @staticmethod
    def get_patch_rosette(size: int, version_text: str = "5.2") -> Image.Image:
        """Generates authentic golden scalloped rosette with version text."""
        rosette_base = ASSETS_DIR / "badge_patch_rosette.png"
        if rosette_base.exists():
            base = Image.open(rosette_base).convert("RGBA")
        else:
            # Generate procedural rosette
            base = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
            d = ImageDraw.Draw(base)
            cx, cy = 256, 256
            pts = []
            for i in range(360 * 4):
                theta = i * math.pi / 720
                r = 195 + 10 * math.cos(12 * theta)
                pts.append((cx + r * math.cos(theta), cy + r * math.sin(theta)))
            d.polygon(pts, fill=(254, 222, 98, 255), outline=(0, 0, 0, 255), width=8)

        base_scaled = base.resize((size, size), Image.Resampling.LANCZOS)
        
        # Render version text centered inside rosette
        draw = ImageDraw.Draw(base_scaled)
        font_size = int(size * 0.34)
        
        font = None
        if ANTON_FONT_FILE.exists():
            try:
                font = ImageFont.truetype(str(ANTON_FONT_FILE), font_size)
            except Exception:
                pass
        if font is None:
            font = ImageFont.load_default()

        clean_text = str(version_text).replace("ABYSS", "").replace("★", "").strip()

        # Center version text with exact mathematical glyph visual centering
        stroke_w = max(2, int(size * 0.027))
        cx, cy = size / 2, size / 2
        bbox = font.getbbox(clean_text)
        glyph_center_x = (bbox[0] + bbox[2]) / 2
        glyph_center_y = (bbox[1] + bbox[3]) / 2
        draw_x = cx - glyph_center_x
        draw_y = cy - glyph_center_y

        draw.text(
            (draw_x, draw_y),
            clean_text,
            font=font,
            fill=(255, 255, 255, 255),
            stroke_width=stroke_w,
            stroke_fill=(0, 0, 0, 255)
        )

        return base_scaled


class ThumbnailRenderer:
    """Composites the authentic 50/50 HoYoWiki Split-Screen YouTube Thumbnail."""

    def __init__(self, width=1920, height=1080):
        self.width = width
        self.height = height
        self.normalizer = HeadNormalizer()

    def _get_font(self, size: int) -> ImageFont.FreeTypeFont:
        if ANTON_FONT_FILE.exists():
            try:
                return ImageFont.truetype(str(ANTON_FONT_FILE), size)
            except Exception:
                pass
        
        win_fonts = [
            Path("C:/Windows/Fonts/impact.ttf"),
            Path("C:/Windows/Fonts/ariblk.ttf"),
            Path("C:/Windows/Fonts/HATTEN.TTF"),
        ]
        for f in win_fonts:
            if f.exists():
                try:
                    return ImageFont.truetype(str(f), size)
                except Exception:
                    pass
        return ImageFont.load_default()

    def render_side_preview(
        self,
        img: Image.Image,
        zoom: float = 1.0,
        offset_x: int = 0,
        offset_y: int = 0,
        mirror: bool = False,
        auto_normalize: bool = True
    ) -> Image.Image:
        """Renders an individual side preview for interactive Canva-style visual positioning."""
        half_w = self.width // 2
        return self.normalizer.frame_character_half(
            img_pil=img,
            frame_w=half_w,
            frame_h=self.height,
            target_head_ratio=0.31,
            target_eye_y=0.28,
            zoom=zoom,
            offset_x=offset_x,
            offset_y=offset_y,
            mirror=mirror,
            auto_normalize=auto_normalize
        ).convert("RGB")

    def render(
        self,
        side1_img: Image.Image,
        side2_img: Image.Image,
        side1_name: str = "CHASCA",
        side1_const: str = "C0",
        side1_archetype: str = "OVERVAPE",
        side2_name: str = "ARLECCHINO",
        side2_const: str = "C0",
        side2_archetype: str = "DOUBLE PYRO",
        floor: str = "12",
        patch: str = "5.2",
        zoom1: float = 1.0,
        offset_x1: int = 0,
        offset_y1: int = 0,
        mirror1: bool = False,
        zoom2: float = 1.0,
        offset_x2: int = 0,
        offset_y2: int = 0,
        mirror2: bool = True,
        auto_normalize: bool = True
    ) -> Image.Image:
        half_w = self.width // 2

        # 1. Normalize and frame Left Side (Side 1)
        left_canvas = self.normalizer.frame_character_half(
            img_pil=side1_img,
            frame_w=half_w,
            frame_h=self.height,
            target_head_ratio=0.31,
            target_eye_y=0.28,
            zoom=zoom1,
            offset_x=offset_x1,
            offset_y=offset_y1,
            mirror=mirror1,
            auto_normalize=auto_normalize
        )

        # 2. Normalize and frame Right Side (Side 2)
        right_canvas = self.normalizer.frame_character_half(
            img_pil=side2_img,
            frame_w=half_w,
            frame_h=self.height,
            target_head_ratio=0.31,
            target_eye_y=0.28,
            zoom=zoom2,
            offset_x=offset_x2,
            offset_y=offset_y2,
            mirror=mirror2,
            auto_normalize=auto_normalize
        )

        # 3. Base Split Composite
        canvas = Image.new("RGBA", (self.width, self.height))
        canvas.paste(left_canvas, (0, 0))
        canvas.paste(right_canvas, (half_w, 0))

        # 4. Smooth Dark Vignette at Bottom (Bottom 48% to 100%)
        vignette = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))
        v_draw = ImageDraw.Draw(vignette)
        vig_start_y = int(self.height * 0.52)
        vig_range = self.height - vig_start_y

        for y in range(vig_start_y, self.height):
            progress = (y - vig_start_y) / vig_range
            alpha = int(220 * math.pow(progress, 1.4))
            v_draw.line([(0, y), (self.width, y)], fill=(0, 0, 0, alpha))

        canvas = Image.alpha_composite(canvas, vignette)

        # 5. Crisp Center Black Divider Line & Pins (From User's Base Canvas)
        divider_path = ASSETS_DIR / "divider_from_base_canvas.png"
        if divider_path.exists():
            divider_layer = Image.open(divider_path).convert("RGBA")
            divider_layer = divider_layer.resize((self.width, self.height), Image.Resampling.LANCZOS)
            canvas = Image.alpha_composite(canvas, divider_layer)
        else:
            divider_layer = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))
            d_draw = ImageDraw.Draw(divider_layer)
            line_w = max(4, int(self.width * 0.003))
            x_div = half_w
            d_draw.line([(x_div, 0), (x_div, self.height)], fill=(0, 0, 0, 255), width=line_w)
            cap_r = line_w * 2.2
            d_draw.ellipse([x_div - cap_r, 4, x_div + cap_r, 4 + cap_r * 2], fill=(0, 0, 0, 255))
            d_draw.ellipse([x_div - cap_r, self.height - 4 - cap_r * 2, x_div + cap_r, self.height - 4], fill=(0, 0, 0, 255))
            canvas = Image.alpha_composite(canvas, divider_layer)

        # 6. Badges Overlay
        overlay = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))

        # A. Top-Left Floor 12 Emblem (Measured exact ratios)
        badge_size = int(self.height * 0.131)
        floor_badge = AssetManager.get_floor_badge(badge_size)
        fb_cx = int(self.width * 0.065)
        fb_cy = int(self.height * 0.125)
        overlay.paste(floor_badge, (fb_cx - badge_size // 2, fb_cy - badge_size // 2), floor_badge)

        # B. Center Patch Rosette Medallion (Measured exact ratios)
        rosette_size = int(self.height * 0.170)
        patch_rosette = AssetManager.get_patch_rosette(rosette_size, patch)
        pr_cx = half_w
        pr_cy = int(self.height * 0.508)
        overlay.paste(patch_rosette, (pr_cx - rosette_size // 2, pr_cy - rosette_size // 2), patch_rosette)

        # 7. Typography (Bottom-Left and Bottom-Right)
        text_draw = ImageDraw.Draw(overlay)
        font_size = int(self.height * 0.095)
        font = self._get_font(font_size)
        stroke_width = max(3, int(font_size * 0.075))

        # Side 1 Text:
        s1_line1 = f"{side1_const.strip().upper()} {side1_name.strip().upper()}".strip()
        s1_line2 = side1_archetype.strip().upper()

        # Side 2 Text:
        s2_line1 = f"{side2_const.strip().upper()} {side2_name.strip().upper()}".strip()
        s2_line2 = side2_archetype.strip().upper()

        line_spacing = int(font_size * 0.94)
        y2 = int(self.height * 0.855)
        y1 = y2 - line_spacing

        # Helper to render 2-line centered block
        def draw_headline_block(center_x: int, line1: str, line2: str):
            # Draw line 1 with anchor='mm'
            text_draw.text(
                (center_x, y1),
                line1,
                font=font,
                fill=(255, 255, 255, 255),
                stroke_width=stroke_width,
                stroke_fill=(0, 0, 0, 255),
                anchor="mm"
            )

            # Draw line 2 with anchor='mm'
            text_draw.text(
                (center_x, y2),
                line2,
                font=font,
                fill=(255, 255, 255, 255),
                stroke_width=stroke_width,
                stroke_fill=(0, 0, 0, 255),
                anchor="mm"
            )

        # Draw Side 1 at center of left half (W/4)
        draw_headline_block(half_w // 2, s1_line1, s1_line2)

        # Draw Side 2 at center of right half (3W/4)
        draw_headline_block(half_w + half_w // 2, s2_line1, s2_line2)

        # Composite and return RGB
        final_img = Image.alpha_composite(canvas, overlay)
        return final_img.convert("RGB")


def main():
    parser = argparse.ArgumentParser(description="Generate Genshin Impact Spiral Abyss Split-Screen YouTube Thumbnails")
    parser.add_argument("--side1", type=str, default="Chasca", help="Side 1 character name or image path")
    parser.add_argument("--side1-const", type=str, default="C0", help="Side 1 constellation (e.g. C0)")
    parser.add_argument("--side1-archetype", type=str, default="OVERVAPE", help="Side 1 archetype subtitle")
    parser.add_argument("--side2", type=str, default="Arlecchino", help="Side 2 character name or image path")
    parser.add_argument("--side2-const", type=str, default="C0", help="Side 2 constellation (e.g. C0)")
    parser.add_argument("--side2-archetype", type=str, default="DOUBLE PYRO", help="Side 2 archetype subtitle")
    parser.add_argument("--floor", type=str, default="12", help="Abyss floor number")
    parser.add_argument("--patch", type=str, default="5.2", help="Patch version tag (e.g. 5.2)")
    parser.add_argument("--zoom1", type=float, default=1.0, help="Zoom factor for Side 1")
    parser.add_argument("--offset-x1", type=int, default=0, help="Horizontal offset for Side 1")
    parser.add_argument("--offset-y1", type=int, default=0, help="Vertical offset for Side 1")
    parser.add_argument("--mirror1", action="store_true", help="Mirror Side 1 horizontally")
    parser.add_argument("--zoom2", type=float, default=1.0, help="Zoom factor for Side 2")
    parser.add_argument("--offset-x2", type=int, default=0, help="Horizontal offset for Side 2")
    parser.add_argument("--offset-y2", type=int, default=0, help="Vertical offset for Side 2")
    parser.add_argument("--no-mirror2", action="store_true", help="Do not mirror Side 2 horizontally")
    parser.add_argument("--no-auto-normalize", action="store_true", help="Disable automatic head detection")
    parser.add_argument("--width", type=int, default=1920, help="Output width (default: 1920)")
    parser.add_argument("--height", type=int, default=1080, help="Output height (default: 1080)")
    parser.add_argument("--output", type=str, default=None, help="Output path")

    args = parser.parse_args()

    # Load character images
    img1 = AssetManager.get_character_image(args.side1)
    img2 = AssetManager.get_character_image(args.side2)

    renderer = ThumbnailRenderer(width=args.width, height=args.height)
    thumb = renderer.render(
        side1_img=img1,
        side2_img=img2,
        side1_name=Path(args.side1).stem if Path(args.side1).exists() else args.side1,
        side1_const=args.side1_const,
        side1_archetype=args.side1_archetype,
        side2_name=Path(args.side2).stem if Path(args.side2).exists() else args.side2,
        side2_const=args.side2_const,
        side2_archetype=args.side2_archetype,
        floor=args.floor,
        patch=args.patch,
        zoom1=args.zoom1,
        offset_x1=args.offset_x1,
        offset_y1=args.offset_y1,
        mirror1=args.mirror1,
        zoom2=args.zoom2,
        offset_x2=args.offset_x2,
        offset_y2=args.offset_y2,
        mirror2=not args.no_mirror2,
        auto_normalize=not args.no_auto_normalize
    )

    out_path = Path(args.output) if args.output else OUTPUT_DIR / "latest_abyss_thumbnail.png"
    thumb.save(out_path, quality=95)
    print(f"[✓] Thumbnail successfully generated: {out_path}")
    return str(out_path)


if __name__ == "__main__":
    main()
