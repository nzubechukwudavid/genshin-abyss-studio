"""
Stygian Onslaught Router for Genshin Abyss Studio.
Handles cycle discovery, boss metadata, presets, live scraping from stygian.moe,
and local disk caching.
"""

import io
import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query
from PIL import Image

from app.core import BASE_DIR, DATA_DIR
from app.core.logger import logger

router = APIRouter(prefix="/api/stygian", tags=["stygian"])

STYGIAN_CACHE_FILE = DATA_DIR / "stygian_live_cache.json"

def sanitize_short_name(full_name: str) -> str:
    """Extract concise 1-3 word identifier for badges and thumbnail titles."""
    lower = full_name.lower()
    if 'domovoy' in lower:
        return 'Domovoy'
    if 'overseer' in lower:
        return 'Overseer Device'
    if 'guardian' in lower and 'blade' in lower:
        return 'Guardian Blade'
    if 'papilla' in lower:
        return 'Papilla'
    if 'gecko' in lower:
        return 'Moongecko'
    if 'lion' in lower:
        return 'Winged Lion'
    if 'tulpa' in lower:
        return 'Hydro Tulpa'
    if 'asimon' in lower:
        return 'ASIMON'
    if 'drake' in lower:
        return 'Aeonblight Drake'
    
    parts = re.split(r'[:\-??]', full_name)
    cand = parts[0].strip()
    if len(cand) > 18 and len(parts) > 1:
        cand = parts[1].strip()
    return cand[:20]

def detect_boss_color(name: str) -> str:
    lower = name.lower()
    if any(k in lower for k in ['automaton', 'overseer', 'electro']):
        return '#c084fc' # Electro / Automaton Purple
    if any(k in lower for k in ['cryo', 'snow', 'frost', 'blade']) or ('ice' in re.findall(r'\b\w+\b', lower)):
        return '#fb7185' # Cryo / Rose
    if any(k in lower for k in ['anemo', 'gale', 'wind', 'domovoy', 'hewing']):
        return '#00e5ff' # Anemo / Cyan
    if any(k in lower for k in ['pyro', 'fire', 'flame', 'iron']):
        return '#f97316' # Pyro orange
    if any(k in lower for k in ['hydro', 'water', 'tulpa', 'wave']):
        return '#38bdf8' # Hydro blue
    if any(k in lower for k in ['geo', 'rock', 'stone', 'gecko']):
        return '#eab308' # Geo gold
    return '#38bdf8'

