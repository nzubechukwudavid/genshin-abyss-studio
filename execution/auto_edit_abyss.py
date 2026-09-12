"""
Automated Genshin Abyss Video Editor & CapCut Project Synthesizer
DOE-VERSION: 2026.09.11

Automates the assembly of a 4-file Abyss run into a production-ready CapCut project:
1. Detects raw screen recordings (Chamber 1, Chamber 2, Chamber 3, Builds)
2. Analyzes in-game boundaries and trims dead time / mid-chamber loading screens
3. Synthesizes a 16:9 CapCut project with 7 cuts, 6 Woosh transitions, and looping OST audio
4. Computes exact YouTube Chapter timestamps and syncs with Thumbnail Studio
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import cv2
import numpy as np

# Ensure Windows stdout handles utf-8 safely
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Adjust path to import capcut schema
sys.path.insert(0, str(Path(__file__).resolve().parent))
from capcut_template_schema import CapCutDraftBuilder, get_capcut_drafts_dir

def get_default_recordings_dir() -> Path:
    """Intelligently detects the active folder containing screen recordings."""
    desktop = Path.home() / "Desktop"
    candidates = [
        desktop / "ScreenRecorder",
        desktop / "saved screen recording",
        desktop / "Screen Recorder",
        desktop / "Captures",
        Path.home() / "Videos" / "Captures",
        Path.home() / "Videos"
    ]
    best_dir = None
    best_mtime = -1.0
    for d in candidates:
        if d.exists() and d.is_dir():
            mp4s = [f for f in d.glob("*.mp4") if not f.name.startswith("._")]
            if mp4s:
                latest_f = max(mp4s, key=lambda f: f.stat().st_mtime)
                if latest_f.stat().st_mtime > best_mtime:
                    best_mtime = latest_f.stat().st_mtime
                    best_dir = d
    if best_dir:
        return best_dir
    return desktop / "ScreenRecorder"

DEFAULT_INPUT_DIR = get_default_recordings_dir()
DEFAULT_DOWNLOADS_DIR = Path.home() / "Downloads"
CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CHAPTERS_SYNC_FILE = CACHE_DIR / "latest_abyss_chapters.json"


def get_mp3_duration(file_path: Path) -> float:
    """Reads audio duration in seconds using tinytag or standard library MP3 header parsing."""
    try:
        from tinytag import TinyTag
        tag = TinyTag.get(str(file_path))
        if tag.duration and tag.duration > 0:
            return round(float(tag.duration), 2)
    except Exception:
        pass

    try:
        size = file_path.stat().st_size
        with open(file_path, "rb") as f:
            header = f.read(10)
            offset = 0
            if header[:3] == b"ID3":
                tag_size = (
                    ((header[6] & 0x7F) << 21) |
                    ((header[7] & 0x7F) << 14) |
                    ((header[8] & 0x7F) << 7) |
                    (header[9] & 0x7F)
                )
                offset = 10 + tag_size
                f.seek(offset)

            bitrates = {
                1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
            }
            buf = f.read(4096)
            for i in range(len(buf) - 4):
                if buf[i] == 0xFF and (buf[i+1] & 0xE0) == 0xE0:
                    b1 = buf[i+1]
                    b2 = buf[i+2]
                    version = (b1 >> 3) & 0x03
                    layer = (b1 >> 1) & 0x03
                    bitrate_idx = (b2 >> 4) & 0x0F
                    if version == 3 and layer == 1 and bitrate_idx in range(1, 15):
                        kbps = bitrates[1][bitrate_idx]
                        audio_bytes = size - offset
                        return (audio_bytes * 8) / (kbps * 1000)
    except Exception as e:
        print(f"[!] Warning reading audio header ({e}), using default duration", flush=True)
    return 203.6


THUMBNAILS_CACHE_DIR = CACHE_DIR / "thumbnails"
THUMBNAILS_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def parse_filename_time(filename: str):
    """Extracts timestamp from Screenrecorder-YYYY-MM-DD-HH-MM-SS-MS.mp4."""
    import re, datetime
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})", filename)
    if m:
        try:
            return datetime.datetime(*[int(x) for x in m.groups()])
        except Exception:
            pass
    return None


def get_or_create_thumbnail(video_path: Path, seek_s: float = 22.0, width: int = 160, height: int = 90) -> Path:
    """Extracts and caches a 16:9 thumbnail from the video."""
    thumb_path = THUMBNAILS_CACHE_DIR / f"{video_path.stem}.jpg"
    if thumb_path.exists() and thumb_path.stat().st_mtime >= video_path.stat().st_mtime:
        return thumb_path

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return thumb_path

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    dur_s = frame_count / fps if fps > 0 else 0
    pos_s = min(seek_s, max(5.0, dur_s * 0.25))
    cap.set(cv2.CAP_PROP_POS_MSEC, int(pos_s * 1000))

    ret, frame = cap.read()
    cap.release()

    if ret:
        resized = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(thumb_path), resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    return thumb_path


def cluster_recording_sessions(input_dir: Path, min_duration: float = 35.0) -> List[Dict]:
    """Clusters screen recordings into chronological sessions separated by > 25 mins."""
    import datetime
    if not input_dir.exists():
        return []
    mp4_files = sorted(
        [f for f in input_dir.glob("*.mp4") if not f.name.startswith("._")],
        key=lambda x: x.name
    )
    items = []
    for f in mp4_files:
        dt = parse_filename_time(f.name)
        if not dt:
            dt = datetime.datetime.fromtimestamp(f.stat().st_mtime)
        try:
            dur_s, _, _, _ = probe_video_metadata(f)
        except Exception:
            dur_s = 0.0
        if dur_s < min_duration:
            continue
        items.append({"path": f, "dt": dt, "dur_s": dur_s})

    items.sort(key=lambda x: x["dt"])
    sessions = []
    curr = []
    for it in items:
        if not curr:
            curr.append(it)
        else:
            diff = (it["dt"] - curr[-1]["dt"]).total_seconds()
            if diff <= 1500:  # 25 mins
                curr.append(it)
            else:
                sessions.append(curr)
                curr = [it]
    if curr:
        sessions.append(curr)

    result = []
    for s in sessions:
        start_fmt = s[0]["dt"].strftime("%b %d, %I:%M %p")
        end_fmt = s[-1]["dt"].strftime("%I:%M %p")
        label = f"{start_fmt} - {end_fmt} ({len(s)} clips)"
        result.append({
            "label": label,
            "clips": [c["path"] for c in s],
            "start_dt": s[0]["dt"]
        })
    # Return latest session first
    result.sort(key=lambda x: x["start_dt"], reverse=True)
    return result


def find_latest_screen_recordings(input_dir: Path, count: int = 4) -> List[Path]:
    """Finds valid screen recording mp4 files from the latest session or folder."""
    sessions = cluster_recording_sessions(input_dir)
    if sessions:
        latest = sessions[0]["clips"]
        if len(latest) >= count:
            return latest[-count:]
        return latest

    if not input_dir.exists():
        return []
    mp4_files = sorted(
        [f for f in input_dir.glob("*.mp4") if not f.name.startswith("._")],
        key=lambda x: x.name
    )
    valid = []
    for f in mp4_files:
        try:
            if f.stat().st_size > 70 * 1024 * 1024:
                valid.append(f)
        except Exception:
            pass
    return valid[-count:] if len(valid) >= count else valid


def find_default_music_track() -> Optional[Path]:
    """Searches for common OST tracks in Downloads or music directories."""
    candidates = list(DEFAULT_DOWNLOADS_DIR.glob("*Adrenaline*.mp3")) + \
                 list(DEFAULT_DOWNLOADS_DIR.glob("*.mp3")) + \
                 list((Path.home() / "Music").glob("*.mp3"))
    if candidates:
        return candidates[0]
    return None


def probe_video_metadata(video_path: Path) -> Tuple[float, int, int, int]:
    """Returns (duration_seconds, width, height, total_frames) with cache support."""
    meta_cache_file = CACHE_DIR / "video_metadata_cache.json"
    cache_key = f"{video_path.name}_{int(video_path.stat().st_mtime)}_{video_path.stat().st_size}"
    if meta_cache_file.exists():
        try:
            c = json.loads(meta_cache_file.read_text(encoding="utf-8"))
            if cache_key in c:
                item = c[cache_key]
                return float(item["dur"]), int(item["w"]), int(item["h"]), int(item["frames"])
        except Exception:
            pass

    cap = cv2.VideoCapture(str(video_path), cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 60.0
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 2712)
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1220)
    cap.release()
    dur_s = frames / fps if frames > 0 else 0.0

    try:
        data = {}
        if meta_cache_file.exists():
            data = json.loads(meta_cache_file.read_text(encoding="utf-8"))
        data[cache_key] = {"dur": dur_s, "w": w, "h": h, "frames": frames}
        meta_cache_file.write_text(json.dumps(data), encoding="utf-8")
    except Exception:
        pass

    return dur_s, w, h, frames


def detect_chamber_intermission(video_path: Path, dur_s: float) -> Tuple[float, float]:
    """
    High-Speed Two-Stage Intermission Detector with Persistent Disk Caching:
    1. Check persistent cache: returns in 0.001s for previously scanned clips.
    2. Focused search window: middle 30% to 75% of clip using fast CAP_PROP_POS_MSEC.
    3. Coarse 3.0s step probe detects black screen frame.
    4. Refines boundaries backwards and forwards in 0.8s steps.
    """
    if dur_s < 30.0:
        return (dur_s * 0.5, dur_s * 0.5)

    inter_cache_file = CACHE_DIR / "intermissions_cache.json"
    cache_key = f"{video_path.name}_{int(video_path.stat().st_mtime)}_{video_path.stat().st_size}"
    if inter_cache_file.exists():
        try:
            ic = json.loads(inter_cache_file.read_text(encoding="utf-8"))
            if cache_key in ic:
                cached_cut = ic[cache_key]
                return (float(cached_cut["start"]), float(cached_cut["end"]))
        except Exception:
            pass

    cap = cv2.VideoCapture(str(video_path), cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap = cv2.VideoCapture(str(video_path))

    # Search realistic clearing window (30% to 75% of video)
    search_start = max(15.0, dur_s * 0.30)
    search_end = min(dur_s - 10.0, dur_s * 0.75)

    step_s = 3.0
    cur_t = search_start
    found_inside = None
    min_brightness = 999.0
    min_t = dur_s * 0.5

    while cur_t <= search_end:
        cap.set(cv2.CAP_PROP_POS_MSEC, cur_t * 1000.0)
        ret, frame = cap.read()
        if ret:
            m = float(cv2.resize(frame, (40, 20)).mean())
            if m < min_brightness:
                min_brightness = m
                min_t = cur_t
            if m < 4.0:  # Abyss black loading screen
                found_inside = cur_t
                break
        cur_t += step_s

    # Adaptive fallback if high brightness anomalies occurred
    if found_inside is None:
        if min_brightness < 25.0:
            found_inside = min_t
        else:
            cap.release()
            midpoint = dur_s * 0.50
            cut_res = (round(midpoint - 2.0, 2), round(midpoint + 2.0, 2))
            try:
                ic_data = {}
                if inter_cache_file.exists():
                    ic_data = json.loads(inter_cache_file.read_text(encoding="utf-8"))
                ic_data[cache_key] = {"start": cut_res[0], "end": cut_res[1]}
                inter_cache_file.write_text(json.dumps(ic_data), encoding="utf-8")
            except Exception:
                pass
            return cut_res

    # Refine start boundary (probe backwards in 0.8s steps)
    b_start = found_inside
    for delta in [0.8, 1.6, 2.4, 3.2, 4.0]:
        t_check = found_inside - delta
        if t_check < search_start:
            break
        cap.set(cv2.CAP_PROP_POS_MSEC, t_check * 1000.0)
        ret, frame = cap.read()
        if ret and float(cv2.resize(frame, (40, 20)).mean()) < 6.0:
            b_start = t_check
        else:
            break

    # Refine end boundary (probe forwards in 0.8s steps)
    b_end = found_inside
    for delta in [0.8, 1.6, 2.4, 3.2, 4.0]:
        t_check = found_inside + delta
        if t_check > search_end:
            break
        cap.set(cv2.CAP_PROP_POS_MSEC, t_check * 1000.0)
        ret, frame = cap.read()
        if ret and float(cv2.resize(frame, (40, 20)).mean()) < 6.0:
            b_end = t_check
        else:
            break

    cap.release()

    if (b_end - b_start) < 1.5:
        cut_res = (round(found_inside - 1.5, 2), round(found_inside + 1.5, 2))
    else:
        cut_res = (round(b_start, 2), round(b_end, 2))

    # Save to persistent cache
    try:
        ic_data = {}
        if inter_cache_file.exists():
            ic_data = json.loads(inter_cache_file.read_text(encoding="utf-8"))
        ic_data[cache_key] = {"start": cut_res[0], "end": cut_res[1]}
        inter_cache_file.write_text(json.dumps(ic_data), encoding="utf-8")
    except Exception:
        pass

    return cut_res



def format_timestamp(seconds: float) -> str:
    """Formats seconds into MM:SS format."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def push_chapters_to_cloud(sync_data: dict, cloud_url: str = "https://genshin-abyss-studio.onrender.com", token: str = "abyss-sync-2026", async_mode: bool = True) -> bool:
    """Pushes chapter metadata to the deployed Render server with cold-start resilience.
    Runs in a background daemon thread so it never blocks the GUI or CapCut launch.
    """
    def _do_push():
        try:
            import urllib.request
            endpoint = f"{cloud_url.rstrip('/')}/api/sync-chapters"
            health_endpoint = f"{cloud_url.rstrip('/')}/api/health"

            # 1. Quick probe / wake-up ping for sleeping Render instance (allow 35s timeout)
            try:
                req_health = urllib.request.Request(health_endpoint, headers={"User-Agent": "AbyssEditor/2.0"})
                with urllib.request.urlopen(req_health, timeout=35) as resp:
                    pass
            except Exception:
                pass

            # 2. Authenticated POST with sync payload
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(sync_data).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "X-Sync-Token": token
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=35) as resp:
                if resp.status in (200, 201):
                    dur = sync_data.get("total_duration_formatted", "")
                    print(f"[+] Successfully synced timestamps to cloud web app ({dur}): {endpoint}", flush=True)
                    return True
        except Exception as e:
            print(f"[*] Note: Cloud sync skipped/unavailable ({e})", flush=True)
        return False

    if async_mode:
        import threading
        t = threading.Thread(target=_do_push, daemon=True)
        t.start()
        return True
    else:
        return _do_push()


