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
import re
import argparse
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any, Union
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

def db_to_linear(db: float) -> float:
    """Converts decibels to CapCut linear amplitude (e.g. 0 dB -> 1.0, -20 dB -> 0.10, -30 dB -> 0.0316)."""
    return round(10.0 ** (db / 20.0), 4)

def linear_to_db(lin: float) -> float:
    """Converts CapCut linear amplitude to decibels."""
    import math
    if lin <= 0.0:
        return -100.0
    return round(20.0 * math.log10(lin), 1)

DEFAULT_CLIP_VOLUME_DB = -20.0   # 0.10 in CapCut
DEFAULT_BGM_VOLUME_DB = -30.0    # 0.0316 in CapCut

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


def cluster_recording_sessions(input_dir: Path, min_duration: float = 3.0, gap_threshold_sec: float = 5400.0) -> List[Dict]:
    """Clusters screen recordings into chronological sessions separated by > 90 mins (< 15ms total)."""
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
        dur_s = fast_mp4_duration(f) or 0.0
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
            if diff <= gap_threshold_sec:  # 90 mins (5400s allows breaks between chambers)
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
            "start_dt": s[0]["dt"],
            "time_formatted": start_fmt
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


def fast_mp4_duration(filepath: Path) -> Optional[float]:
    """Reads MP4 duration from mvhd atom in binary mode (< 1ms) without launching subprocesses or OpenCV."""
    import struct
    try:
        with open(filepath, 'rb') as f:
            while True:
                header = f.read(8)
                if len(header) < 8:
                    break
                size = struct.unpack('>I', header[:4])[0]
                box_type = header[4:8]
                if size == 1:
                    size = struct.unpack('>Q', f.read(8))[0] - 8
                if box_type == b'moov':
                    continue
                if box_type == b'mvhd':
                    version = struct.unpack('>B', f.read(1))[0]
                    f.read(3)  # flags
                    if version == 0:
                        f.read(8)  # creation & mod time
                        timescale, duration = struct.unpack('>II', f.read(8))
                    else:
                        f.read(16)
                        timescale = struct.unpack('>I', f.read(4))[0]
                        duration = struct.unpack('>Q', f.read(8))[0]
                    if timescale > 0:
                        return duration / timescale
                    break
                if size == 0:
                    break
                f.seek(size - 8, os.SEEK_CUR)
    except Exception:
        pass
    return None

def probe_video_metadata(video_path: Path) -> Tuple[float, int, int, int]:
    """Returns (duration_seconds, width, height, total_frames) with cache and fast-parser support."""
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

    # Inspect real video stream dimensions and framerate via OpenCV (< 5ms)
    cap = cv2.VideoCapture(str(video_path), cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 60.0
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920)
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080)
    cap.release()

    # Fast pure-python header duration inspection if available
    fast_dur = fast_mp4_duration(video_path)
    if fast_dur is not None and fast_dur > 0:
        dur_s = float(fast_dur)
    else:
        dur_s = frames / fps if frames > 0 else 0.0

    if frames == 0 and dur_s > 0:
        frames = int(dur_s * fps)

    try:
        data = {}
        if meta_cache_file.exists():
            data = json.loads(meta_cache_file.read_text(encoding="utf-8"))
        data[cache_key] = {"dur": dur_s, "w": w, "h": h, "frames": frames}
        meta_cache_file.write_text(json.dumps(data), encoding="utf-8")
    except Exception:
        pass

    return dur_s, w, h, frames


class IntermissionResult:
    """Encapsulates detected chamber intermission boundaries with tuple and dict backwards compatibility."""
    def __init__(self, start_s: float, end_s: float, dur_s: float, confidence: float = 0.95, screen_type: str = "dark"):
        self.start_s = round(float(start_s), 2)
        self.end_s = round(float(end_s), 2)
        self.h1_dur = max(0.0, self.start_s)
        self.h2_dur = max(0.0, round(float(dur_s) - self.end_s, 2))
        self.trimmed = max(0.0, round(self.end_s - self.start_s, 2))
        self.confidence = float(confidence)
        self.screen_type = str(screen_type)

    def __iter__(self):
        # Allows `inter_start, inter_end = detect_chamber_intermission(...)`
        return iter((self.start_s, self.end_s))

    def __getitem__(self, item):
        # Allows `c["h1_dur"]`, `c["h2_dur"]`, `c[0]`, `c[1]`
        if isinstance(item, int):
            return (self.start_s, self.end_s)[item]
        if hasattr(self, item):
            return getattr(self, item)
        raise KeyError(item)

    @property
    def start(self) -> float:
        return self.start_s

    @property
    def end(self) -> float:
        return self.end_s

    @property
    def dur(self) -> float:
        return self.trimmed

    def __len__(self):
        return 2

    def to_dict(self) -> dict:
        return {
            "start_s": self.start_s,
            "end_s": self.end_s,
            "h1_dur": self.h1_dur,
            "h2_dur": self.h2_dur,
            "trimmed": self.trimmed,
            "confidence": self.confidence,
            "screen_type": self.screen_type
        }


def classify_frame_loading_state(frame: np.ndarray, prev_thumb: Optional[np.ndarray] = None) -> Tuple[bool, Optional[str], float, np.ndarray]:
    """
    Unified Bi-Modal Frame Classifier (Daytime White & Nighttime Dark loading screens).
    Analyzes downsampled frame luminance (mean), spatial variance (std_dev), and inter-frame motion.
    Spatial standard deviation filtering cleanly rejects combat flashes and elemental burst spikes.

    Returns:
        (is_loading: bool, screen_type: Optional[str], confidence: float, thumb: np.ndarray)
    """
    if frame is None or frame.size == 0:
        return False, None, 0.0, np.zeros((36, 64), dtype=np.uint8)

    thumb = cv2.resize(frame, (64, 36))
    if len(thumb.shape) == 3:
        gray = cv2.cvtColor(thumb, cv2.COLOR_BGR2GRAY)
    else:
        gray = thumb

    mean_lum = float(gray.mean())
    std_dev = float(gray.std())

    motion_diff = 0.0
    if prev_thumb is not None:
        motion_diff = float(np.abs(gray.astype(float) - prev_thumb.astype(float)).mean())

    # 1. Dark / Night Loading Screen (deep charcoal #14141a with glowing center icons or pitch-black cut)
    # Standard dark loading screen: mean_lum in [8.0, 35.0] with flat spatial background (std_dev <= 25.0)
    # Pitch-black transition: mean_lum < 8.0
    if (mean_lum <= 35.0 and std_dev <= 25.0) or (mean_lum <= 8.0):
        if prev_thumb is not None and motion_diff > 4.0:
            return False, None, 0.0, gray
        conf = 0.96 if std_dev <= 18.0 else 0.85
        return True, "dark", conf, gray

    # 2. White / Day Loading Screen (bright cream/off-white background with dark central icons)
    # mean_lum >= 165.0 with uniform background (std_dev <= 32.0)
    if mean_lum >= 165.0 and std_dev <= 32.0:
        if prev_thumb is not None and motion_diff > 4.0:
            return False, None, 0.0, gray
        conf = 0.96 if std_dev <= 22.0 else 0.85
        return True, "white", conf, gray

    return False, None, 0.0, gray

