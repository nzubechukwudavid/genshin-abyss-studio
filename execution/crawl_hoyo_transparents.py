import urllib.parse
"""
HoYo-Transparents Character Render Scraper & Offline Vault Synchronizer
DOE-VERSION: 2026.09.21

Crawls transparent character cutouts from hoyo-transparents.tumblr.com,
extracts high-resolution transparent renders, generates a local catalog,
and provides offline caching.

Usage:
  python execution/crawl_hoyo_transparents.py --index-only      # Build lightweight catalog without downloading heavy images
  python execution/crawl_hoyo_transparents.py --char Venti      # Download transparent renders for a specific character
  python execution/crawl_hoyo_transparents.py --dry-run         # Inspect available renders without downloading
  python execution/crawl_hoyo_transparents.py --download-all    # Download entire vault (large download: ~4-8 GB)
"""

import os
import sys
import json
import re
import argparse
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CATALOG_DIR = DATA_DIR / "catalog"
RENDERS_DIR = DATA_DIR / "renders"
CATALOG_FILE = CATALOG_DIR / "hoyo_transparents_catalog.json"

CATALOG_DIR.mkdir(parents=True, exist_ok=True)
RENDERS_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

def fetch_url(url: str, timeout: int = 15) -> str:
    r = SESSION.get(url, timeout=timeout)
    r.raise_for_status()
    return r.text

def download_file(url: str, dest_path: Path, timeout: int = 45) -> bool:
    try:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        r = SESSION.get(url, timeout=timeout, stream=True)
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
        if dest_path.stat().st_size > 1000:
            return True
    except Exception as e:
        print(f"    [!] Error downloading {url}: {e}")
    return False

def get_character_list() -> List[Dict[str, str]]:
    """Scrapes the master Genshin character index from Tumblr."""
    master_url = "https://hoyo-transparents.tumblr.com/genshinimpact"
    print(f"[*] Fetching master character index from {master_url}...")
    html = fetch_url(master_url)
    
    tags = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL | re.IGNORECASE)
    characters = []
    seen = set()

    for href, text in tags:
        clean_name = re.sub(r'<[^>]+>', '', text).strip()
        if not clean_name or not any(c.isalpha() for c in clean_name):
            continue
        if "/tagged/" in href and "hoyo-transparents" in href:
            if clean_name.lower() in seen:
                continue
            seen.add(clean_name.lower())
            full_url = href if href.startswith("http") else f"https://hoyo-transparents.tumblr.com{href}"
            characters.append({
                "name": clean_name,
                "url": full_url
            })

    print(f"[+] Found {len(characters)} characters in master directory.")
    return characters

def extract_character_renders(char_info: Dict[str, str]) -> List[Dict[str, Any]]:
    """Inspects a character tagged page and extracts transparent PNG renders and Drive links."""
    char_name = char_info["name"]
    url = char_info["url"]
    renders = []

    try:
        html = fetch_url(url)
    except Exception as e:
        print(f"    [!] Failed to fetch {url}: {e}")
        return renders

    # 1. Extract direct high-res Tumblr CDN image links
    img_matches = re.findall(r'https://\d+\.media\.tumblr\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+/s\d+x\d+/[a-zA-Z0-9]+\.png', html)
    for img_url in set(img_matches):
        hd_url = re.sub(r'/s\d+x\d+/', '/s2048x3072/', img_url)
        pose_id = re.sub(r'\W+', '_', Path(hd_url).stem)[:24]
        renders.append({
            "id": f"{char_name.lower()}_{pose_id}",
            "title": f"{char_name} Render {len(renders) + 1}",
            "source": "tumblr_cdn",
            "url": hd_url,
            "thumb_url": img_url
        })

    # 2. Extract Google Drive folder links if available
    drive_links = re.findall(r'https?://drive\.google\.com/drive/folders/([a-zA-Z0-9_-]+)', html)
    drive_folders = list(dict.fromkeys(drive_links))

    for folder_id in drive_folders:
        try:
            folder_url = f"https://drive.google.com/drive/folders/{folder_id}"
            f_html = fetch_url(folder_url, timeout=10)
            
            items = re.findall(r'aria-label="([^"]+\.png)[^"]*"\s+[^>]*ssk=[\'"][^:\'"]*:[^:\'"]*:([a-zA-Z0-9_-]+)', f_html)
            for file_name, file_id in items:
                direct_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                clean_title = file_name.replace("Hoyo-Transparents", "").replace("Hoyo-transparents", "").replace(".png", "").strip(" _-")
                renders.append({
                    "id": f"{char_name.lower()}_{file_id[:12]}",
                    "title": clean_title or f"{char_name} Official Render",
                    "source": "google_drive",
                    "url": direct_url,
                    "drive_file_id": file_id,
                    "drive_folder_id": folder_id,
                    "thumb_url": direct_url
                })
        except Exception:
            pass

    return renders