def is_capcut_running() -> bool:
    """Checks if CapCut.exe process is currently active."""
    try:
        import subprocess
        out = subprocess.check_output('tasklist /FI "IMAGENAME eq CapCut.exe" /NH', shell=True).decode("utf-8", errors="ignore")
        return "CapCut.exe" in out
    except Exception:
        return False


def launch_capcut() -> bool:
    """Finds CapCut.exe and launches it cleanly."""
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        Path(local_appdata) / "CapCut" / "Apps" / "CapCut.exe",
        Path("C:/Program Files/CapCut/CapCut.exe")
    ]
    apps_dir = Path(local_appdata) / "CapCut" / "Apps"
    if apps_dir.exists():
        for p in apps_dir.glob("*/CapCut.exe"):
            candidates.append(p)

    for exe in candidates:
        if exe.exists():
            import subprocess
            subprocess.Popen([str(exe)], shell=False)
            print(f"[+] Launched CapCut: {exe}", flush=True)
            return True
    return False


def list_available_music(downloads_dir: Optional[Path] = None) -> List[Path]:
    """Scans and returns available audio files in Downloads or custom folder."""
    d = downloads_dir or DEFAULT_DOWNLOADS_DIR
    audio_files = []
    if d.exists():
        for ext in ("*.mp3", "*.wav", "*.m4a", "*.aac"):
            audio_files.extend(list(d.glob(ext)))
    return sorted(audio_files, key=lambda f: f.stat().st_mtime, reverse=True)