def is_challenge_completed_banner(frame: np.ndarray) -> bool:
    """Detects the 'Challenge Completed' banner dialog at the end of a floor chamber."""
    if frame is None or frame.size == 0:
        return False
    h, w = frame.shape[:2]
    gray_full = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    # The victory screen darkens the entire arena background to <= 35 mean luminance
    if gray_full.mean() > 35.0:
        return False
    banner_roi = gray_full[int(h * 0.15):int(h * 0.35), int(w * 0.35):int(w * 0.65)]
    if banner_roi.size == 0:
        return False
    bright = (banner_roi > 180).sum()
    ratio = bright / banner_roi.size
    return ratio > 0.035


def detect_chamber_intermission(video_path: Path, dur_s: float) -> IntermissionResult:
    """
    High-Speed Two-Stage Unified Bi-Modal Intermission Detector with Persistent Disk Caching:
    1. Check creator manual trim overrides: 100% confidence.
    2. Check persistent cache: sub-millisecond return for scanned clips.
    3. Coarse pass: step through 8.0s to 85% of clip probing bi-modal (dark & white) loading screens.
    4. Temporal verification: confirms state persistence across +0.6s with motion delta < 3.5.
    5. Fine pass: refines transition boundaries backward and forward in 0.2s-0.3s steps.
    """
    if dur_s < 20.0:
        return IntermissionResult(dur_s * 0.5, dur_s * 0.5, dur_s, confidence=0.5, screen_type="dark")

    # 1. Check creator manual trim overrides (highest authority: 100% confidence)
    override_file = CACHE_DIR / "user_trim_overrides.json"
    if override_file.exists():
        try:
            overrides = json.loads(override_file.read_text(encoding="utf-8"))
            if video_path.name in overrides:
                ov = overrides[video_path.name]
                return IntermissionResult(
                    float(ov["start"]),
                    float(ov["end"]),
                    dur_s,
                    confidence=1.0,
                    screen_type=ov.get("screen_type", "manual")
                )
        except Exception:
            pass

    # 2. Check persistent cache
    inter_cache_file = CACHE_DIR / "intermissions_cache.json"
    cache_key = f"{video_path.name}_{int(video_path.stat().st_mtime)}_{video_path.stat().st_size}"
    if inter_cache_file.exists():
        try:
            ic = json.loads(inter_cache_file.read_text(encoding="utf-8"))
            if cache_key in ic:
                cached_cut = ic[cache_key]
                return IntermissionResult(
                    float(cached_cut["start"]), 
                    float(cached_cut["end"]), 
                    dur_s, 
                    confidence=cached_cut.get("confidence", 0.95),
                    screen_type=cached_cut.get("screen_type", "dark")
                )
        except Exception:
            pass

    cap = cv2.VideoCapture(str(video_path), cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap = cv2.VideoCapture(str(video_path))

    # Search window: start early at 8.0s so fast speedrun clears are never missed
    search_start = max(8.0, min(15.0, dur_s * 0.10))
    search_end = min(dur_s - 8.0, dur_s * 0.85)

    step_s = 1.5
    cur_t = search_start
    found_inside = None
    detected_screen_type = "dark"
    detection_confidence = 0.60
    min_brightness = 999.0
    max_brightness = 0.0
    candidate_t = dur_s * 0.5

    while cur_t <= search_end:
        cap.set(cv2.CAP_PROP_POS_MSEC, cur_t * 1000.0)
        ret, frame = cap.read()
        if ret:
            is_load, s_type, conf, thumb1 = classify_frame_loading_state(frame)
            m_val = float(thumb1.mean())
            if m_val < min_brightness:
                min_brightness = m_val
                candidate_t = cur_t
            if m_val > max_brightness:
                max_brightness = m_val

            if is_load:
                # Multi-Signal Verification: Check temporal persistence (+0.6s)
                cap.set(cv2.CAP_PROP_POS_MSEC, (cur_t + 0.6) * 1000.0)
                r2, f2 = cap.read()
                if r2:
                    is_load2, s_type2, conf2, thumb2 = classify_frame_loading_state(f2, prev_thumb=thumb1)
                    if is_load2 and s_type2 == s_type:
                        found_inside = cur_t
                        detected_screen_type = s_type
                        detection_confidence = max(conf, conf2)
                        break
                    elif is_load2:
                        found_inside = cur_t
                        detected_screen_type = s_type
                        detection_confidence = 0.80
                        break
        cur_t += step_s

    # Adaptive fallback if clean threshold was narrowly missed
    if found_inside is None:
        if min_brightness < 38.0:
            found_inside = candidate_t
            detected_screen_type = "dark"
            detection_confidence = 0.70
        elif max_brightness > 160.0:
            found_inside = candidate_t
            detected_screen_type = "white"
            detection_confidence = 0.70
        else:
            cap.release()
            midpoint = dur_s * 0.50
            cut_res = (round(midpoint - 2.0, 2), round(midpoint + 2.0, 2))
            try:
                ic_data = {}
                if inter_cache_file.exists():
                    ic_data = json.loads(inter_cache_file.read_text(encoding="utf-8"))
                ic_data[cache_key] = {
                    "start": cut_res[0],
                    "end": cut_res[1],
                    "confidence": 0.60,
                    "screen_type": "fallback"
                }
                inter_cache_file.write_text(json.dumps(ic_data), encoding="utf-8")
            except Exception:
                pass
            return IntermissionResult(cut_res[0], cut_res[1], dur_s, confidence=0.60, screen_type="fallback")

    # Refine start boundary (probe backwards without artificial search_start restriction)
    b_start = found_inside
    for delta in [0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 7.0, 8.0]:
        t_check = found_inside - delta
        if t_check < 5.0:
            break
        cap.set(cv2.CAP_PROP_POS_MSEC, t_check * 1000.0)
        ret, frame = cap.read()
        if ret:
            is_l, st, _, _ = classify_frame_loading_state(frame)
            if is_l:
                b_start = t_check
            else:
                break
        else:
            break

    # Refine end boundary (probe forwards in steps)
    b_end = found_inside
    for delta in [0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 7.0, 8.0]:
        t_check = found_inside + delta
        if t_check > dur_s - 5.0:
            break
        cap.set(cv2.CAP_PROP_POS_MSEC, t_check * 1000.0)
        ret, frame = cap.read()
        if ret:
            is_l, st, _, _ = classify_frame_loading_state(frame)
            if is_l:
                b_end = t_check
            else:
                break
        else:
            break

    cap.release()

    # Apply 0.30s post-combat transition buffer:
    # Cut Side 1 ~0.3s after the black screen begins so CapCut's 0.25s transition overlap
    # dissolves cleanly during the black screen instead of eating into active combat hits.
    cut_start = round(b_start + 0.30, 2)
    # Start Side 2 ~0.2s before combat starts so transition dissolves smoothly into the arena
    cut_end = round(max(cut_start + 0.50, b_end - 0.20), 2)
    cut_res = (cut_start, cut_end)

    # Save to persistent cache
    try:
        ic_data = {}
        if inter_cache_file.exists():
            ic_data = json.loads(inter_cache_file.read_text(encoding="utf-8"))
        ic_data[cache_key] = {
            "start": cut_res[0],
            "end": cut_res[1],
            "confidence": detection_confidence,
            "screen_type": detected_screen_type
        }
        inter_cache_file.write_text(json.dumps(ic_data), encoding="utf-8")
    except Exception:
        pass

    return IntermissionResult(
        cut_res[0],
        cut_res[1],
        dur_s,
        confidence=detection_confidence,
        screen_type=detected_screen_type
    )

def detect_entry_loading_screen(video_path: Path, dur_s: float, search_window_s: float = 6.0) -> float:
    """
    Detects if a clip begins with a white or dark entry loading screen.
    Advances forward to the clean arena when characters appear. Returns start timestamp in seconds.
    """
    cuts_cache_file = CACHE_DIR / "cuts_cache.json"
    cache_key = f"entry_{video_path.name}_{int(video_path.stat().st_mtime)}_{video_path.stat().st_size}"
    if cuts_cache_file.exists():
        try:
            c = json.loads(cuts_cache_file.read_text(encoding="utf-8"))
            if cache_key in c:
                return float(c[cache_key])
        except Exception:
            pass

    cap = cv2.VideoCapture(str(video_path), cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap = cv2.VideoCapture(str(video_path))

    step_s = 0.25
    cur_t = 0.0
    loading_detected = False
    entry_cut = 0.0

    while cur_t <= min(dur_s, search_window_s):
        cap.set(cv2.CAP_PROP_POS_MSEC, cur_t * 1000.0)
        ret, frame = cap.read()
        if not ret:
            break
        is_loading, _, _, _ = classify_frame_loading_state(frame)
        if is_loading:
            loading_detected = True
        else:
            if loading_detected:
                entry_cut = round(cur_t + 0.2, 2)
                break
            else:
                entry_cut = 0.0
                break
        cur_t += step_s

    cap.release()

    try:
        data = {}
        if cuts_cache_file.exists():
            data = json.loads(cuts_cache_file.read_text(encoding="utf-8"))
        data[cache_key] = entry_cut
        cuts_cache_file.write_text(json.dumps(data), encoding="utf-8")
    except Exception:
        pass

    return entry_cut


def detect_tail_loading_screen(video_path: Path, dur_s: float, search_window_s: float = 14.0) -> float:
    """
    Scans from end of clip to find where the exit loading screen begins
    or preserves the 'Challenge Completed' screen (up to 1.8s) if present.
    """
    cuts_cache_file = CACHE_DIR / "cuts_cache.json"
    cache_key = f"tail_{video_path.name}_{int(video_path.stat().st_mtime)}_{video_path.stat().st_size}"
    if cuts_cache_file.exists():
        try:
            c = json.loads(cuts_cache_file.read_text(encoding="utf-8"))
            if cache_key in c:
                return float(c[cache_key])
        except Exception:
            pass

    cap = cv2.VideoCapture(str(video_path), cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap = cv2.VideoCapture(str(video_path))

    min_search = max(0.0, dur_s - search_window_s)

    # 1. First probe forward from min_search to find if a 'Challenge Completed' banner appears
    banner_start_t = None
    step_check = 0.5
    probe_t = min_search
    while probe_t <= max(0.0, dur_s - 0.2):
        cap.set(cv2.CAP_PROP_POS_MSEC, probe_t * 1000.0)
        ret, frame = cap.read()
        if ret and is_challenge_completed_banner(frame):
            banner_start_t = probe_t
            break
        probe_t += step_check

    # If 'Challenge Completed' banner was found, preserve 1.8s of it
    if banner_start_t is not None:
        target_tail = round(min(dur_s - 0.2, banner_start_t + 2.0), 2)
        cap.release()
        try:
            data = {}
            if cuts_cache_file.exists():
                data = json.loads(cuts_cache_file.read_text(encoding="utf-8"))
            data[cache_key] = target_tail
            cuts_cache_file.write_text(json.dumps(data), encoding="utf-8")
        except Exception:
            pass
        return target_tail

    # 2. Check if the clip actually ends in a true exit loading screen (within last 1.5s)
    cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, dur_s - 0.5) * 1000.0)
    ret_tail, frame_tail = cap.read()
    tail_is_load = False
    if ret_tail:
        tail_is_load, _, _, _ = classify_frame_loading_state(frame_tail)

    if not tail_is_load:
        # Player stopped recording normally right after combat
        # Provide small buffer so the boss defeat is not clipped
        tail_cut = round(max(0.0, dur_s - 0.25), 2)
        cap.release()
        try:
            data = {}
            if cuts_cache_file.exists():
                data = json.loads(cuts_cache_file.read_text(encoding="utf-8"))
            data[cache_key] = tail_cut
            cuts_cache_file.write_text(json.dumps(data), encoding="utf-8")
        except Exception:
            pass
        return tail_cut

    # 3. Clip DOES end in a loading screen: scan backwards to find where it started
    step_s = 0.30
    t = max(0.0, dur_s - 0.5)
    tail_cut = round(max(0.0, dur_s - 3.5), 2)

    while t >= min_search:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000.0)
        ret, frame = cap.read()
        if not ret:
            t -= step_s
            continue
        is_loading, _, _, _ = classify_frame_loading_state(frame)
        if not is_loading:
            # Last frame of gameplay / banner before loading screen began
            tail_cut = round(t + 0.1, 2)
            break
        t -= step_s

    cap.release()

    try:
        data = {}
        if cuts_cache_file.exists():
            data = json.loads(cuts_cache_file.read_text(encoding="utf-8"))
        data[cache_key] = tail_cut
        cuts_cache_file.write_text(json.dumps(data), encoding="utf-8")
    except Exception:
        pass

    return tail_cut


