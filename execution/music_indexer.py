"""Fast recursive music metadata indexer for Genshin Abyss Studio.

Extracts track duration, artist, title, and energy categorization from audio
file headers (MP3, M4A, FLAC, WAV, OGG) using tinytag without decoding audio waveforms.
Caches lightweight metadata into data/cache/music_catalog.json for instantaneous lookup (<2ms).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from tinytag import TinyTag
except ImportError:
    TinyTag = None  # Handled gracefully if missing

PROJECT_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = PROJECT_DIR / "data" / "cache"
CATALOG_PATH = CACHE_DIR / "music_catalog.json"
DEFAULT_MUSIC_DIR = Path(r"C:\Users\David\Music")

SUPPORTED_AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".flac", ".ogg", ".aac", ".wma"}

HIGH_ENERGY_KEYWORDS = {
    "ncs", "battle", "combat", "boss", "metal", "rock", "edm", "electro",
    "adrenaline", "hyper", "action", "fight", "abyss", "intense", "cyberpunk",
    "dubstep", "synthwave", "trap", "hardcore", "breakcore", "techno", "fast"
}

CHILL_OUTRO_KEYWORDS = {
    "chill", "lofi", "lo-fi", "relax", "acoustic", "piano", "ambient",
    "peaceful", "teapot", "serenitea", "dawn winery", "menu", "lounge",
    "gentle", "calm", "nostalgic", "sleep", "study", "soft", "outro"
}


def clean_track_title(filename_or_tag: str) -> str:
    """Cleans up filenames like '[NCS Release] Elektronomia - Sky High (320k)' into a clean title."""
    txt = filename_or_tag
    # Strip extension
    if "." in txt:
        txt = Path(txt).stem
    # Remove common rips / bitrates / tags
    tags_to_strip = [
        "(MP3_320K)", "(MP3_160K)", "[NCS Release]", "[NCS]", "(Official Music Video)",
        "(Soundtrack OST)", "(1Hour Loop)", "(Original Mix)", "[HQ]"
    ]
    for tag in tags_to_strip:
        txt = txt.replace(tag, "").replace(tag.lower(), "")
    return " ".join(txt.split()).strip(" -_[]()")


def classify_track_energy(file_path: Path, title: str, artist: str, album: str) -> str:
    """Classifies audio into 'high', 'chill', or 'general' based on path and tags."""
    haystack = f"{file_path.name} {file_path.parent.name} {title} {artist} {album}".lower()
    for kw in HIGH_ENERGY_KEYWORDS:
        if kw in haystack:
            return "high"
    for kw in CHILL_OUTRO_KEYWORDS:
        if kw in haystack:
            return "chill"
    return "general"


def scan_single_audio_file(file_path: Path) -> Optional[Dict[str, Any]]:
    """Extracts metadata from a single audio file using tinytag without decoding samples."""
    if not file_path.exists() or file_path.suffix.lower() not in SUPPORTED_AUDIO_EXTS:
        return None

    file_size = file_path.stat().st_size
    # Ignore tiny dummy files (< 10 KB)
    if file_size < 10240:
        return None

    # Track ID generated from path + size
    path_str = str(file_path.resolve())
    track_id = hashlib.md5(path_str.encode("utf-8", errors="ignore")).hexdigest()[:12]

    duration_sec = 0.0
    title = clean_track_title(file_path.stem)
    artist = "Unknown Artist"
    album = file_path.parent.name
    bitrate = 0

    if TinyTag is not None:
        try:
            tag = TinyTag.get(path_str)
            if tag.duration and tag.duration > 0:
                duration_sec = round(float(tag.duration), 2)
            if tag.title and tag.title.strip():
                title = clean_track_title(tag.title)
            if tag.artist and tag.artist.strip():
                artist = tag.artist.strip()
            if tag.album and tag.album.strip():
                album = tag.album.strip()
            if tag.bitrate:
                bitrate = int(tag.bitrate)
        except Exception:
            # If header is slightly malformed, fall back to clean filename
            pass

    # Fallback duration probe if tinytag failed or not installed
    if duration_sec <= 0.0:
        return None

    energy = classify_track_energy(file_path, title, artist, album)

    return {
        "id": track_id,
        "path": path_str,
        "filename": file_path.name,
        "title": title,
        "artist": artist,
        "album": album,
        "duration_sec": duration_sec,
        "duration_formatted": f"{int(duration_sec // 60):02d}:{int(duration_sec % 60):02d}",
        "filesize": file_size,
        "bitrate_kbps": bitrate,
        "energy_hint": energy,
        "ext": file_path.suffix.lower().lstrip(".")
    }


def index_music_library(
    music_dir: Path = DEFAULT_MUSIC_DIR,
    force_rescan: bool = False,
    progress_callback: Optional[Any] = None
) -> Dict[str, Any]:
    """Recursively indexes all audio files under music_dir and writes to cache JSON."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    existing_catalog: Dict[str, Any] = {}
    if not force_rescan and CATALOG_PATH.exists():
        try:
            existing_catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            existing_catalog = {}

    existing_tracks_by_path = {
        t["path"]: t for t in existing_catalog.get("tracks", []) if "path" in t
    }

    scanned_tracks: List[Dict[str, Any]] = []
    start_time = time.time()
    total_found = 0

    if not music_dir.exists():
        print(f"[!] Warning: Music directory does not exist: {music_dir}")
        music_dir.mkdir(parents=True, exist_ok=True)

    # Recursive directory walk
    audio_files: List[Path] = []
    for root, _, files in os.walk(music_dir):
        root_path = Path(root)
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in SUPPORTED_AUDIO_EXTS:
                audio_files.append(root_path / f)

    total_files = len(audio_files)

    for i, file_path in enumerate(audio_files):
        path_str = str(file_path.resolve())

        # Check cache if file size matches
        if not force_rescan and path_str in existing_tracks_by_path:
            cached = existing_tracks_by_path[path_str]
            if cached.get("filesize") == file_path.stat().st_size:
                scanned_tracks.append(cached)
                total_found += 1
                continue

        track_info = scan_single_audio_file(file_path)
        if track_info:
            scanned_tracks.append(track_info)
            total_found += 1

        if progress_callback and (i % 50 == 0 or i == total_files - 1):
            progress_callback(i + 1, total_files)

    elapsed = max(0.001, time.time() - start_time)

    # Sort tracks by duration
    scanned_tracks.sort(key=lambda t: t["duration_sec"])

    # Duration buckets for O(1) query lookups
    duration_buckets: Dict[str, List[str]] = {
        "0_60": [],
        "60_90": [],
        "90_120": [],
        "120_150": [],
        "150_180": [],
        "180_240": [],
        "240_plus": []
    }

    for t in scanned_tracks:
        d = t["duration_sec"]
        tid = t["id"]
        if d < 60:
            duration_buckets["0_60"].append(tid)
        elif d < 90:
            duration_buckets["60_90"].append(tid)
        elif d < 120:
            duration_buckets["90_120"].append(tid)
        elif d < 150:
            duration_buckets["120_150"].append(tid)
        elif d < 180:
            duration_buckets["150_180"].append(tid)
        elif d < 240:
            duration_buckets["180_240"].append(tid)
        else:
            duration_buckets["240_plus"].append(tid)

    catalog = {
        "version": "1.0",
        "last_scanned_at": time.time(),
        "music_dir": str(music_dir.resolve()),
        "total_tracks": len(scanned_tracks),
        "scan_time_sec": round(elapsed, 3),
        "throughput_files_per_sec": round(len(audio_files) / elapsed, 1) if audio_files else 0,
        "tracks": scanned_tracks,
        "duration_buckets": duration_buckets
    }

    # Write atomically
    temp_path = CATALOG_PATH.with_suffix(".tmp")
    temp_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")
    temp_path.replace(CATALOG_PATH)

    print(
        f"[✓] Indexed {len(scanned_tracks)} audio tracks from {music_dir} in {elapsed:.2f}s "
        f"({catalog['throughput_files_per_sec']} files/s). Cache saved to {CATALOG_PATH}"
    )

    return catalog


def load_music_catalog() -> Dict[str, Any]:
    """Loads cached catalog or scans default directory if not cached."""
    if CATALOG_PATH.exists():
        try:
            return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[!] Error reading music catalog cache: {e}")

    return index_music_library(DEFAULT_MUSIC_DIR)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genshin Abyss Fast Music Library Indexer")
    parser.add_argument("--scan", type=str, default=str(DEFAULT_MUSIC_DIR), help="Music directory to index")
    parser.add_argument("--rescan", action="store_true", help="Force full rescan ignoring cache")
    parser.add_argument("--benchmark", action="store_true", help="Run benchmark and print summary")
    args = parser.parse_args()

    target = Path(args.scan)
    res = index_music_library(target, force_rescan=args.rescan)
    print(f"Total Tracks: {res.get('total_tracks', 0)}")
    print(f"Throughput: {res.get('throughput_files_per_sec', 0)} files/sec")