def assemble_abyss_project(
    chamber_files: List[Path],
    builds_file: Optional[Path] = None,
    music_file: Optional[Path] = None,
    transition_type: str = "black_fade",
    music_volume: float = 0.10,
    project_name: str = "Abyss Floor 12 Run (Auto-Edited)",
    side1_name: str = "Mavuika OVERLOAD",
    side2_name: str = "Chasca LUNAR HEX OVERVAPE",
    patch_ver: str = "7.0",
    sync_to_cloud: bool = True,
    auto_launch: bool = False
) -> Dict:
    """
    Main orchestration function:
    1. Analyzes cuts
    2. Builds CapCut PC draft with chosen transitions and audio
    3. Calculates YouTube chapters and pushes to local cache & Render cloud
    """
    print(f"[*] Starting Auto-Edit Pipeline for: {project_name}")
    print(f"[*] Input Chambers: {[f.name for f in chamber_files]}")
    if builds_file:
        print(f"[*] Input Builds Showcase: {builds_file.name}")
    print(f"[*] Transition Style: {transition_type.upper()}")
    print(f"[*] Music Volume: {int(music_volume * 100)}%")

    builder = CapCutDraftBuilder(project_name=project_name, width=1920, height=1080, fps=30.0)

    # Register videos and calculate segments
    segments_plan = []
    video_mat_ids = {}

    all_files = list(chamber_files)
    if builds_file:
        all_files.append(builds_file)

    for vf in all_files:
        dur_s, w, h, _ = probe_video_metadata(vf)
        v_mat_id = builder.add_video_material(str(vf), int(dur_s * 1_000_000), width=w, height=h)
        video_mat_ids[str(vf)] = (v_mat_id, dur_s, w, h)

    # Process Chamber 1, 2, 3
    for ch_idx, ch_file in enumerate(chamber_files):
        ch_num = ch_idx + 1
        v_mat_id, dur_s, w, h = video_mat_ids[str(ch_file)]

        # Detect intermission black screen
        inter_start, inter_end = detect_chamber_intermission(ch_file, dur_s)
        print(f"[*] Chamber {ch_num} ({dur_s:.1f}s): Intermission cut at {inter_start:.2f}s - {inter_end:.2f}s (trimmed {inter_end - inter_start:.2f}s)")

        # Side 1
        side1_start = 0.0
        side1_dur = inter_start - side1_start
        segments_plan.append({
            "chamber": f"{ch_num}-1",
            "side": 1,
            "label": f"Chamber {ch_num}-1 ({side1_name})" if side1_name else f"Chamber {ch_num}-1",
            "material_id": v_mat_id,
            "src_start_s": side1_start,
            "duration_s": side1_dur,
            "has_transition": True
        })

        # Side 2
        side2_start = inter_end
        # Trim last ~4.5s for phone notification drawer pull-down
        end_trim = 4.5 if dur_s > (inter_end + 15.0) else 1.0
        side2_end = max(side2_start + 5.0, dur_s - end_trim)
        side2_dur = side2_end - side2_start
        segments_plan.append({
            "chamber": f"{ch_num}-2",
            "side": 2,
            "label": f"Chamber {ch_num}-2 ({side2_name})" if side2_name else f"Chamber {ch_num}-2",
            "material_id": v_mat_id,
            "src_start_s": side2_start,
            "duration_s": side2_dur,
            "has_transition": True
        })

    # Process Builds showcase
    if builds_file:
        v_mat_id, dur_s, w, h = video_mat_ids[str(builds_file)]
        builds_end = max(5.0, dur_s - 2.5)
        segments_plan.append({
            "chamber": "builds",
            "side": None,
            "label": "Character Builds, Weapons & Artifacts",
            "material_id": v_mat_id,
            "src_start_s": 0.0,
            "duration_s": builds_end,
            "has_transition": False  # last segment
        })

    # Add segments to CapCut builder
    for seg in segments_plan:
        trans = transition_type if seg["has_transition"] else "none"
        builder.add_video_segment(
            material_id=seg["material_id"],
            source_start_s=seg["src_start_s"],
            duration_s=seg["duration_s"],
            volume=0.10,
            transition=trans
        )

    # Add background music (Multi-Track Smart BGM or Single Looping Track)
    total_video_dur_us = sum(int(s["duration_s"] * 1_000_000) for s in segments_plan)
    bgm_suite_cache = CACHE_DIR / "active_bgm_suite.json"
    smart_suite_applied = False
    suite_data = None

    if bgm_suite_cache.exists():
        try:
            suite_data = json.loads(bgm_suite_cache.read_text(encoding="utf-8"))
        except Exception:
            suite_data = None

    # If no cached selection, auto-match from indexed library on the fly!
    if not suite_data or not any(suite_data):
        try:
            from execution.music_recommender import recommend_bgm_suite
            ch_durs = []
            for i in range(0, min(6, len(segments_plan)), 2):
                d = segments_plan[i]["duration_s"]
                if i + 1 < len(segments_plan):
                    d += segments_plan[i + 1]["duration_s"]
                ch_durs.append(d)
            b_dur = segments_plan[6]["duration_s"] if len(segments_plan) > 6 else 90.0
            rec_res = recommend_bgm_suite(ch_durs, builds_duration=b_dur)
            assigns = rec_res.get("assignments", {})
            suite_data = [
                assigns.get("chamber_1", {}).get("selected"),
                assigns.get("chamber_2", {}).get("selected"),
                assigns.get("chamber_3", {}).get("selected"),
                assigns.get("builds", {}).get("selected")
            ]
        except Exception as e:
            print(f"[!] Auto-recommendation note: {e}")

    if suite_data and isinstance(suite_data, list) and any(suite_data):
        try:
            print("[*] Applying Tailored Multi-Track Smart BGM Suite into CapCut Timeline...")
            timeline_pos_s = 0.0
            ch_idx = 0
            for i in range(0, min(6, len(segments_plan)), 2):
                ch_dur = segments_plan[i]["duration_s"]
                if i + 1 < len(segments_plan):
                    ch_dur += segments_plan[i + 1]["duration_s"]

                if ch_idx < len(suite_data) and suite_data[ch_idx]:
                    trk = suite_data[ch_idx]
                    trk_path = Path(trk["path"])
                    if trk_path.exists():
                        trk_dur_s = float(trk.get("duration_sec") or get_mp3_duration(trk_path))
                        file_dur_us = int(trk_dur_s * 1_000_000)
                        in_pt = trk.get("in_point_sec", 0.0)
                        a_mat_id = builder.add_audio_material(str(trk_path), file_dur_us)
                        builder.add_bgm_segment(
                            audio_material_id=a_mat_id,
                            target_start_s=timeline_pos_s,
                            duration_s=ch_dur,
                            source_start_s=in_pt,
                            volume=trk.get("volume_gain", 0.22),
                            fade_out_s=trk.get("fade_out_sec", 1.5)
                        )
                        print(f"    - Chamber {ch_idx + 1} BGM: {trk.get('title', trk_path.name)} ({ch_dur:.1f}s)")
                timeline_pos_s += ch_dur
                ch_idx += 1

            # Add builds track if available
            if len(segments_plan) > 6 and len(suite_data) >= 4 and suite_data[3]:
                builds_seg = segments_plan[6]
                b_dur = builds_seg["duration_s"]
                trk = suite_data[3]
                trk_path = Path(trk["path"])
                if trk_path.exists():
                    trk_dur_s = float(trk.get("duration_sec") or get_mp3_duration(trk_path))
                    file_dur_us = int(trk_dur_s * 1_000_000)
                    a_mat_id = builder.add_audio_material(str(trk_path), file_dur_us)
                    builder.add_bgm_segment(
                        audio_material_id=a_mat_id,
                        target_start_s=timeline_pos_s,
                        duration_s=b_dur,
                        source_start_s=trk.get("in_point_sec", 0.0),
                        volume=trk.get("volume_gain", 0.25),
                        fade_out_s=1.5
                    )
                    print(f"    - Character Builds Outro BGM: {trk.get('title', trk_path.name)} ({b_dur:.1f}s)")
            smart_suite_applied = True
        except Exception as e:
            print(f"[!] Warning: Could not apply smart BGM suite: {e}")

    # Fallback to single manual track if smart suite was not applied
    if not smart_suite_applied and music_file and music_file.exists():
        print(f"[*] Adding Looping Background Music: {music_file.name}")
        audio_dur_s = get_mp3_duration(music_file)
        print(f"[*] Detected Audio Duration: {audio_dur_s:.2f}s", flush=True)

        audio_mat_id = builder.add_audio_material(str(music_file), int(audio_dur_s * 1_000_000))
        builder.add_looping_audio(audio_mat_id, int(audio_dur_s * 1_000_000), total_video_dur_us, volume=music_volume)

    # Save project into CapCut drafts folder
    project_folder = builder.save_to_capcut()
    print(f"[+] CapCut Project Successfully Generated: {project_folder}")

    # Generate project thumbnail cover image from Chamber 1
    cover_path = project_folder / "draft_cover.jpg"
    if chamber_files and not cover_path.exists():
        try:
            cap_cov = cv2.VideoCapture(str(chamber_files[0]))
            cap_cov.set(cv2.CAP_PROP_POS_MSEC, 15000)
            ret_cov, f_cov = cap_cov.read()
            if ret_cov:
                cv2.imwrite(str(cover_path), f_cov)
            cap_cov.release()
        except Exception:
            pass

    # Calculate YouTube Chapter Timestamps & Structured Temporal Segments
    segments = []
    chapters = []
    cumulative_s = 0.0
    for idx, seg in enumerate(segments_plan):
        ts_str = format_timestamp(cumulative_s)
        seg_id = f"c{seg['chamber'].replace('-', '_')}"
        segments.append({
            "id": seg_id,
            "chamber": seg["chamber"],
            "side": seg.get("side"),
            "time": ts_str,
            "seconds": round(cumulative_s, 3),
            "duration_s": round(seg["duration_s"], 3),
            "label": seg["label"]
        })
        chapters.append({
            "timestamp": ts_str,
            "seconds": round(cumulative_s, 3),
            "title": seg["label"]
        })
        cumulative_s += seg["duration_s"]

    # Format description chapter block
    chapter_text = "\n".join([f"{c['timestamp']} - {c['title']}" for c in chapters])

    # Sync to cache for Thumbnail Studio
    sync_data = {
        "version": "2.0",
        "project_name": project_name,
        "capcut_folder": str(project_folder),
        "total_duration_s": round(cumulative_s, 3),
        "total_duration_formatted": format_timestamp(cumulative_s),
        "segments": segments,
        "chapters": chapters,
        "chapter_text": chapter_text,
        "side1_name": side1_name,
        "side2_name": side2_name,
        "transition_type": transition_type,
        "patch": patch_ver,
        "created_at": time.time()
    }
    CHAPTERS_SYNC_FILE.write_text(json.dumps(sync_data, indent=2), encoding="utf-8")

    # Cloud Sync to Render
    if sync_to_cloud:
        push_chapters_to_cloud(sync_data)

    print("\n" + "=" * 55, flush=True)
    print("[+] YOUTUBE CHAPTER TIMESTAMPS (Ready for YouTube Studio):", flush=True)
    print("=" * 55, flush=True)
    print(chapter_text, flush=True)
    print("=" * 55 + "\n", flush=True)

    if auto_launch:
        launch_capcut()

    return sync_data