def estimate_chamber_cut_duration(clip_path: Path, is_builds: bool = False) -> float:
    """Estimates the exact post-cut duration of a chamber clip after intermission
    and entry/tail loading screen trims. Uses cached metadata for sub-millisecond execution."""
    if not clip_path or not clip_path.exists():
        return 90.0
    try:
        dur_s, _, _, _ = probe_video_metadata(clip_path)
    except Exception:
        return 90.0

    if is_builds:
        return max(5.0, round(dur_s - 2.5, 2))

    side1_start = detect_entry_loading_screen(clip_path, dur_s)
    inter_start, inter_end = detect_chamber_intermission(clip_path, dur_s)
    side1_dur = max(5.0, inter_start - side1_start)

    side2_start = inter_end
    side2_end = detect_tail_loading_screen(clip_path, dur_s)
    side2_dur = max(5.0, side2_end - side2_start)

    return max(5.0, round(side1_dur + side2_dur, 2))


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
    """Finds CapCut desktop shortcut or CapCut.exe and launches it cleanly on user desktop."""
    # 1. Guard against duplicate instances if CapCut is already active
    if is_capcut_running():
        print("[*] CapCut is already running. Focusing existing instance.", flush=True)
        return True

    local_appdata = os.environ.get("LOCALAPPDATA", "")
    appdata = os.environ.get("APPDATA", "")
    userprofile = os.environ.get("USERPROFILE", "")

    # Priority 1: User Desktop or Start Menu shortcut via os.startfile
    shortcuts = [
        Path(userprofile) / "Desktop" / "CapCut.lnk",
        Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "CapCut" / "CapCut.lnk",
    ]
    for sc in shortcuts:
        if sc.exists():
            try:
                os.startfile(str(sc))
                print(f"[+] Launched CapCut via Shell Shortcut: {sc}", flush=True)
                return True
            except Exception as e:
                print(f"[!] Warning: os.startfile failed on shortcut {sc}: {e}", flush=True)

    # Priority 2: Direct executable in version subfolders (e.g. Apps/1.4.0.198/CapCut.exe)
    apps_dir = Path(local_appdata) / "CapCut" / "Apps"
    candidates = []
    if apps_dir.exists():
        for p in sorted(apps_dir.glob("*/CapCut.exe"), reverse=True):
            candidates.append(p)
    candidates.extend([
        apps_dir / "CapCut.exe",
        Path("C:/Program Files/CapCut/CapCut.exe")
    ])

    for exe in candidates:
        if exe.exists():
            try:
                os.startfile(str(exe))
                print(f"[+] Launched CapCut via os.startfile: {exe}", flush=True)
                return True
            except Exception:
                try:
                    subprocess.Popen([str(exe)], cwd=str(exe.parent), shell=False)
                    print(f"[+] Launched CapCut via subprocess: {exe}", flush=True)
                    return True
                except Exception as err:
                    print(f"[!] Warning: subprocess failed on {exe}: {err}", flush=True)

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
    music_volume: float = 0.0316,
    clip_volume: Optional[float] = 0.10,
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
    target_clip_vol = clip_volume if clip_volume is not None else 0.10
    target_bgm_vol = music_volume if music_volume is not None else 0.0316
    print(f"[*] Starting Auto-Edit Pipeline for: {project_name}")
    print(f"[*] Input Chambers: {[f.name for f in chamber_files]}")
    if builds_file:
        print(f"[*] Input Builds Showcase: {builds_file.name}")
    print(f"[*] Transition Style: {transition_type.upper()}")
    print(f"[*] Audio Levels: Clips = {target_clip_vol:.4f} (-20.0 dB) | BGM = {target_bgm_vol:.4f} (-30.0 dB)")

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

        # Detect entry loading screen and mid-chamber intermission
        side1_start = detect_entry_loading_screen(ch_file, dur_s)
        inter_start, inter_end = detect_chamber_intermission(ch_file, dur_s)
        side2_end = detect_tail_loading_screen(ch_file, dur_s)

        side1_dur = max(5.0, inter_start - side1_start)
        side2_start = inter_end
        side2_dur = max(5.0, side2_end - side2_start)

        print(f"[*] Chamber {ch_num} ({dur_s:.1f}s): Entry cut at {side1_start:.2f}s | Intermission: {inter_start:.2f}s - {inter_end:.2f}s | Tail cut at {side2_end:.2f}s (Total combat: {side1_dur + side2_dur:.2f}s)")

        # Side 1
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
            volume=target_clip_vol,
            transition=trans
        )

    # Add background music (Multi-Track Smart BGM or Single Looping Track)
    total_video_dur_us = sum(int(s["duration_s"] * 1_000_000) for s in segments_plan)
    bgm_suite_cache = CACHE_DIR / "active_bgm_suite.json"
    smart_suite_applied = False
    suite_data = None

    # Calculate actual post-cut chamber durations
    ch_durs = []
    for i in range(0, min(6, len(segments_plan)), 2):
        d = segments_plan[i]["duration_s"]
        if i + 1 < len(segments_plan):
            d += segments_plan[i + 1]["duration_s"]
        ch_durs.append(d)
    b_dur = segments_plan[6]["duration_s"] if len(segments_plan) > 6 else 90.0

    if bgm_suite_cache.exists():
        try:
            suite_data = json.loads(bgm_suite_cache.read_text(encoding="utf-8"))
        except Exception:
            suite_data = None

    # Validate cached suite: if tracks are missing on disk or target durations differ significantly, re-match!
    needs_re_recommend = False
    if not suite_data or not any(suite_data) or not isinstance(suite_data, list):
        needs_re_recommend = True
    else:
        for idx, trk in enumerate(suite_data[:len(ch_durs)]):
            if not trk or not Path(trk.get("path", "")).exists():
                needs_re_recommend = True
                break
            cached_target = trk.get("target_sec")
            if cached_target and abs(cached_target - ch_durs[idx]) > 12.0:
                needs_re_recommend = True
                break

    if needs_re_recommend:
        try:
            from execution.music_recommender import recommend_bgm_suite
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
                            volume=target_bgm_vol,
                            fade_out_s=trk.get("fade_out_sec", 1.5)
                        )
                        print(f"    - Chamber {ch_idx + 1} BGM: {trk.get('title', trk_path.name)} ({ch_dur:.1f}s, vol={target_bgm_vol:.4f})")
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
                        volume=target_bgm_vol,
                        fade_out_s=1.5
                    )
                    print(f"    - Character Builds Outro BGM: {trk.get('title', trk_path.name)} ({b_dur:.1f}s, vol={target_bgm_vol:.4f})")
            smart_suite_applied = True
        except Exception as e:
            print(f"[!] Warning: Could not apply smart BGM suite: {e}")

    # Fallback to single manual track if smart suite was not applied
    if not smart_suite_applied and music_file and music_file.exists():
        print(f"[*] Adding Looping Background Music: {music_file.name}")
        audio_dur_s = get_mp3_duration(music_file)
        print(f"[*] Detected Audio Duration: {audio_dur_s:.2f}s", flush=True)

        audio_mat_id = builder.add_audio_material(str(music_file), int(audio_dur_s * 1_000_000))
        builder.add_looping_audio(audio_mat_id, int(audio_dur_s * 1_000_000), total_video_dur_us, volume=target_bgm_vol)

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



