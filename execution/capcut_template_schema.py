"""
CapCut Desktop (v1.4.x) Project Schema Builder
DOE-VERSION: 2026.09.11

Generates 100% compliant, unencrypted CapCut PC draft projects containing:
- 16:9 Canvas (1920x1080)
- Multi-track video timeline with cut ranges
- Procedural transition materials (e.g., 'Woosh')
- Background music tracks with looping & custom volume
- Automatic registration in root_meta_info.json
"""

import os
import sys
import json
import uuid
import time
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Standard Woosh transition cached in CapCut v1.4.x
DEFAULT_WOOSH_EFFECT = {
    "category_id": "27189",
    "category_name": "Blur",
    "duration": 466666,  # 0.466s in microseconds
    "effect_id": "9291024",
    "is_overlap": True,
    "name": "Woosh",
    "platform": "all",
    "resource_id": "6724239584663704071",
    "type": "transition"
}

# Standard Black Fade transition cached in CapCut v1.4.x
DEFAULT_BLACK_FADE_EFFECT = {
    "category_id": "27189",
    "category_name": "Basic",
    "duration": 500000,  # 0.5s in microseconds
    "effect_id": "9290995",
    "is_overlap": True,
    "name": "Black Fade",
    "platform": "all",
    "resource_id": "6724239388189921806",
    "type": "transition"
}

def get_capcut_drafts_dir() -> Path:
    """Returns local CapCut drafts folder path."""
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    if not local_appdata:
        local_appdata = str(Path.home() / "AppData" / "Local")
    drafts_dir = Path(local_appdata) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    drafts_dir.mkdir(parents=True, exist_ok=True)
    return drafts_dir


def get_host_device_platform(drafts_root: Optional[Path] = None) -> dict:
    """Extracts host device and app credentials to satisfy CapCut's DraftLoadVerifier."""
    fallback = {
        "app_id": 359289,
        "app_source": "cc",
        "app_version": "1.4.0",
        "device_id": "5befcc91eb8a9a2b7b48d85ffbff6662",
        "hard_disk_id": "b1cbce30357a33d5e53a617c68d40832",
        "mac_address": "c5b0a7f3315513f5e2703e7772424808",
        "os": "windows",
        "os_version": "10.0.26100"
    }
    if not drafts_root:
        drafts_root = get_capcut_drafts_dir()
    if drafts_root.exists():
        for d in drafts_root.iterdir():
            if d.is_dir() and (d / "draft_content.json").exists():
                try:
                    c = json.loads((d / "draft_content.json").read_text(encoding="utf-8"))
                    plat = c.get("platform")
                    if plat and plat.get("app_source") == "cc" and plat.get("device_id"):
                        return plat
                except Exception:
                    pass
    return fallback