def main():
    parser = argparse.ArgumentParser(description="Automated Genshin Abyss Video Editor for CapCut PC")
    parser.add_argument("--files", nargs="*", default=None, help="Explicit list of video files (Chamber 1, Chamber 2, Chamber 3, [Builds])")
    parser.add_argument("--input-dir", type=str, default=str(DEFAULT_INPUT_DIR), help="Directory with raw screen recordings")
    parser.add_argument("--music", type=str, default="", help="Path to background music file")
    parser.add_argument("--volume", type=float, default=0.10, help="Music volume (0.0 to 1.0, default 0.10)")
    parser.add_argument("--transition", type=str, default="black_fade", choices=["black_fade", "woosh", "none"], help="Transition effect style")
    parser.add_argument("--project-name", type=str, default="Abyss Floor 12 Run (Auto-Edited)", help="CapCut project name")
    parser.add_argument("--side1", type=str, default="", help="Side 1 carry/archetype name (optional, dynamic in Thumbnail Studio)")
    parser.add_argument("--side2", type=str, default="", help="Side 2 carry/archetype name (optional, dynamic in Thumbnail Studio)")
    parser.add_argument("--patch", type=str, default="7.0", help="Abyss patch version (e.g. 7.0)")
    parser.add_argument("--no-cloud", action="store_true", help="Skip pushing chapters to cloud")
    parser.add_argument("--open-capcut", action="store_true", help="Automatically launch CapCut PC after generating")

    args = parser.parse_args()

    if args.files and len(args.files) >= 3:
        recordings = [Path(f) for f in args.files]
    else:
        input_path = Path(args.input_dir)
        recordings = find_latest_screen_recordings(input_path, count=4)
        if len(recordings) < 3:
            print(f"[!] Error: Found only {len(recordings)} mp4 files in {input_path}. Need at least 3 chamber files.")
            sys.exit(1)

    chamber_files = recordings[:3]
    builds_file = recordings[3] if len(recordings) >= 4 else None

    music_file = Path(args.music) if args.music else find_default_music_track()

    assemble_abyss_project(
        chamber_files=chamber_files,
        builds_file=builds_file,
        music_file=music_file,
        transition_type=args.transition,
        music_volume=args.volume,
        project_name=args.project_name,
        side1_name=args.side1,
        side2_name=args.side2,
        patch_ver=args.patch,
        sync_to_cloud=not args.no_cloud,
        auto_launch=args.open_capcut
    )


if __name__ == "__main__":
    main()
