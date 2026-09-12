"""
Pre-caches official HoYoWiki gallery and media illustrations for all 130 playable characters.
Saves to data/cache/all_galleries.json for instantaneous (<2ms) responses in the studio.
"""

import sys
import time
import json
import re
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Configure utf-8 stdout for Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BASE_DIR / "data" / "cache"
CATALOG_FILE = CACHE_DIR / "hoyowiki_characters.json"
OUTPUT_FILE = CACHE_DIR / "all_galleries.json"


def fetch_character_gallery(name: str, entry_id: str) -> tuple:
    if not entry_id or not entry_id.isdigit():
        return name, []

    indiv_cache = CACHE_DIR / f"gallery_list_{entry_id}.json"
    if indiv_cache.exists():
        try:
            with open(indiv_cache, "r", encoding="utf-8") as f:
                imgs = json.load(f)
                if imgs and len(imgs) > 0:
                    return name, imgs
        except Exception:
            pass

    api_url = f"https://sg-wiki-api.hoyolab.com/hoyowiki/wapi/entry_page?entry_page_id={entry_id}"
    headers = {
        "Referer": "https://wiki.hoyolab.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    for attempt in range(3):
        try:
            res = requests.get(api_url, headers=headers, timeout=12)
            if res.status_code == 200:
                page = res.json().get("data", {}).get("page", {})
                images = []
                for m in page.get("modules", []):
                    if m.get("name") in ["Gallery", "Media", "Pictures"]:
                        raw = json.dumps(m)
                        found = re.findall(r"https://[^\",\s\\]+\.(?:png|jpg|jpeg|webp)", raw)
                        for u in found:
                            lower = u.lower()
                            if not any(x in lower for x in ["avatar_icon", "talent", "constellation", "badge", "upload_icon", "point_icon"]):
                                if u not in images:
                                    images.append(u)
                if images:
                    with open(indiv_cache, "w", encoding="utf-8") as f:
                        json.dump(images, f, indent=2)
                    return name, images
            time.sleep(1.0)
        except Exception:
            time.sleep(1.5)

    return name, []


def main():
    if not CATALOG_FILE.exists():
        print("[!] Character catalog not found!")
        return

    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    existing_galleries = {}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing_galleries = json.load(f)
        except Exception:
            pass

    results = dict(existing_galleries)
    missing = [name for name, info in catalog.items() if not results.get(name)]

    print(f"[*] Total catalog: {len(catalog)} characters. Currently cached: {len(results)}. Missing/retry: {len(missing)}")

    if missing:
        with ThreadPoolExecutor(max_workers=5) as executor:
            tasks = {executor.submit(fetch_character_gallery, name, catalog[name].get("id")): name for name in missing}
            completed = 0
            for future in as_completed(tasks):
                name, imgs = future.result()
                if imgs:
                    results[name] = imgs
                completed += 1
                if completed % 5 == 0 or completed == len(missing):
                    print(f"[*] Progress: {completed}/{len(missing)} (cached {len(imgs)} for {name})")

    # Save consolidated cache
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"[OK] Successfully saved {len(results)} character galleries to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