class CapCutDraftBuilder:
    """Builds a complete, valid draft_content.json and draft_meta_info.json for CapCut PC."""

    def __init__(self, project_name: str, width: int = 1920, height: int = 1080, fps: float = 30.0):
        self.project_name = project_name
        self.width = width
        self.height = height
        self.fps = fps
        self.draft_id = str(uuid.uuid4()).upper()

        # Materials registry
        self.materials = {
            "audio_balances": [],
            "audio_effects": [],
            "audio_fades": [],
            "audios": [],
            "beats": [],
            "canvases": [],
            "chromas": [],
            "color_curves": [],
            "drafts": [],
            "effects": [],
            "handwrites": [],
            "hsl": [],
            "images": [],
            "log_color_wheels": [],
            "manual_deformations": [],
            "masks": [],
            "material_animations": [],
            "placeholders": [],
            "plugin_effects": [],
            "primary_color_wheels": [],
            "realtime_denoises": [],
            "speeds": [],
            "stickers": [],
            "tail_leaders": [],
            "text_templates": [],
            "texts": [],
            "transitions": [],
            "video_effects": [],
            "video_trackings": [],
            "videos": []
        }

        # Video and audio segments
        self.video_segments: List[Dict] = []
        self.audio_segments: List[Dict] = []

        # Local cache for speeds/canvases
        self.speed_material_id = self._create_speed_material(1.0)
        self.canvas_material_id = self._create_canvas_material()

        # Register default transition effect paths if available
        self.woosh_path = self._locate_effect_cache("9291024", "55f6a9ee31eb16a40b6c25e2f6c2a31e")
        self.black_fade_path = self._locate_effect_cache("9290995", "13968cfcb6ace0ddd6d347b149f85289")

    def _locate_effect_cache(self, effect_id: str, hash_dir: str) -> str:
        local_appdata = os.environ.get("LOCALAPPDATA", "")
        cached = Path(local_appdata) / "CapCut" / "User Data" / "Cache" / "effect" / effect_id / hash_dir
        if cached.exists():
            return str(cached).replace("\\", "/")
        return ""

    def _create_speed_material(self, speed_val: float = 1.0) -> str:
        s_id = str(uuid.uuid4()).upper()
        self.materials["speeds"].append({
            "curve_speed": None,
            "id": s_id,
            "mode": 0,
            "speed": speed_val,
            "type": "speed"
        })
        return s_id

    def _create_canvas_material(self) -> str:
        c_id = str(uuid.uuid4()).upper()
        self.materials["canvases"].append({
            "album_image": "",
            "blur": 0.0,
            "color": "",
            "id": c_id,
            "image": "",
            "image_id": "",
            "image_name": "",
            "source_platform": 0,
            "team_id": "",
            "type": "canvas_color"
        })
        return c_id

    def add_video_material(self, file_path: str, duration_us: int, width: int = 2712, height: int = 1220) -> str:
        """Registers a video file into materials['videos']. Returns material_id."""
        clean_path = str(Path(file_path).resolve()).replace("\\", "/")
        v_id = str(uuid.uuid4()).upper()
        self.materials["videos"].append({
            "audio_fade": None,
            "cartoon_path": "",
            "category_id": "",
            "category_name": "local",
            "check_flag": 63487,
            "crop": {
                "lower_left_x": 0.0,
                "lower_left_y": 1.0,
                "lower_right_x": 1.0,
                "lower_right_y": 1.0,
                "upper_left_x": 0.0,
                "upper_left_y": 0.0,
                "upper_right_x": 1.0,
                "upper_right_y": 0.0
            },
            "crop_ratio": "free",
            "crop_scale": 1.0,
            "duration": duration_us,
            "extra_type_option": 0,
            "formula_id": "",
            "freeze": None,
            "gameplay": None,
            "has_audio": True,
            "height": height,
            "id": v_id,
            "intensifies_audio_path": "",
            "intensifies_path": "",
            "is_unified_beauty_mode": False,
            "material_id": "",
            "material_name": Path(file_path).name,
            "material_url": "",
            "matting": {
                "flag": 0,
                "has_use_quick_brush": False,
                "interactiveTime": [],
                "path": "",
                "strokes": []
            },
            "object_locked": None,
            "path": clean_path,
            "picture_from": "none",
            "picture_set_category_id": "",
            "picture_set_category_name": "",
            "reverse_intensifies_path": "",
            "reverse_path": "",
            "source_platform": 0,
            "stable": None,
            "team_id": "",
            "type": "video",
            "video_algorithm": {
                "algorithms": [],
                "deflicker": None,
                "motion_blur_config": None,
                "noise_reduction": None,
                "path": "",
                "time_range": None
            },
            "width": width
        })
        return v_id

    def add_audio_material(self, file_path: str, duration_us: int) -> str:
        """Registers an audio file into materials['audios']. Returns material_id."""
        clean_path = str(Path(file_path).resolve()).replace("\\", "/")
        a_id = str(uuid.uuid4()).upper()
        self.materials["audios"].append({
            "app_id": 0,
            "category_id": "",
            "category_name": "local",
            "check_flag": 1,
            "duration": duration_us,
            "effect_id": "",
            "formula_id": "",
            "id": a_id,
            "intensifies_path": "",
            "music_id": str(uuid.uuid4()),
            "name": Path(file_path).name,
            "path": clean_path,
            "resource_id": "",
            "source_platform": 0,
            "team_id": "",
            "text_id": "",
            "tone_speaker": "",
            "tone_type": "",
            "type": "extract_music",
            "video_id": "",
            "wave_points": []
        })
        return a_id

    def add_video_segment(
        self,
        material_id: str,
        source_start_s: float,
        duration_s: float,
        volume: float = 0.10,
        transition: str = "black_fade",
        add_woosh_transition: Optional[bool] = None
    ):
        """Adds a cut segment onto Track 0 (Video track) with selectable transition."""
        src_start_us = int(source_start_s * 1_000_000)
        dur_us = int(duration_s * 1_000_000)

        # Backward compatibility for boolean add_woosh_transition
        if add_woosh_transition is not None:
            transition = "woosh" if add_woosh_transition else "none"

        # Calculate target timeline start based on previous segments
        tgt_start_us = 0
        if self.video_segments:
            prev = self.video_segments[-1]
            prev_end = prev["target_timerange"]["start"] + prev["target_timerange"]["duration"]
            tgt_start_us = prev_end

        extra_refs = [self.speed_material_id]

        trans_clean = (transition or "").lower().strip()
        if trans_clean in ("black_fade", "blackfade", "fade_black", "fade"):
            tr_id = str(uuid.uuid4()).upper()
            tr_obj = dict(DEFAULT_BLACK_FADE_EFFECT)
            tr_obj["id"] = tr_id
            if self.black_fade_path:
                tr_obj["path"] = self.black_fade_path
            self.materials["transitions"].append(tr_obj)
            extra_refs.append(tr_id)
        elif trans_clean in ("woosh", "blur", "crosszoom"):
            tr_id = str(uuid.uuid4()).upper()
            tr_obj = dict(DEFAULT_WOOSH_EFFECT)
            tr_obj["id"] = tr_id
            if self.woosh_path:
                tr_obj["path"] = self.woosh_path
            self.materials["transitions"].append(tr_obj)
            extra_refs.append(tr_id)

        extra_refs.append(self.canvas_material_id)

        seg_id = str(uuid.uuid4()).upper()
        seg_obj = {
            "cartoon": False,
            "clip": {
                "alpha": 1.0,
                "flip": {"horizontal": False, "vertical": False},
                "rotation": 0.0,
                "scale": {"x": 1.0, "y": 1.0},
                "transform": {"x": 0.0, "y": 0.0}
            },
            "enable_adjust": True,
            "enable_color_curves": True,
            "enable_color_wheels": True,
            "enable_lut": True,
            "extra_material_refs": extra_refs,
            "group_id": "",
            "hdr_settings": {"intensity": 1.0, "mode": 1, "nits": 1000},
            "id": seg_id,
            "intensifies_audio": False,
            "is_placeholder": False,
            "is_tone_modify": False,
            "keyframe_refs": [],
            "last_nonzero_volume": volume,
            "material_id": material_id,
            "render_index": len(self.video_segments),
            "reverse": False,
            "source_timerange": {"duration": dur_us, "start": src_start_us},
            "speed": 1.0,
            "target_timerange": {"duration": dur_us, "start": tgt_start_us},
            "template_id": "",
            "track_attribute": 0,
            "track_render_index": 0,
            "visible": True,
            "volume": volume
        }
        self.video_segments.append(seg_obj)

    def add_looping_audio(self, audio_material_id: str, audio_dur_us: int, total_video_dur_us: int, volume: float = 0.10):
        """Loops the background audio track until the video duration is covered."""
        cur_start_us = 0
        while cur_start_us < total_video_dur_us:
            remaining_us = total_video_dur_us - cur_start_us
            seg_dur_us = min(audio_dur_us, remaining_us)
            seg_id = str(uuid.uuid4()).upper()
            seg_obj = {
                "cartoon": False,
                "clip": None,
                "enable_adjust": False,
                "enable_color_curves": True,
                "enable_color_wheels": True,
                "enable_lut": False,
                "extra_material_refs": [self.speed_material_id],
                "group_id": "",
                "hdr_settings": None,
                "id": seg_id,
                "intensifies_audio": False,
                "is_placeholder": False,
                "is_tone_modify": False,
                "keyframe_refs": [],
                "last_nonzero_volume": volume,
                "material_id": audio_material_id,
                "render_index": len(self.audio_segments),
                "reverse": False,
                "source_timerange": {"duration": seg_dur_us, "start": 0},
                "speed": 1.0,
                "target_timerange": {"duration": seg_dur_us, "start": cur_start_us},
                "template_id": "",
                "track_attribute": 0,
                "track_render_index": 0,
                "visible": True,
                "volume": volume
            }
            self.audio_segments.append(seg_obj)
            cur_start_us += seg_dur_us

    def add_bgm_segment(
        self,
        audio_material_id: str,
        target_start_s: float,
        duration_s: float,
        source_start_s: float = 0.0,
        volume: float = 0.22,
        fade_out_s: float = 1.5
    ):
        """Adds a dedicated, tailored BGM segment for a specific chamber with auto fade-out."""
        tgt_start_us = int(target_start_s * 1_000_000)
        dur_us = int(duration_s * 1_000_000)
        src_start_us = int(source_start_s * 1_000_000)
        seg_id = str(uuid.uuid4()).upper()

        extra_refs = [self.speed_material_id]
        if fade_out_s > 0:
            fade_id = str(uuid.uuid4()).upper()
            fade_out_us = int(fade_out_s * 1_000_000)
            self.materials.setdefault("audio_fades", []).append({
                "fade_in_duration": 0,
                "fade_out_duration": fade_out_us,
                "fade_type": 0,
                "id": fade_id,
                "type": "audio_fade"
            })
            extra_refs.append(fade_id)

        seg_obj = {
            "cartoon": False,
            "clip": None,
            "enable_adjust": False,
            "enable_color_curves": True,
            "enable_color_wheels": True,
            "enable_lut": False,
            "extra_material_refs": extra_refs,
            "group_id": "",
            "hdr_settings": None,
            "id": seg_id,
            "intensifies_audio": False,
            "is_placeholder": False,
            "is_tone_modify": False,
            "keyframe_refs": [],
            "last_nonzero_volume": volume,
            "material_id": audio_material_id,
            "render_index": len(self.audio_segments),
            "reverse": False,
            "source_timerange": {"duration": dur_us, "start": src_start_us},
            "speed": 1.0,
            "target_timerange": {"duration": dur_us, "start": tgt_start_us},
            "template_id": "",
            "track_attribute": 0,
            "track_render_index": 0,
            "visible": True,
            "volume": volume
        }
        self.audio_segments.append(seg_obj)

    def build(self) -> Tuple[Dict, Dict]:
        """Builds (draft_content, draft_meta_info) dictionary pair."""
        # Remove transition from the very last video segment
        if self.video_segments and len(self.materials["transitions"]) > 0:
            last_seg = self.video_segments[-1]
            # If last segment has a transition ref, pop it
            last_refs = last_seg.get("extra_material_refs", [])
            trans_ids = {t["id"] for t in self.materials["transitions"]}
            has_trans = any(r in trans_ids for r in last_refs)
            if has_trans and len(self.materials["transitions"]) == len(self.video_segments):
                removed = self.materials["transitions"].pop()
                last_seg["extra_material_refs"] = [r for r in last_refs if r != removed["id"]]

        # Calculate total duration in microseconds
        total_dur_us = 0
        if self.video_segments:
            last_seg = self.video_segments[-1]
            total_dur_us = last_seg["target_timerange"]["start"] + last_seg["target_timerange"]["duration"]

        now_us = int(time.time() * 1_000_000)

        tracks = [
            {
                "attribute": 0,
                "flag": 0,
                "id": str(uuid.uuid4()).upper(),
                "is_default_name": True,
                "name": "",
                "segments": self.video_segments,
                "type": "video"
            }
        ]

        if self.audio_segments:
            tracks.append({
                "attribute": 0,
                "flag": 0,
                "id": str(uuid.uuid4()).upper(),
                "is_default_name": True,
                "name": "",
                "segments": self.audio_segments,
                "type": "audio"
            })

        host_platform = get_host_device_platform()

        draft_content = {
            "canvas_config": {
                "height": self.height,
                "ratio": "16:9",
                "width": self.width
            },
            "color_space": 0,
            "config": {
                "adjust_max_index": 1,
                "attachment_info": [],
                "combination_max_index": 1,
                "export_range": None,
                "extract_audio_last_index": 1,
                "lyrics_recognition_id": "",
                "lyrics_sync": True,
                "lyrics_taskinfo": [],
                "maintrack_adsorb": True,
                "material_save_mode": 0,
                "original_sound_last_index": 1,
                "record_audio_last_index": 1,
                "sticker_max_index": 1,
                "subtitle_recognition_id": "",
                "subtitle_sync": True,
                "subtitle_taskinfo": [],
                "system_font_list": [],
                "video_mute": False,
                "zoom_info_params": None
            },
            "cover": None,
            "create_time": now_us,
            "duration": total_dur_us,
            "extra_info": None,
            "fps": self.fps,
            "free_render_index_mode_on": False,
            "group_container": None,
            "id": self.draft_id,
            "keyframes": {"adjusts": [], "audios": [], "effects": [], "filters": [], "handwrites": [], "stickers": [], "texts": [], "videos": []},
            "last_modified_platform": host_platform,
            "materials": self.materials,
            "mutable_config": None,
            "name": self.project_name,
            "new_version": "60.0.0",
            "platform": host_platform,
            "relationships": [],
            "render_index_track_mode_on": False,
            "retouch_cover": None,
            "source": "default",
            "static_cover_image_path": "",
            "tracks": tracks,
            "update_time": now_us,
            "version": 360000
        }

        # Build draft_materials structure matching CapCut PC schema
        materials_value = []
        for v in self.materials.get("videos", []):
            fp = v.get("path", "")
            p_name = Path(fp).name if fp else ""
            materials_value.append({
                "create_time": int(time.time()),
                "duration": v.get("duration", 0),
                "extra_info": p_name,
                "file_Path": fp,
                "height": v.get("height", 1220),
                "id": v.get("id"),
                "import_time": int(time.time()),
                "md5": "",
                "metetype": "video",
                "roughcut_time_range": {
                    "duration": v.get("duration", 0),
                    "start": 0
                },
                "type": 0,
                "width": v.get("width", 2712)
            })

        for a in self.materials.get("audios", []):
            fp = a.get("path", "")
            p_name = Path(fp).name if fp else ""
            materials_value.append({
                "create_time": int(time.time()),
                "duration": a.get("duration", 0),
                "extra_info": p_name,
                "file_Path": fp,
                "height": 0,
                "id": a.get("id"),
                "import_time": int(time.time()),
                "md5": "",
                "metetype": "music",
                "roughcut_time_range": {
                    "duration": a.get("duration", 0),
                    "start": 0
                },
                "type": 0,
                "width": 0
            })

        draft_materials = [
            {"type": 0, "value": materials_value},
            {"type": 1, "value": []},
            {"type": 2, "value": []},
            {"type": 3, "value": []},
            {"type": 6, "value": []},
            {"type": 7, "value": []}
        ]

        draft_meta_info = {
            "draft_cloud_last_action_download": False,
            "draft_cloud_purchase_info": "",
            "draft_cloud_template_id": "",
            "draft_cloud_tutorial_info": "",
            "draft_cloud_videocut_purchase_info": "",
            "draft_cover": "draft_cover.jpg",
            "draft_deeplink_url": "",
            "draft_fold_path": "",
            "draft_id": self.draft_id,
            "draft_is_ai_shorts": False,
            "draft_is_invisible": False,
            "draft_materials": draft_materials,
            "draft_materials_copied": [],
            "draft_name": self.project_name,
            "draft_new_version": "",
            "draft_removable_storage_device": "",
            "draft_root_path": "",
            "draft_timeline_materials_size_": 2500000000,
            "tm_draft_cloud_completed": "",
            "tm_draft_cloud_modified": 0,
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "tm_duration": total_dur_us
        }

        return draft_content, draft_meta_info

    def save_to_capcut(self, custom_drafts_dir: Optional[Path] = None) -> Path:
        """Saves project to CapCut drafts folder and updates root_meta_info.json."""
        drafts_root = custom_drafts_dir or get_capcut_drafts_dir()
        project_folder = drafts_root / self.project_name
        project_folder.mkdir(parents=True, exist_ok=True)

        draft_content, draft_meta_info = self.build()

        draft_meta_info["draft_fold_path"] = str(project_folder).replace("\\", "/")
        draft_meta_info["draft_root_path"] = str(drafts_root) # native Windows backslashes

        # Write project files
        content_json_str = json.dumps(draft_content, indent=2)
        (project_folder / "draft_content.json").write_text(content_json_str, encoding="utf-8")
        (project_folder / "draft_content.json.bak").write_text(content_json_str, encoding="utf-8")
        (project_folder / "template.tmp").write_text(content_json_str, encoding="utf-8")
        (project_folder / "draft_meta_info.json").write_text(json.dumps(draft_meta_info, indent=2), encoding="utf-8")

        # Create draft_virtual_store.json
        all_mat_ids = [v["id"] for v in draft_content.get("materials", {}).get("videos", [])] + \
                      [a["id"] for a in draft_content.get("materials", {}).get("audios", [])]
        virtual_store = {
            "draft_materials": [],
            "draft_virtual_store": [
                {
                    "type": 0,
                    "value": [{"creation_time": 0, "display_name": "", "filter_type": 0, "id": "", "import_time": 0, "sort_sub_type": 0, "sort_type": 0}]
                },
                {
                    "type": 1,
                    "value": [{"child_id": mid, "parent_id": ""} for mid in all_mat_ids]
                },
                {
                    "type": 2,
                    "value": []
                }
            ]
        }
        (project_folder / "draft_virtual_store.json").write_text(json.dumps(virtual_store, indent=2), encoding="utf-8")

        # Create empty folders expected by CapCut engine
        (project_folder / "matting").mkdir(exist_ok=True)
        (project_folder / "Resources").mkdir(exist_ok=True)

        # Copy dummy draft_agency_config.json
        agency_config = {"marterials": None, "use_converter": False, "video_resolution": 720}
        (project_folder / "draft_agency_config.json").write_text(json.dumps(agency_config, indent=2), encoding="utf-8")

        # Register in root_meta_info.json
        self._register_in_root_meta(drafts_root, project_folder, draft_content.get("duration", 0))
        return project_folder

    def _register_in_root_meta(self, drafts_root: Path, project_folder: Path, total_duration: int):
        root_file = drafts_root / "root_meta_info.json"
        now_us = int(time.time() * 1_000_000)

        entry = {
            "draft_cloud_last_action_download": False,
            "draft_cloud_purchase_info": "",
            "draft_cloud_template_id": "",
            "draft_cloud_tutorial_info": "",
            "draft_cloud_videocut_purchase_info": "",
            "draft_cover": str(project_folder).replace("\\", "/") + "/draft_cover.jpg",
            "draft_fold_path": str(project_folder).replace("\\", "/"),
            "draft_id": self.draft_id,
            "draft_is_ai_shorts": False,
            "draft_is_invisible": False,
            "draft_json_file": str(project_folder).replace("\\", "/") + "/draft_content.json",
            "draft_materials": [],
            "draft_materials_copied": [],
            "draft_name": self.project_name,
            "draft_new_version": "",
            "draft_removable_storage_device": "",
            "draft_root_path": str(drafts_root), # native Windows backslashes
            "draft_timeline_materials_size": 2500000000,
            "tm_draft_cloud_completed": "",
            "tm_draft_cloud_modified": 0,
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "tm_duration": total_duration
        }

        if root_file.exists():
            try:
                root_data = json.loads(root_file.read_text(encoding="utf-8"))
                store = root_data.get("all_draft_store", [])
                # Remove existing entry with same folder path if updating
                store = [x for x in store if x.get("draft_fold_path") != entry["draft_fold_path"]]
                # Insert at index 0 so it's top of project list!
                store.insert(0, entry)
                root_data["all_draft_store"] = store
                root_file.write_text(json.dumps(root_data, indent=2), encoding="utf-8")
                return
            except Exception as e:
                print(f"[!] Warning updating root_meta_info.json: {e}")

        # Fallback create root_meta_info.json
        root_file.write_text(json.dumps({"all_draft_store": [entry]}, indent=2), encoding="utf-8")