def sanitize_project_name(name: str, default: str = "Abyss Showcase") -> str:
    """Sanitizes user team/project names to be Windows-safe, removing illegal filename characters."""
    clean = re.sub(r'[<>:"/\\|?*]', '_', (name or "").strip())
    clean = clean.strip('. ')
    return clean if clean else default


def format_clock_time(seconds: float) -> str:
    """Formats duration in seconds as in-game Abyss clock display MM:SS."""
    mins = int(seconds) // 60
    secs = int(seconds) % 60
    return f"{mins:02d}:{secs:02d}"


def assemble_inverse_showcase_projects(
    run1_chambers: Optional[List[Path]] = None,
    run2_chambers: Optional[List[Path]] = None,
    builds_file: Optional[Path] = None,
    builds_split_s: Optional[float] = None,
    team_a_builds: Optional[Path] = None,
    team_b_builds: Optional[Path] = None,
    team_a_name: str = "Team A Showcase",
    team_b_name: str = "Team B Showcase",
    transition_type: str = "black_fade",
    music_volume: float = 0.0316,
    clip_volume: Optional[float] = 0.10,
    patch_ver: str = "7.1",
    sync_to_cloud: bool = True,
    auto_launch: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Synthesizes two independent, full-length CapCut PC drafts from two inverse Abyss runs:
    - Run 1 has Team A on Side 1, Team B on Side 2
    - Run 2 has Team B on Side 1, Team A on Side 2
    - Draft 1 (Team A): Combines R1_C1_S1 -> R2_C1_S2 -> R1_C2_S1 -> R2_C2_S2 -> R1_C3_S1 -> R2_C3_S2 + Builds A
    - Draft 2 (Team B): Combines R2_C1_S1 -> R1_C1_S2 -> R2_C2_S1 -> R1_C2_S2 -> R2_C3_S1 -> R1_C3_S2 + Builds B
    - Disjoint Smart BGM soundtracks matched to each team's clear duration
    - 3-Star Abyss compliance check per chamber
    - Audio pop prevention with smooth 0.1s volume ramps
    """
    # Map any keyword aliases from API callers
    if run1_chambers is None:
        run1_chambers = kwargs.get("run1_files") or []
    if run2_chambers is None:
        run2_chambers = kwargs.get("run2_files") or []
    if builds_file is None:
        builds_file = kwargs.get("combined_builds_file")
    if builds_split_s is None:
        builds_split_s = kwargs.get("builds_split_seconds")
    if team_a_builds is None:
        team_a_builds = kwargs.get("team_a_builds_file")
    if team_b_builds is None:
        team_b_builds = kwargs.get("team_b_builds_file")

    if len(run1_chambers) < 3:
        raise ValueError(f"Run 1 requires at least 3 chamber recordings (got {len(run1_chambers)})")
    if len(run2_chambers) < 3:
        raise ValueError(f"Run 2 requires at least 3 chamber recordings (got {len(run2_chambers)})")

    target_volume = clip_volume if clip_volume is not None else music_volume
    clean_team_a = sanitize_project_name(team_a_name, "Team A Showcase")
    clean_team_b = sanitize_project_name(team_b_name, "Team B Showcase")

    print(f"\n{'=' * 65}", flush=True)
    print(f"[*] Starting Inverse 2-in-1 Dual Showcase Pipeline", flush=True)
    print(f"[*] Draft 1 (Team A): {clean_team_a}", flush=True)
    print(f"[*] Draft 2 (Team B): {clean_team_b}", flush=True)
    print(f"[*] Run 1 Chambers (A S1 / B S2): {[f.name for f in run1_chambers[:3]]}", flush=True)
    print(f"[*] Run 2 Chambers (B S1 / A S2): {[f.name for f in run2_chambers[:3]]}", flush=True)
    print(f"[*] Transition Style: {transition_type.upper()}", flush=True)
    print(f"[*] Audio Levels: Clips = {target_volume:.4f} (-20.0 dB) | BGM = {music_volume:.4f} (-30.0 dB)", flush=True)
    print(f"{'=' * 65}\n", flush=True)

    # 1. Analyze boundary cuts for Run 1 & Run 2
    def analyze_chamber_set(chambers: List[Path], run_name: str) -> List[Dict[str, Any]]:
        cuts = []
        for idx, ch_file in enumerate(chambers[:3]):
            ch_num = idx + 1
            dur_s, w, h, _ = probe_video_metadata(ch_file)
            s1_start = detect_entry_loading_screen(ch_file, dur_s)
            inter = detect_chamber_intermission(ch_file, dur_s)
            s2_end = detect_tail_loading_screen(ch_file, dur_s)

            s1_dur = max(5.0, inter.start - s1_start)
            s2_start = inter.end
            s2_dur = max(5.0, s2_end - s2_start)

            cuts.append({
                "file": ch_file,
                "chamber": f"12-{ch_num}",
                "dur_s": dur_s,
                "width": w,
                "height": h,
                "s1_start": s1_start,
                "s1_dur": s1_dur,
                "s1_end": inter.start,
                "s2_start": s2_start,
                "s2_dur": s2_dur,
                "s2_end": s2_end
            })
            print(f"[*] {run_name} Ch {ch_num}: S1 [{s1_start:.1f}s - {inter.start:.1f}s ({s1_dur:.1f}s)] | Inter: {inter.dur:.1f}s | S2 [{s2_start:.1f}s - {s2_end:.1f}s ({s2_dur:.1f}s)]", flush=True)
        return cuts

    r1_cuts = analyze_chamber_set(run1_chambers, "Run 1")
    r2_cuts = analyze_chamber_set(run2_chambers, "Run 2")

    # 2. Analyze Builds
    builds_plan_a = None
    builds_plan_b = None

    if builds_file and Path(builds_file).exists():
        b_path = Path(builds_file)
        b_dur, bw, bh, _ = probe_video_metadata(b_path)
        if builds_split_s is not None and builds_split_s > 0:
            split_s = min(max(5.0, float(builds_split_s)), b_dur - 5.0)
        else:
            split_s = b_dur * 0.5
        builds_plan_a = {
            "file": b_path,
            "src_start_s": 0.0,
            "duration_s": split_s,
            "width": bw,
            "height": bh,
            "label": f"Character Builds, Weapons & Artifacts · {clean_team_a}"
        }
        builds_plan_b = {
            "file": b_path,
            "src_start_s": split_s,
            "duration_s": b_dur - split_s,
            "width": bw,
            "height": bh,
            "label": f"Character Builds, Weapons & Artifacts · {clean_team_b}"
        }
        print(f"[*] Combined Builds split at {split_s:.1f}s / {b_dur:.1f}s (Team A: {split_s:.1f}s, Team B: {b_dur - split_s:.1f}s)", flush=True)
    else:
        if team_a_builds and Path(team_a_builds).exists():
            ta_path = Path(team_a_builds)
            da, wa, ha, _ = probe_video_metadata(ta_path)
            builds_plan_a = {
                "file": ta_path,
                "src_start_s": 0.0,
                "duration_s": da,
                "width": wa,
                "height": ha,
                "label": f"Character Builds, Weapons & Artifacts · {clean_team_a}"
            }
        if team_b_builds and Path(team_b_builds).exists():
            tb_path = Path(team_b_builds)
            db, wb, hb, _ = probe_video_metadata(tb_path)
            builds_plan_b = {
                "file": tb_path,
                "src_start_s": 0.0,
                "duration_s": db,
                "width": wb,
                "height": hb,
                "label": f"Character Builds, Weapons & Artifacts · {clean_team_b}"
            }

    # 3. Construct Segments Plan for Team A
    segments_a = [
        {"chamber": "12-1", "side": "1", "label": f"Chamber 12-1 (First Half) · {clean_team_a}", "file": r1_cuts[0]["file"], "src_start_s": r1_cuts[0]["s1_start"], "duration_s": r1_cuts[0]["s1_dur"], "width": r1_cuts[0]["width"], "height": r1_cuts[0]["height"], "has_transition": True},
        {"chamber": "12-1", "side": "2", "label": f"Chamber 12-1 (Second Half) · {clean_team_a}", "file": r2_cuts[0]["file"], "src_start_s": r2_cuts[0]["s2_start"], "duration_s": r2_cuts[0]["s2_dur"], "width": r2_cuts[0]["width"], "height": r2_cuts[0]["height"], "has_transition": True},
        {"chamber": "12-2", "side": "1", "label": f"Chamber 12-2 (First Half) · {clean_team_a}", "file": r1_cuts[1]["file"], "src_start_s": r1_cuts[1]["s1_start"], "duration_s": r1_cuts[1]["s1_dur"], "width": r1_cuts[1]["width"], "height": r1_cuts[1]["height"], "has_transition": True},
        {"chamber": "12-2", "side": "2", "label": f"Chamber 12-2 (Second Half) · {clean_team_a}", "file": r2_cuts[1]["file"], "src_start_s": r2_cuts[1]["s2_start"], "duration_s": r2_cuts[1]["s2_dur"], "width": r2_cuts[1]["width"], "height": r2_cuts[1]["height"], "has_transition": True},
        {"chamber": "12-3", "side": "1", "label": f"Chamber 12-3 (First Half) · {clean_team_a}", "file": r1_cuts[2]["file"], "src_start_s": r1_cuts[2]["s1_start"], "duration_s": r1_cuts[2]["s1_dur"], "width": r1_cuts[2]["width"], "height": r1_cuts[2]["height"], "has_transition": True},
        {"chamber": "12-3", "side": "2", "label": f"Chamber 12-3 (Second Half) · {clean_team_a}", "file": r2_cuts[2]["file"], "src_start_s": r2_cuts[2]["s2_start"], "duration_s": r2_cuts[2]["s2_dur"], "width": r2_cuts[2]["width"], "height": r2_cuts[2]["height"], "has_transition": builds_plan_a is not None}
    ]
    if builds_plan_a:
        segments_a.append({
            "chamber": "Builds",
            "side": None,
            "label": builds_plan_a["label"],
            "file": builds_plan_a["file"],
            "src_start_s": builds_plan_a["src_start_s"],
            "duration_s": builds_plan_a["duration_s"],
            "width": builds_plan_a["width"],
            "height": builds_plan_a["height"],
            "has_transition": False
        })

    # 4. Construct Segments Plan for Team B
    segments_b = [
        {"chamber": "12-1", "side": "1", "label": f"Chamber 12-1 (First Half) · {clean_team_b}", "file": r2_cuts[0]["file"], "src_start_s": r2_cuts[0]["s1_start"], "duration_s": r2_cuts[0]["s1_dur"], "width": r2_cuts[0]["width"], "height": r2_cuts[0]["height"], "has_transition": True},
        {"chamber": "12-1", "side": "2", "label": f"Chamber 12-1 (Second Half) · {clean_team_b}", "file": r1_cuts[0]["file"], "src_start_s": r1_cuts[0]["s2_start"], "duration_s": r1_cuts[0]["s2_dur"], "width": r1_cuts[0]["width"], "height": r1_cuts[0]["height"], "has_transition": True},
        {"chamber": "12-2", "side": "1", "label": f"Chamber 12-2 (First Half) · {clean_team_b}", "file": r2_cuts[1]["file"], "src_start_s": r2_cuts[1]["s1_start"], "duration_s": r2_cuts[1]["s1_dur"], "width": r2_cuts[1]["width"], "height": r2_cuts[1]["height"], "has_transition": True},
        {"chamber": "12-2", "side": "2", "label": f"Chamber 12-2 (Second Half) · {clean_team_b}", "file": r1_cuts[1]["file"], "src_start_s": r1_cuts[1]["s2_start"], "duration_s": r1_cuts[1]["s2_dur"], "width": r1_cuts[1]["width"], "height": r1_cuts[1]["height"], "has_transition": True},
        {"chamber": "12-3", "side": "1", "label": f"Chamber 12-3 (First Half) · {clean_team_b}", "file": r2_cuts[2]["file"], "src_start_s": r2_cuts[2]["s1_start"], "duration_s": r2_cuts[2]["s1_dur"], "width": r2_cuts[2]["width"], "height": r2_cuts[2]["height"], "has_transition": True},
        {"chamber": "12-3", "side": "2", "label": f"Chamber 12-3 (Second Half) · {clean_team_b}", "file": r1_cuts[2]["file"], "src_start_s": r1_cuts[2]["s2_start"], "duration_s": r1_cuts[2]["s2_dur"], "width": r1_cuts[2]["width"], "height": r1_cuts[2]["height"], "has_transition": builds_plan_b is not None}
    ]
    if builds_plan_b:
        segments_b.append({
            "chamber": "Builds",
            "side": None,
            "label": builds_plan_b["label"],
            "file": builds_plan_b["file"],
            "src_start_s": builds_plan_b["src_start_s"],
            "duration_s": builds_plan_b["duration_s"],
            "width": builds_plan_b["width"],
            "height": builds_plan_b["height"],
            "has_transition": False
        })

    # 5. Compute Chamber Durations & 3-Star Compliance
    def compute_durations_and_compliance(segments: List[Dict[str, Any]]):
        c1 = segments[0]["duration_s"] + segments[1]["duration_s"]
        c2 = segments[2]["duration_s"] + segments[3]["duration_s"]
        c3 = segments[4]["duration_s"] + segments[5]["duration_s"]
        b_dur = segments[6]["duration_s"] if len(segments) > 6 else 0.0

        def star_info(dur: float) -> Dict[str, Any]:
            is_3 = dur <= 180.0
            clock = format_clock_time(max(0.0, 600.0 - dur))
            stars = 3 if is_3 else (2 if dur <= 300.0 else 1)
            return {"duration_s": round(dur, 2), "is_3star": is_3, "stars": stars, "clock_remaining": clock}

        comp = {
            "chamber_1": star_info(c1),
            "chamber_2": star_info(c2),
            "chamber_3": star_info(c3),
            "total_combat_s": round(c1 + c2 + c3, 2),
            "all_3star": (c1 <= 180.0 and c2 <= 180.0 and c3 <= 180.0)
        }
        return [c1, c2, c3], b_dur, comp

    ch_durs_a, b_dur_a, comp_a = compute_durations_and_compliance(segments_a)
    ch_durs_b, b_dur_b, comp_b = compute_durations_and_compliance(segments_b)

    # 6. Smart BGM Recommendations with Disjoint Track Allocations
    suite_a = None
    suite_b = None
    used_track_ids_a = []
    try:
        from music_recommender import recommend_bgm_suite
        suite_a = recommend_bgm_suite(ch_durs_a, builds_duration=(b_dur_a or 90.0))
        assign_a = suite_a.get("assignments", suite_a) if isinstance(suite_a, dict) else {}
        for slot_k in ["chamber_1", "chamber_2", "chamber_3", "builds"]:
            slot_data = assign_a.get(slot_k, {})
            sel = slot_data.get("selected", slot_data) if isinstance(slot_data, dict) else {}
            t_id = sel.get("id") or sel.get("track_id")
            if t_id:
                used_track_ids_a.append(t_id)

        suite_b = recommend_bgm_suite(ch_durs_b, builds_duration=(b_dur_b or 90.0), exclude_track_ids=used_track_ids_a)
    except Exception as e:
        print(f"[!] BGM recommendation notice: {e}", flush=True)

    # 7. Synthesize CapCut PC Drafts
    def build_showcase_draft(project_name: str, segments: List[Dict[str, Any]], ch_durs: List[float], suite: Optional[Dict[str, Any]], comp: Dict[str, Any], builds_plan: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        builder = CapCutDraftBuilder(project_name=project_name, width=1920, height=1080, fps=30.0)
        registered_mats = {}

        for seg in segments:
            f_str = str(seg["file"])
            if f_str not in registered_mats:
                dur_s, w, h, _ = probe_video_metadata(seg["file"])
                m_id = builder.add_video_material(f_str, int(dur_s * 1_000_000), width=w, height=h)
                registered_mats[f_str] = m_id

        # Add video segments with transition
        for seg in segments:
            trans = transition_type if seg["has_transition"] else "none"
            m_id = registered_mats[str(seg["file"])]
            builder.add_video_segment(
                material_id=m_id,
                source_start_s=seg["src_start_s"],
                duration_s=seg["duration_s"],
                volume=target_volume,
                transition=trans
            )

        # Add BGM segments
        if suite and isinstance(suite, dict):
            slot_keys = ["chamber_1", "chamber_2", "chamber_3"]
            cur_time_s = 0.0
            assignments = suite.get("assignments", suite)
            for idx, k in enumerate(slot_keys):
                c_dur = ch_durs[idx]
                trk_info = assignments.get(k, {})
                if isinstance(trk_info, dict) and "selected" in trk_info and isinstance(trk_info["selected"], dict):
                    trk_data = trk_info["selected"]
                elif isinstance(trk_info, dict):
                    trk_data = trk_info
                else:
                    trk_data = {}

                trk_path_str = trk_data.get("path")
                if trk_path_str:
                    trk_path = Path(trk_path_str)
                    if trk_path.exists():
                        f_dur_us = int(trk_data.get("duration_sec", c_dur) * 1_000_000)
                        a_mat_id = builder.add_audio_material(str(trk_path), f_dur_us)
                        builder.add_bgm_segment(
                            audio_material_id=a_mat_id,
                            target_start_s=cur_time_s,
                            duration_s=c_dur,
                            volume=music_volume,
                            fade_out_s=1.5
                        )
                        print(f"[*] Added BGM for {k}: {trk_path.name} ({c_dur:.1f}s)", flush=True)
                cur_time_s += c_dur

            if builds_plan:
                b_dur = builds_plan["duration_s"]
                b_info = assignments.get("builds", suite.get("builds", {}))
                if isinstance(b_info, dict) and "selected" in b_info and isinstance(b_info["selected"], dict):
                    b_data = b_info["selected"]
                elif isinstance(b_info, dict):
                    b_data = b_info
                else:
                    b_data = {}

                b_path_str = b_data.get("path")
                if b_path_str:
                    b_path = Path(b_path_str)
                    if b_path.exists():
                        f_dur_us = int(b_data.get("duration_sec", b_dur) * 1_000_000)
                        a_mat_id = builder.add_audio_material(str(b_path), f_dur_us)
                        builder.add_bgm_segment(
                            audio_material_id=a_mat_id,
                            target_start_s=cur_time_s,
                            duration_s=b_dur,
                            volume=music_volume,
                            fade_out_s=2.0
                        )
                        print(f"[*] Added BGM for Builds: {b_path.name} ({b_dur:.1f}s)", flush=True)

        # Save project
        project_folder = builder.save_to_capcut()
        print(f"[+] CapCut Showcase Draft Created: {project_folder}", flush=True)

        # Create Cover Thumbnail
        cover_path = project_folder / "draft_cover.jpg"
        if segments and not cover_path.exists():
            try:
                cap_cov = cv2.VideoCapture(str(segments[0]["file"]))
                cap_cov.set(cv2.CAP_PROP_POS_MSEC, 15000)
                ret_cov, f_cov = cap_cov.read()
                if ret_cov:
                    cv2.imwrite(str(cover_path), f_cov)
                cap_cov.release()
            except Exception:
                pass

        # Calculate Chapters
        chapters = []
        cumulative_s = 0.0
        for seg in segments:
            ts_str = format_timestamp(cumulative_s)
            chapters.append({
                "timestamp": ts_str,
                "seconds": round(cumulative_s, 3),
                "title": seg["label"]
            })
            cumulative_s += seg["duration_s"]

        chapter_text = "\n".join([f"{c['timestamp']} - {c['title']}" for c in chapters])

        return {
            "project_name": project_name,
            "project_folder": str(project_folder),
            "total_duration_s": round(cumulative_s, 2),
            "total_duration_formatted": format_timestamp(cumulative_s),
            "chapters": chapters,
            "chapter_text": chapter_text,
            "compliance": comp,
            "bgm_suite": suite,
            "segments": segments
        }

    res_a = build_showcase_draft(clean_team_a, segments_a, ch_durs_a, suite_a, comp_a, builds_plan_a)
    res_b = build_showcase_draft(clean_team_b, segments_b, ch_durs_b, suite_b, comp_b, builds_plan_b)

    # Sync to local cache
    showcase_sync_file = CACHE_DIR / "latest_showcase_drafts.json"
    dual_result = {
        "team_a": res_a,
        "team_b": res_b,
        "patch": patch_ver,
        "created_at": time.time()
    }
    showcase_sync_file.write_text(json.dumps(dual_result, indent=2, default=str), encoding="utf-8")

    # Cloud Sync
    if sync_to_cloud:
        try:
            push_chapters_to_cloud({
                "mode": "showcase",
                "team_a": res_a,
                "team_b": res_b
            })
        except Exception:
            pass

    print("\n" + "=" * 65, flush=True)
    print(f"[+] DRAFT 1: {clean_team_a} ({res_a['total_duration_formatted']})", flush=True)
    print(f"    3★ Status: {'ALL 3★ CLEARED!' if comp_a['all_3star'] else 'Cleared'}", flush=True)
    print("=" * 65, flush=True)
    print(res_a["chapter_text"], flush=True)
    print("=" * 65, flush=True)

    print("\n" + "=" * 65, flush=True)
    print(f"[+] DRAFT 2: {clean_team_b} ({res_b['total_duration_formatted']})", flush=True)
    print(f"    3★ Status: {'ALL 3★ CLEARED!' if comp_b['all_3star'] else 'Cleared'}", flush=True)
    print("=" * 65, flush=True)
    print(res_b["chapter_text"], flush=True)
    print("=" * 65 + "\n", flush=True)

    if auto_launch:
        launch_capcut()

    return dual_result


def main():
    parser = argparse.ArgumentParser(description="Automated Genshin Abyss Video Editor for CapCut PC")
    parser.add_argument("--mode", type=str, default="standard", choices=["standard", "showcase"], help="Editor mode: standard (4 clips) or showcase (inverse dual run)")
    parser.add_argument("--files", nargs="*", default=None, help="Explicit list of video files (Chamber 1, Chamber 2, Chamber 3, [Builds])")
    parser.add_argument("--run1-files", nargs="*", default=None, help="Explicit list of Run 1 files (Chambers 1, 2, 3)")
    parser.add_argument("--run2-files", nargs="*", default=None, help="Explicit list of Run 2 files (Chambers 1, 2, 3)")
    parser.add_argument("--team-a", type=str, default="Team A Showcase", help="Team A project name")
    parser.add_argument("--team-b", type=str, default="Team B Showcase", help="Team B project name")
    parser.add_argument("--builds-split", type=float, default=None, help="Split timestamp (seconds) for combined builds clip")
    parser.add_argument("--team-a-builds", type=str, default="", help="Separate builds clip for Team A")
    parser.add_argument("--team-b-builds", type=str, default="", help="Separate builds clip for Team B")
    parser.add_argument("--input-dir", type=str, default=str(DEFAULT_INPUT_DIR), help="Directory with raw screen recordings")
    parser.add_argument("--music", type=str, default="", help="Path to background music file")
    parser.add_argument("--volume", type=float, default=0.10, help="Music volume (0.0 to 1.0, default 0.10)")
    parser.add_argument("--transition", type=str, default="black_fade", choices=["black_fade", "woosh", "none"], help="Transition effect style")
    parser.add_argument("--project-name", type=str, default="Abyss Floor 12 Run (Auto-Edited)", help="CapCut project name")
    parser.add_argument("--side1", type=str, default="", help="Side 1 carry/archetype name (optional, dynamic in Thumbnail Studio)")
    parser.add_argument("--side2", type=str, default="", help="Side 2 carry/archetype name (optional, dynamic in Thumbnail Studio)")
    parser.add_argument("--patch", type=str, default="7.1", help="Abyss patch version (e.g. 7.1)")
    parser.add_argument("--no-cloud", action="store_true", help="Skip pushing chapters to cloud")
    parser.add_argument("--open-capcut", action="store_true", help="Automatically launch CapCut PC after generating")

    args = parser.parse_args()

    if args.mode == "showcase":
        # Multi-run Inverse Showcase mode
        if args.run1_files and args.run2_files:
            r1_files = [Path(f) for f in args.run1_files]
            r2_files = [Path(f) for f in args.run2_files]
            b_file = Path(args.files[0]) if (args.files and len(args.files) > 0) else None
        else:
            input_path = Path(args.input_dir)
            recordings = find_latest_screen_recordings(input_path, count=8)
            if len(recordings) < 6:
                print(f"[!] Error: Found only {len(recordings)} mp4 files in {input_path}. Need at least 6 files (3 for Run 1, 3 for Run 2).")
                sys.exit(1)
            r1_files = recordings[:3]
            r2_files = recordings[3:6]
            b_file = recordings[6] if len(recordings) > 6 else None

        ta_builds = Path(args.team_a_builds) if args.team_a_builds else None
        tb_builds = Path(args.team_b_builds) if args.team_b_builds else None

        assemble_inverse_showcase_projects(
            run1_chambers=r1_files,
            run2_chambers=r2_files,
            builds_file=b_file,
            builds_split_s=args.builds_split,
            team_a_builds=ta_builds,
            team_b_builds=tb_builds,
            team_a_name=args.team_a,
            team_b_name=args.team_b,
            transition_type=args.transition,
            music_volume=args.volume,
            patch_ver=args.patch,
            sync_to_cloud=not args.no_cloud,
            auto_launch=args.open_capcut
        )
    else:
        # Standard 4-clip mode
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