def build_catalog(limit: Optional[int] = None) -> Dict[str, Any]:
    """Builds the local catalog index json."""
    chars = get_character_list()
    if limit:
        chars = chars[:limit]

    catalog = {
        "version": "1.0",
        "characters_count": len(chars),
        "characters": {}
    }

    print(f"[*] Crawling render metadata for {len(chars)} characters...")
    for i, c in enumerate(chars):
        cname = c["name"]
        print(f"  [{i+1}/{len(chars)}] Indexing {cname}...")
        renders = extract_character_renders(c)
        catalog["characters"][cname] = {
            "name": cname,
            "tag_url": c["url"],
            "renders_count": len(renders),
            "renders": renders
        }

    CATALOG_FILE.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    print(f"[+] Catalog saved to {CATALOG_FILE}")
    return catalog

def sync_character_renders(char_name: str, catalog: Dict[str, Any], max_items: int = 4) -> int:
    """Downloads transparent renders for a single character (bounded to max_items to respect metered connections)."""
    char_data = catalog.get("characters", {}).get(char_name)
    if not char_data:
        for k, v in catalog.get("characters", {}).items():
            if k.lower() == char_name.lower():
                char_data = v
                char_name = k
                break

    if not char_data:
        print(f"[!] Character '{char_name}' not found in catalog.")
        return 0

    char_dir = RENDERS_DIR / char_name.replace(" ", "_")
    char_dir.mkdir(parents=True, exist_ok=True)
    renders = char_data.get("renders", [])[:max_items]
    print(f"[*] Downloading {len(renders)} renders for {char_name} into {char_dir} (bounded to {max_items} items)...")

    downloaded = 0
    for idx, r in enumerate(renders):
        filename = f"{r.get('id', f'render_{idx}')}.png"
        target_file = char_dir / filename
        if target_file.exists() and target_file.stat().st_size > 10000:
            print(f"  [{idx+1}/{len(renders)}] Already cached: {filename}")
            downloaded += 1
            continue

        print(f"  [{idx+1}/{len(renders)}] Fetching {r.get('title')}...")
        success = download_file(r["url"], target_file)
        if success:
            downloaded += 1
            print(f"    [OK] Saved {target_file.stat().st_size // 1024} KB")

    print(f"[+] Completed {char_name}: {downloaded} files available locally.")
    return downloaded

def main():
    parser = argparse.ArgumentParser(description="HoYo-Transparents Character Render Scraper & Offline Synchronizer")
    parser.add_argument("--index-only", action="store_true", help="Crawl and build catalog index only (zero image downloads)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of characters to index")
    parser.add_argument("--char", type=str, default=None, help="Download renders for a specific character name")
    parser.add_argument("--dry-run", action="store_true", help="Print summary without downloading")
    parser.add_argument("--download-all", action="store_true", help="Download all character renders (Warning: large data usage)")

    args = parser.parse_args()

    if args.index_only:
        build_catalog(limit=args.limit)
        return

    if not CATALOG_FILE.exists():
        print("[*] Catalog index not found. Building initial index for starters...")
        catalog = build_catalog(limit=args.limit or 10)
    else:
        catalog = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))

    if args.dry_run:
        print(f"[Dry-Run] Indexed characters: {len(catalog.get('characters', {}))}")
        total_renders = sum(c.get("renders_count", 0) for c in catalog.get("characters", {}).values())
        print(f"[Dry-Run] Total available transparent cutouts: {total_renders}")
        return

    if args.char:
        # If character not yet indexed, index that character on the fly
        if args.char not in catalog.get("characters", {}):
            char_url = f"https://hoyo-transparents.tumblr.com/tagged/{urllib.parse.quote(args.char.lower())}"
            renders = extract_character_renders({"name": args.char, "url": char_url})
            catalog["characters"][args.char] = {
                "name": args.char,
                "tag_url": char_url,
                "renders_count": len(renders),
                "renders": renders
            }
            CATALOG_FILE.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
        sync_character_renders(args.char, catalog)
        return

    if args.download_all:
        confirm = os.environ.get("CONFIRM_UNMETERED_DOWNLOAD")
        if not confirm:
            print("[!] Safeguard: Mass downloading all characters consumes 4-8 GB.")
            print("    Run with CONFIRM_UNMETERED_DOWNLOAD=1 or download individually via --char <name>.")
            return
        for cname in catalog.get("characters", {}):
            sync_character_renders(cname, catalog)

if __name__ == "__main__":
    main()