def fetch_stygian_moe_live(force: bool = False) -> Optional[Dict[str, Any]]:
    """Live scraper that fetches active cycle, boss names & high-res portraits from stygian.moe"""
    try:
        import urllib.request
        
        url = 'https://stygian.moe'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        # 1. Parse Version & Period
        v_match = re.search(r'class="[^"]*text-xl font-bold[^"]*">(\d+\.\d+)</div>\s*<div class="[^"]*text-boss-text-muted">([^<]+)</div>', html)
        version = v_match.group(1) if v_match else "7.1"
        period = v_match.group(2) if v_match else "Sep 30, 2026 - Nov 11, 2026"

        # 2. Parse Boss cards
        boss_matches = re.findall(r'<img[^>]+alt="([^"]+)"[^>]+src="(https://bosses-cdn\.stygianonslaught\.com/[^"]+)"', html)
        if not boss_matches:
            boss_matches = re.findall(r'<img[^>]+src="(https://bosses-cdn\.stygianonslaught\.com/[^"]+)"[^>]+alt="([^"]+)"', html)
            boss_matches = [(b, a) for a, b in boss_matches]

        if not boss_matches:
            return None

        bosses_dir = BASE_DIR / "data" / "assets" / "bosses"
        bosses_dir.mkdir(parents=True, exist_ok=True)

        bosses_data = []
        for idx, (full_name, cdn_url) in enumerate(boss_matches[:3]):
            slot = idx + 1
            short_name = sanitize_short_name(full_name)
            color = detect_boss_color(full_name)
            
            slug = re.sub(r'[^a-z0-9]+', '_', short_name.lower()).strip('_')
            filename = f"stygian_{slug}.png"
            target_path = bosses_dir / filename
            
            # Download & convert if missing or forced
            if not target_path.exists() or force:
                try:
                    img_req = urllib.request.Request(cdn_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(img_req, timeout=8) as img_resp:
                        raw_data = img_resp.read()
                    pil_img = Image.open(io.BytesIO(raw_data)).convert('RGBA')
                    pil_img.save(str(target_path), 'PNG')
                except Exception as ex:
                    logger.warning(f"Could not download {cdn_url}: {ex}")

            bosses_data.append({
                "slot": slot,
                "id": slug,
                "short_name": short_name,
                "full_name": full_name,
                "icon": f"/static/assets/bosses/{filename}",
                "color": color
            })

        cycle_data = {
            "version": version,
            "period": period,
            "name": f"Stygian Onslaught {version}",
            "bosses": bosses_data,
            "last_synced": "live"
        }

        with open(STYGIAN_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cycle_data, f, indent=2)

        return cycle_data
    except Exception as e:
        logger.debug(f"Failed to fetch live stygian.moe: {e}")
        return None

@router.get("/cycles")
async def get_stygian_cycles(refresh: bool = False):
    """Returns active Stygian Onslaught cycle metadata, presets, and boss catalog."""
    current_cycle = None
    if refresh:
        current_cycle = fetch_stygian_moe_live(force=True)
    
    if not current_cycle and STYGIAN_CACHE_FILE.exists():
        try:
            with open(STYGIAN_CACHE_FILE, 'r', encoding='utf-8') as f:
                current_cycle = json.load(f)
        except Exception:
            pass

    if not current_cycle:
        current_cycle = fetch_stygian_moe_live(force=False)

    # Fallback if offline and no cache
    if not current_cycle:
        current_cycle = {
            "version": "7.1",
            "name": "Stygian Onslaught 7.1",
            "period": "Sep 30, 2026 - Nov 11, 2026",
            "bosses": [
                {
                    "slot": 1,
                    "id": "domovoy",
                    "short_name": "Domovoy",
                    "full_name": "Battle-Hardened Domovoy Sculptor: Gale Hewing",
                    "icon": "/static/assets/bosses/stygian_domovoy.png",
                    "color": "#00e5ff"
                },
                {
                    "slot": 2,
                    "id": "overseer_device",
                    "short_name": "Overseer Device",
                    "full_name": "Secret Source Automaton: Overseer Device - Obliterator Panoply",
                    "icon": "/static/assets/bosses/stygian_overseer.png",
                    "color": "#c084fc"
                },
                {
                    "slot": 3,
                    "id": "guardian_blade",
                    "short_name": "Guardian Blade",
                    "full_name": "Guardian Blade of Drifting Snow: Endless Reverberation",
                    "icon": "/static/assets/bosses/stygian_guardian_blade.png",
                    "color": "#fb7185"
                }
            ]
        }

    return {
        "current_patch": current_cycle.get("version", "7.1"),
        "current_cycle": current_cycle,
        "presets": [
            {
                "version": "7.1",
                "label": "Version 7.1: Luminous Battlefront (stygian.moe)",
                "bosses": [
                    {"slot": 1, "short_name": "Domovoy", "icon": "/static/assets/bosses/stygian_domovoy.png", "color": "#00e5ff"},
                    {"slot": 2, "short_name": "Overseer Device", "icon": "/static/assets/bosses/stygian_overseer.png", "color": "#c084fc"},
                    {"slot": 3, "short_name": "Guardian Blade", "icon": "/static/assets/bosses/stygian_guardian_blade.png", "color": "#fb7185"}
                ]
            },
            {
                "version": "7.0",
                "label": "Version 7.0: Battle of the Starburst",
                "bosses": [
                    {"slot": 1, "short_name": "Winged Lion", "icon": "/static/assets/bosses/winged_lion.png", "color": "#fbbf24"},
                    {"slot": 2, "short_name": "Config Automaton", "icon": "/static/assets/bosses/config_device.png", "color": "#38bdf8"},
                    {"slot": 3, "short_name": "Maguu Kenki", "icon": "/static/assets/bosses/maguu_kenki.png", "color": "#34d399"}
                ]
            },
            {
                "version": "7.2",
                "label": "Version 7.2: Wavecrest & Fire Emperor",
                "bosses": [
                    {"slot": 1, "short_name": "Wavecrest Anchor", "icon": "/static/assets/bosses/wavecrest.png", "color": "#a855f7"},
                    {"slot": 2, "short_name": "Fire Emperor", "icon": "/static/assets/bosses/fire_emperor.png", "color": "#f97316"},
                    {"slot": 3, "short_name": "Moongecko", "icon": "/static/assets/bosses/moongecko.png", "color": "#eab308"}
                ]
            }
        ],
        "catalog": [
            {"id": "domovoy", "name": "Domovoy", "fullName": "Battle-Hardened Domovoy Sculptor", "icon": "/static/assets/bosses/stygian_domovoy.png", "color": "#00e5ff"},
            {"id": "overseer_device", "name": "Overseer Device", "fullName": "Secret Source Automaton: Overseer Device", "icon": "/static/assets/bosses/stygian_overseer.png", "color": "#c084fc"},
            {"id": "guardian_blade", "name": "Guardian Blade", "fullName": "Guardian Blade of Drifting Snow", "icon": "/static/assets/bosses/stygian_guardian_blade.png", "color": "#fb7185"},
            {"id": "winged_lion", "name": "Winged Lion", "fullName": "Chimeric Winged Lion", "icon": "/static/assets/bosses/winged_lion.png", "color": "#fbbf24"},
            {"id": "config_device", "name": "Config Automaton", "fullName": "Secret Source Automaton: Configuration Device", "icon": "/static/assets/bosses/config_device.png", "color": "#38bdf8"},
            {"id": "maguu_kenki", "name": "Maguu Kenki", "fullName": "Maguu Kenki: Lone Gallant", "icon": "/static/assets/bosses/maguu_kenki.png", "color": "#34d399"},
            {"id": "wavecrest", "name": "Wavecrest Anchor", "fullName": "Wavecrest Anchor", "icon": "/static/assets/bosses/wavecrest.png", "color": "#a855f7"},
            {"id": "fire_emperor", "name": "Fire Emperor", "fullName": "Emperor of Fire and Iron", "icon": "/static/assets/bosses/fire_emperor.png", "color": "#f97316"},
            {"id": "moongecko", "name": "Moongecko", "fullName": "Radiant Moongecko", "icon": "/static/assets/bosses/moongecko.png", "color": "#eab308"},
            {"id": "aeonblight_drake", "name": "Aeonblight Drake", "fullName": "Aeonblight Drake", "icon": "/static/assets/bosses/aeonblight_drake.png", "color": "#f59e0b"},
            {"id": "icewind_suite", "name": "Icewind Suite", "fullName": "Icewind Suite (Coppelia & Coppelius)", "icon": "/static/assets/bosses/icewind_suite.png", "color": "#38bdf8"}
        ]
    }
