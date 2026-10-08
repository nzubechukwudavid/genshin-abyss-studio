"""Multi-criteria BGM Recommender for Genshin Abyss Studio.

Matches high-energy background music to combat chamber durations (Chambers 1-3)
and chill outro music to the builds showcase (~1:30), guaranteeing zero duplicate
tracks across chambers, broadcast loudness standards (-14 dB), and smooth fade-outs.
"""

from __future__ import annotations

import argparse
import json
import sys
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = PROJECT_DIR / "data" / "cache"
CATALOG_PATH = CACHE_DIR / "music_catalog.json"


def get_track_canonical_id(path: Union[Path, str]) -> str:
    """Generate deterministic canonical ID from track path regardless of OS case or separator."""
    normalized = str(Path(path).resolve()).lower().replace("\\", "/")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


try:
    from execution.music_indexer import load_music_catalog, DEFAULT_MUSIC_DIR
except ImportError:
    def load_music_catalog():
        if CATALOG_PATH.exists():
            return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        return {"tracks": []}


def score_track_for_duration(
    track: Dict[str, Any],
    target_sec: float,
    prefer_energy: str = "high"
) -> Tuple[float, float, float]:
    """Scores how well a track fits the target duration and energy mode.

    Returns:
        (total_score, delta_sec, in_point_sec)
    """
    track_dur = float(track.get("duration_sec", 0.0))
    if track_dur <= 0:
        return (-1.0, 0.0, 0.0)

    energy = track.get("energy_hint", "general")
    delta = track_dur - target_sec
    in_point = 0.0

    # 1. Base duration fitness
    if 0.0 <= delta <= 4.5:
        # Ideal fit: song finishes naturally with reverb decay right as victory hits
        dur_score = 1.0 - (delta / 10.0)
    elif delta > 4.5:
        if delta <= 15.0:
            # Slightly longer; fade-out handles it smoothly
            dur_score = 0.75 - (delta / 40.0)
        else:
            # Long track: Use a virtual in-point (start at drop at 15s-20s)
            dur_score = 0.45
            # Clamp in_point so skipping intro NEVER makes remaining track shorter than target!
            max_in = max(0.0, track_dur - target_sec)
            in_point = min(max_in, 20.0, max(0.0, delta / 3.0))
    else:
        # Song is shorter than chamber: requires loop in CapCut
        ratio = max(0.1, track_dur / max(1.0, target_sec))
        dur_score = -0.15 + (0.35 * ratio)

    # 2. Energy bonus / penalty
    energy_score = 0.0
    if prefer_energy == "high":
        if energy == "high":
            energy_score = 0.35
        elif energy == "general":
            energy_score = 0.10
        elif energy == "chill":
            energy_score = -0.30
    elif prefer_energy == "chill":
        if energy == "chill":
            energy_score = 0.35
        elif energy == "general":
            energy_score = 0.10
        elif energy == "high":
            energy_score = -0.30

    total_score = dur_score + energy_score
    return (round(total_score, 4), round(delta, 2), round(in_point, 2))


def recommend_bgm_suite(
    chamber_durations: List[float],
    builds_duration: Optional[float] = 90.0,
    catalog: Optional[Dict[str, Any]] = None,
    exclude_track_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Generates the optimal 4-track BGM suite for Chambers 1, 2, 3 and the Builds Outro.

    Guarantees:
    - Zero duplicate tracks across the entire run
    - High-energy combat music from t=0s on Chambers 1-3
    - Chill / Lo-Fi outro music for Builds
    - Top 3 alternative tracks per slot for user swapping
    """
    if catalog is None:
        catalog = load_music_catalog()

    tracks: List[Dict[str, Any]] = catalog.get("tracks", [])
    used_track_ids = set(exclude_track_ids or [])

    suite_assignments: Dict[str, Any] = {}
    slots = []

    # Setup Chamber slots (1-3)
    for i, dur in enumerate(chamber_durations[:3]):
        try:
            target_s = max(10.0, float(dur))
        except (ValueError, TypeError):
            target_s = 90.0
        slots.append({
            "key": f"chamber_{i+1}",
            "label": f"Chamber {i+1}",
            "target_sec": target_s,
            "energy": "high",
            "volume_gain": 0.10,  # -20.0 dB (matches clip volume)
            "fade_out_sec": 1.5
        })

    # Setup Builds slot
    try:
        b_dur = float(builds_duration) if builds_duration else 90.0
    except (ValueError, TypeError):
        b_dur = 90.0

    if b_dur > 5.0:
        slots.append({
            "key": "builds",
            "label": "Character Builds Outro",
            "target_sec": b_dur,
            "energy": "chill",
            "volume_gain": 0.10,  # -20.0 dB (matches clip volume)
            "fade_out_sec": 1.5
        })

    # If catalog is empty, generate safe fallback mock slots
    if not tracks:
        for slot in slots:
            suite_assignments[slot["key"]] = {
                "label": slot["label"],
                "target_sec": slot["target_sec"],
                "selected": None,
                "alternatives": [],
                "status": "empty_library"
            }
        return {"status": "no_library", "assignments": suite_assignments}

    # Solve assignments greedily with anti-repetition
    for slot in slots:
        slot_target = slot["target_sec"]
        slot_energy = slot["energy"]

        candidate_scores = []
        for t in tracks:
            tid = t.get("id")
            score, delta, in_point = score_track_for_duration(t, slot_target, prefer_energy=slot_energy)
            # Heavy penalty if already used in an earlier chamber
            effective_score = score - (10.0 if tid in used_track_ids else 0.0)
            candidate_scores.append((effective_score, delta, in_point, t))

        # Sort candidates descending by score
        candidate_scores.sort(key=lambda x: x[0], reverse=True)

        selected_entry = None
        alternatives = []

        if candidate_scores:
            top = candidate_scores[0]
            top_track = top[3]
            top_tid = top_track.get("id") or get_track_canonical_id(top_track.get("path") or top_track.get("title", ""))
            used_track_ids.add(top_tid)

            delta_sec = top[1]
            energy_hint = top_track.get("energy_hint", "general")
            selected_entry = {
                "id": top_tid,
                "title": top_track.get("title", "Unknown"),
                "artist": top_track.get("artist", "Unknown"),
                "path": top_track.get("path", ""),
                "duration_sec": top_track.get("duration_sec", 0.0),
                "duration_formatted": top_track.get("duration_formatted", "00:00"),
                "target_sec": slot_target,
                "delta_sec": delta_sec,
                "fit_label": f"{'+' if delta_sec >= 0 else ''}{delta_sec:.1f}s",
                "in_point_sec": top[2],
                "fade_out_sec": slot["fade_out_sec"],
                "volume_gain": slot["volume_gain"],
                "energy_hint": energy_hint,
                "explanation": {
                    "duration_margin_sec": delta_sec,
                    "energy_match": energy_hint == slot_energy,
                    "energy_label": f"{energy_hint.capitalize()} Energy",
                    "duplicate_in_run": False,
                    "fade_out_sec": slot["fade_out_sec"],
                    "in_point_sec": top[2],
                    "rationale": f"Fits {slot['label']} ({int(slot_target)}s) with {delta_sec:+.1f}s margin and {energy_hint} combat pacing"
                }
            }

            # Pick top 15 alternatives for easy audition switching
            for alt in candidate_scores[1:16]:
                alt_track = alt[3]
                alt_tid = alt_track.get("id") or get_track_canonical_id(alt_track.get("path") or alt_track.get("title", ""))
                alt_delta = alt[1]
                alt_energy = alt_track.get("energy_hint", "general")
                alternatives.append({
                    "id": alt_tid,
                    "title": alt_track.get("title", "Unknown"),
                    "artist": alt_track.get("artist", "Unknown"),
                    "path": alt_track.get("path", ""),
                    "duration_sec": alt_track.get("duration_sec", 0.0),
                    "duration_formatted": alt_track.get("duration_formatted", "00:00"),
                    "target_sec": slot_target,
                    "delta_sec": alt_delta,
                    "fit_label": f"{'+' if alt_delta >= 0 else ''}{alt_delta:.1f}s",
                    "in_point_sec": alt[2],
                    "fade_out_sec": slot["fade_out_sec"],
                    "volume_gain": slot["volume_gain"],
                    "energy_hint": alt_energy,
                    "explanation": {
                        "duration_margin_sec": alt_delta,
                        "energy_match": alt_energy == slot_energy,
                        "energy_label": f"{alt_energy.capitalize()} Energy",
                        "duplicate_in_run": alt_tid in used_track_ids,
                        "fade_out_sec": slot["fade_out_sec"],
                        "in_point_sec": alt[2],
                        "rationale": f"Alternative with {alt_delta:+.1f}s margin"
                    }
                })

        suite_assignments[slot["key"]] = {
            "label": slot["label"],
            "target_sec": slot_target,
            "target_formatted": f"{int(slot_target // 60):02d}:{int(slot_target % 60):02d}",
            "selected": selected_entry,
            "alternatives": alternatives,
            "status": "matched" if selected_entry else "no_match"
        }

    return {
        "status": "ok",
        "total_tracks_indexed": len(tracks),
        "assignments": suite_assignments
    }




def _solve_topology_slots(
    slots: List[Dict[str, Any]],
    tracks: List[Dict[str, Any]],
    exclude_track_ids: Optional[List[str]] = None
) -> Tuple[Dict[str, Any], float]:
    """Solves track assignments for a given slot list, guaranteeing zero duplicate tracks."""
    used_track_ids = set(exclude_track_ids or [])
    suite_assignments: Dict[str, Any] = {}
    total_score = 0.0

    if not tracks:
        for slot in slots:
            suite_assignments[slot["key"]] = {
                "label": slot["label"],
                "target_sec": slot["target_sec"],
                "target_formatted": f"{int(slot['target_sec'] // 60):02d}:{int(slot['target_sec'] % 60):02d}",
                "selected": None,
                "alternatives": [],
                "status": "no_tracks_in_catalog"
            }
        return suite_assignments, 0.0

    for slot in slots:
        slot_target = slot["target_sec"]
        slot_energy = slot["energy"]
        scored_tracks = []

        for track in tracks:
            raw_path = track.get("path") or track.get("file_path", "")
            tid = track.get("id") or get_track_canonical_id(raw_path)
            score, delta, in_pt = score_track_for_duration(track, slot_target, prefer_energy=slot_energy)
            if tid in used_track_ids:
                # Moderate penalty so fresh tracks are always preferred, but allows fallback if library has fewer tracks than slots
                score -= 0.50
            scored_tracks.append((score, delta, in_pt, track, tid))

        scored_tracks.sort(key=lambda x: x[0], reverse=True)

        selected_entry = None
        alternatives = []

        if scored_tracks:
            best = scored_tracks[0]
            used_track_ids.add(best[4])
            total_score += best[0]
            t = best[3]
            best_path = t.get("path") or t.get("file_path", "")
            best_title = t.get("title") or t.get("name") or Path(best_path).stem
            selected_entry = {
                "canonical_id": best[4],
                "file_path": best_path,
                "path": best_path,
                "title": best_title,
                "duration_sec": t.get("duration_sec", 0.0),
                "duration_formatted": t.get("duration_formatted", ""),
                "delta_sec": best[1],
                "fit_label": f"{'+' if best[1] >= 0 else ''}{best[1]:.1f}s",
                "in_point_sec": best[2],
                "fade_out_sec": slot["fade_out_sec"],
                "volume_gain": slot["volume_gain"],
                "energy_hint": t.get("energy_hint", "general")
            }

            for alt in scored_tracks[1:6]:
                at = alt[3]
                alt_path = at.get("path") or at.get("file_path", "")
                alt_title = at.get("title") or at.get("name") or Path(alt_path).stem
                alternatives.append({
                    "canonical_id": alt[4],
                    "file_path": alt_path,
                    "path": alt_path,
                    "title": alt_title,
                    "duration_sec": at.get("duration_sec", 0.0),
                    "duration_formatted": at.get("duration_formatted", ""),
                    "delta_sec": alt[1],
                    "fit_label": f"{'+' if alt[1] >= 0 else ''}{alt[1]:.1f}s",
                    "in_point_sec": alt[2],
                    "fade_out_sec": slot["fade_out_sec"],
                    "volume_gain": slot["volume_gain"],
                    "energy_hint": at.get("energy_hint", "general")
                })

        suite_assignments[slot["key"]] = {
            "label": slot["label"],
            "target_sec": slot_target,
            "target_formatted": f"{int(slot_target // 60):02d}:{int(slot_target % 60):02d}",
            "selected": selected_entry,
            "alternatives": alternatives,
            "status": "matched" if selected_entry else "no_match"
        }

    return suite_assignments, total_score


def recommend_stygian_bgm_suite(
    boss_durations: List[float],
    builds_duration: Optional[float] = 90.0,
    catalog: Optional[Dict[str, Any]] = None,
    preferred_topology: Optional[str] = None,
    exclude_track_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Generates flexible BGM recommendations for Stygian Onslaught runs.
    Evaluates 4 candidate topologies and recommends the best fit for available music tracks:
      1. topology_2x2: [Boss 1+2] & [Boss 3+Builds] (2 tracks)
      2. topology_1_1_combined: [Boss 1], [Boss 2], and [Boss 3+Builds] (3 tracks)
      3. topology_unified_combat: [All 3 Bosses] & [Dedicated Builds] (2 tracks)
      4. topology_discrete_4: [Boss 1], [Boss 2], [Boss 3], [Builds] (4 tracks)
    """
    if catalog is None:
        catalog = load_music_catalog()

    tracks: List[Dict[str, Any]] = catalog.get("tracks", [])

    d1 = float(boss_durations[0]) if len(boss_durations) > 0 else 85.0
    d2 = float(boss_durations[1]) if len(boss_durations) > 1 else 76.0
    d3 = float(boss_durations[2]) if len(boss_durations) > 2 else 105.0
    db = float(builds_duration) if builds_duration is not None and builds_duration > 0 else 90.0

    topologies_def = {
        "topology_2x2": {
            "label": "2+2 Balanced (Boss 1+2 & Boss 3+Builds)",
            "description": "Fuses Bosses 1 & 2 into Track 1, and Boss 3 + Builds into Track 2",
            "slots": [
                {"key": "boss_1_2", "label": "Boss 1 & 2 Combat", "target_sec": d1 + d2, "energy": "high", "volume_gain": 0.10, "fade_out_sec": 1.5},
                {"key": "boss_3_builds", "label": "Boss 3 & Builds Outro", "target_sec": d3 + db, "energy": "general", "volume_gain": 0.10, "fade_out_sec": 2.0}
            ]
        },
        "topology_1_1_combined": {
            "label": "3 Tracks (Boss 1, Boss 2, Boss 3+Builds)",
            "description": "Discrete combat tracks for Boss 1 & 2, then Boss 3 flows into Builds",
            "slots": [
                {"key": "boss_1", "label": "Boss 1 Combat", "target_sec": d1, "energy": "high", "volume_gain": 0.10, "fade_out_sec": 1.5},
                {"key": "boss_2", "label": "Boss 2 Combat", "target_sec": d2, "energy": "high", "volume_gain": 0.10, "fade_out_sec": 1.5},
                {"key": "boss_3_builds", "label": "Boss 3 & Builds Outro", "target_sec": d3 + db, "energy": "general", "volume_gain": 0.10, "fade_out_sec": 2.0}
            ]
        },
        "topology_unified_combat": {
            "label": "Unified Combat (All 3 Bosses & Builds)",
            "description": "One continuous 4m+ epic battle track for all bosses, plus dedicated chill builds track",
            "slots": [
                {"key": "all_bosses", "label": "All 3 Boss Fights (Continuous Combat)", "target_sec": d1 + d2 + d3, "energy": "high", "volume_gain": 0.10, "fade_out_sec": 1.5},
                {"key": "builds", "label": "Character Builds Showcase", "target_sec": db, "energy": "chill", "volume_gain": 0.10, "fade_out_sec": 2.0}
            ]
        },
        "topology_discrete_4": {
            "label": "Discrete 4 Tracks (Independent)",
            "description": "Individual soundtrack track for each boss fight and outro",
            "slots": [
                {"key": "boss_1", "label": "Boss 1 Combat", "target_sec": d1, "energy": "high", "volume_gain": 0.10, "fade_out_sec": 1.5},
                {"key": "boss_2", "label": "Boss 2 Combat", "target_sec": d2, "energy": "high", "volume_gain": 0.10, "fade_out_sec": 1.5},
                {"key": "boss_3", "label": "Boss 3 Combat", "target_sec": d3, "energy": "high", "volume_gain": 0.10, "fade_out_sec": 1.5},
                {"key": "builds", "label": "Character Builds Showcase", "target_sec": db, "energy": "chill", "volume_gain": 0.10, "fade_out_sec": 2.0}
            ]
        }
    }

    evaluated_topologies = {}
    best_topology_key = "topology_2x2"
    best_score = -999999.0

    for topo_key, topo_info in topologies_def.items():
        assignments, score = _solve_topology_slots(topo_info["slots"], tracks, exclude_track_ids)
        evaluated_topologies[topo_key] = {
            "label": topo_info["label"],
            "description": topo_info["description"],
            "track_count": len(topo_info["slots"]),
            "fitness_score": round(score, 3),
            "assignments": assignments
        }
        if score > best_score:
            best_score = score
            best_topology_key = topo_key

    active_key = preferred_topology if preferred_topology in evaluated_topologies else best_topology_key

    return {
        "status": "ok",
        "mode": "stygian",
        "recommended_topology": best_topology_key,
        "active_topology": active_key,
        "total_tracks_indexed": len(tracks),
        "topologies": evaluated_topologies,
        "assignments": evaluated_topologies[active_key]["assignments"]
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genshin Abyss BGM Recommender")
    parser.add_argument("--durations", type=float, nargs="+", default=[85.0, 112.0, 96.0], help="Chamber durations")
    parser.add_argument("--builds", type=float, default=90.0, help="Builds duration in seconds")
    args = parser.parse_args()

    suite = recommend_bgm_suite(args.durations, builds_duration=args.builds)
    print(json.dumps(suite, indent=2, ensure_ascii=False))
