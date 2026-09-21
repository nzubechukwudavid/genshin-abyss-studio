"""
Genshin Abyss Auto-Editor & CapCut Synthesizer Desktop GUI (v2.1)
DOE-VERSION: 2026.09.20

Visual Clip Card Arranger with:
1. Multi-Workflow Mode Switcher:
   - Standard Run (Chambers 1, 2, 3 + Builds -> Single CapCut Project)
   - Inverse Showcase (Run 1 + Run 2 + Builds -> Dual CapCut Showcase Projects)
2. Real 16:9 in-game video thumbnails for each clip
3. Smart Session Auto-Detection (clusters runs & filters retakes)
4. Direct clip slot assignment & 1-click video player preview
5. Native Windows BGM Audio Preview Player (Play/Stop without popup)
6. Interactive Builds Scrub Slider with live frame preview
7. Black Fade & Woosh transitions, custom volume, and Render cloud timestamp sync
"""

import os
import sys
import time
import json
import threading
import subprocess
from pathlib import Path
from typing import List, Dict, Optional, Any

import cv2
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk

# Adjust path to import auto_edit_abyss and capcut_template_schema
EXECUTION_DIR = Path(__file__).resolve().parent
PROJECT_DIR = EXECUTION_DIR.parent
sys.path.insert(0, str(EXECUTION_DIR))

import auto_edit_abyss
from auto_edit_abyss import (
    assemble_inverse_showcase_projects,
    sanitize_project_name,
    DEFAULT_INPUT_DIR,
    DEFAULT_DOWNLOADS_DIR,
    assemble_abyss_project,
    cluster_recording_sessions,
    find_latest_screen_recordings,
    get_or_create_thumbnail,
    list_available_music,
    is_capcut_running,
    launch_capcut,
    probe_video_metadata,
    parse_filename_time,
    format_timestamp,
    estimate_chamber_cut_duration
)

# Dark Slate Aesthetics
BG_DARK = "#0f172a"        # slate-900
CARD_BG = "#1e293b"        # slate-800
CARD_BORDER = "#334155"    # slate-700
TEXT_LIGHT = "#f8fafc"     # slate-50
TEXT_MUTED = "#94a3b8"     # slate-400
ACCENT_CYAN = "#06b6d4"    # cyan-500
ACCENT_AMBER = "#f59e0b"   # amber-500
ACCENT_GREEN = "#10b981"   # emerald-500
ACCENT_PURPLE = "#a855f7"  # purple-500
ACCENT_TEAL = "#14b8a6"    # teal-500
BTN_BG = "#2563eb"         # blue-600


class AudioPreviewPlayer:
    """Zero-dependency native Windows background audio player using .NET MediaPlayer."""
    def __init__(self):
        self.proc: Optional[subprocess.Popen] = None
        self.current_path: Optional[Path] = None

    def play(self, file_path: Path):
        self.stop()
        if not file_path.exists():
            return
        self.current_path = file_path
        uri = file_path.as_uri()
        ps_cmd = f"Add-Type -AssemblyName presentationCore; $p = New-Object System.Windows.Media.MediaPlayer; $p.Open([System.Uri]'{uri}'); $p.Play(); Start-Sleep -Seconds 30"
        self.proc = subprocess.Popen(
            ["powershell", "-NoProfile", "-Command", ps_cmd],
            creationflags=0x08000000 # CREATE_NO_WINDOW
        )

    def stop(self):
        if self.proc:
            try:
                self.proc.terminate()
            except Exception:
                pass
            self.proc = None
        self.current_path = None

    def is_playing(self) -> bool:
        if self.proc:
            return self.proc.poll() is None
        return False


def extract_video_frame(video_path: Path, seek_seconds: float, width: int = 160, height: int = 90) -> Optional[Image.Image]:
    """Extract a resized video frame at a given timestamp using OpenCV."""
    try:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return None
        cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, seek_seconds * 1000.0))
        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            return None
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        pil_img.thumbnail((width, height), Image.Resampling.LANCZOS)
        return pil_img
    except Exception:
        return None


class AbyssEditorGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Genshin Abyss Auto-Editor & CapCut Synthesizer")
        self.root.geometry("900x960")
        self.root.minsize(860, 900)
        self.root.configure(bg=BG_DARK)

        # Mode State
        self.app_mode = "standard"  # "standard" or "showcase"

        # Standard Mode State
        self.audio_player = AudioPreviewPlayer()
        self.available_sessions: List[Dict] = []
        self.selected_clips: List[Optional[Path]] = [None, None, None, None] # C1, C2, C3, Builds
        self.thumbnail_images: Dict[str, ImageTk.PhotoImage] = {}
        self.music_files_list: List[Path] = []
        self.music_file: Optional[Path] = None
        self.custom_bgm_suite: List[Optional[Dict]] = [None, None, None, None]
        self.is_processing = False

        # Showcase Mode State
        self.showcase_run1_clips: List[Optional[Path]] = [None, None, None]  # C1, C2, C3
        self.showcase_run2_clips: List[Optional[Path]] = [None, None, None]  # C1, C2, C3
        self.showcase_team_a_name = tk.StringVar(value="Venti Hypercarry")
        self.showcase_team_b_name = tk.StringVar(value="Raiden Overload")
        self.showcase_builds_mode = tk.StringVar(value="combined")  # "combined" or "separate"
        self.showcase_combined_builds: Optional[Path] = None
        self.combined_builds_dur: float = 60.0
        self.showcase_split_sec = tk.DoubleVar(value=30.0)
        self.showcase_team_a_builds: Optional[Path] = None
        self.showcase_team_b_builds: Optional[Path] = None
        self.showcase_run1_cards = []
        self.showcase_run2_cards = []
        self._scrub_timer = None
        self.scrub_preview_img = None

        self._init_styles()
        self._build_ui()
        self._load_defaults()
        self._ensure_desktop_shortcut()

        # Stop audio when window closes
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _init_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure("Dark.TFrame", background=BG_DARK)
        style.configure("Card.TFrame", background=CARD_BG)
        style.configure("Dark.TRadiobutton", background=CARD_BG, foreground=TEXT_LIGHT, font=("Segoe UI", 9))
        style.map("Dark.TRadiobutton", background=[("active", CARD_BG)])

    def _build_ui(self):
        main_container = tk.Frame(self.root, bg=BG_DARK, padx=16, pady=10)
        main_container.pack(fill=tk.BOTH, expand=True)

        # 1. Top Header
        header_frame = tk.Frame(main_container, bg=BG_DARK)
        header_frame.pack(fill=tk.X, pady=(0, 6))

        title_lbl = tk.Label(
            header_frame,
            text="🎬 Genshin Abyss Auto-Editor & Synthesizer",
            font=("Segoe UI", 16, "bold"),
            bg=BG_DARK,
            fg=TEXT_LIGHT
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header_frame,
            text="CapCut PC Project Generator • CV Boundary Cutting • YouTube Chapters Sync",
            font=("Segoe UI", 9),
            bg=BG_DARK,
            fg=TEXT_MUTED
        )
        sub_lbl.pack(anchor="w")

        # 2. Mode Switcher Segmented Bar
        mode_bar = tk.Frame(main_container, bg="#0b1120", highlightbackground="#334155", highlightthickness=1, padx=6, pady=6)
        mode_bar.pack(fill=tk.X, pady=(0, 10))

        tk.Label(
            mode_bar,
            text="WORKFLOW MODE:",
            font=("Segoe UI", 9, "bold"),
            bg="#0b1120",
            fg="#94a3b8"
        ).pack(side=tk.LEFT, padx=(6, 12))

        self.btn_mode_std = tk.Button(
            mode_bar,
            text="⚔️ Standard Run (4 Clips -> 1 Draft)",
            font=("Segoe UI", 9, "bold"),
            bg="#0284c7",
            fg="white",
            activebackground="#0369a1",
            activeforeground="white",
            relief="flat",
            padx=14,
            pady=4,
            cursor="hand2",
            command=lambda: self._switch_mode("standard")
        )
        self.btn_mode_std.pack(side=tk.LEFT, padx=(0, 8))

        self.btn_mode_showcase = tk.Button(
            mode_bar,
            text="🌟 Inverse Showcase (Dual 3-Chamber + Builds -> 2 Drafts)",
            font=("Segoe UI", 9, "bold"),
            bg="#1e293b",
            fg="#94a3b8",
            activebackground="#7c3aed",
            activeforeground="white",
            relief="flat",
            padx=14,
            pady=4,
            cursor="hand2",
            command=lambda: self._switch_mode("showcase")
        )
        self.btn_mode_showcase.pack(side=tk.LEFT)

        # 3. Standard Workspace Frame
        self.standard_workspace_frame = tk.Frame(main_container, bg=BG_DARK)
        self.standard_workspace_frame.pack(fill=tk.BOTH, expand=True)

        # Discovery & Session Toolbar
        disc_frame = tk.Frame(self.standard_workspace_frame, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1)
        disc_frame.pack(fill=tk.X, pady=(0, 10), ipady=4)

        disc_inner = tk.Frame(disc_frame, bg=CARD_BG, padx=10, pady=6)
        disc_inner.pack(fill=tk.X)

        tk.Label(
            disc_inner,
            text="Run Session:",
            font=("Segoe UI", 9, "bold"),
            bg=CARD_BG,
            fg=ACCENT_CYAN
        ).pack(side=tk.LEFT, padx=(0, 6))

        self.session_combobox = ttk.Combobox(disc_inner, state="readonly", font=("Segoe UI", 9), width=38)
        self.session_combobox.pack(side=tk.LEFT, padx=(0, 10))
        self.session_combobox.bind("<<ComboboxSelected>>", self._on_session_selected)

        btn_pick_files = tk.Button(
            disc_inner,
            text="🎬 Select Files...",
            font=("Segoe UI", 8, "bold"),
            bg="#0284c7",
            fg="white",
            relief="flat",
            padx=8,
            pady=3,
            cursor="hand2",
            command=self._on_select_files
        )
        btn_pick_files.pack(side=tk.LEFT, padx=(0, 6))

        btn_pick_dir = tk.Button(
            disc_inner,
            text="📁 Pick Folder...",
            font=("Segoe UI", 8),
            bg="#334155",
            fg=TEXT_LIGHT,
            relief="flat",
            padx=8,
            pady=3,
            cursor="hand2",
            command=self._on_select_folder
        )
        btn_pick_dir.pack(side=tk.LEFT, padx=(0, 6))

        btn_refresh = tk.Button(
            disc_inner,
            text="🔄 Refresh",
            font=("Segoe UI", 8),
            bg="#334155",
            fg=TEXT_LIGHT,
            relief="flat",
            padx=8,
            pady=3,
            cursor="hand2",
            command=self._refresh_sessions
        )
        btn_refresh.pack(side=tk.LEFT)

        # Visual Clip Cards Grid (4 Slots)
        clips_label_row = tk.Frame(self.standard_workspace_frame, bg=BG_DARK)
        clips_label_row.pack(fill=tk.X, pady=(2, 4))

        tk.Label(
            clips_label_row,
            text="VIDEO SEQUENCE & GAMEPLAY PREVIEWS (Confirm Chamber 1 ➔ 2 ➔ 3 ➔ Builds)",
            font=("Segoe UI", 9, "bold"),
            bg=BG_DARK,
            fg=TEXT_LIGHT
        ).pack(side=tk.LEFT)

        self.status_badge = tk.Label(
            clips_label_row,
            text="Checking clips...",
            font=("Segoe UI", 8),
            bg=BG_DARK,
            fg=TEXT_MUTED
        )
        self.status_badge.pack(side=tk.RIGHT)

        # Container for the 4 Cards
        self.cards_frame = tk.Frame(self.standard_workspace_frame, bg=BG_DARK)
        self.cards_frame.pack(fill=tk.X, pady=(0, 8))

        self.card_widgets = []
        slot_titles = ["Chamber 1", "Chamber 2", "Chamber 3", "Builds (Optional)"]
        for idx in range(4):
            card = self._build_clip_card(self.cards_frame, idx, slot_titles[idx])
            card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=4 if idx > 0 and idx < 3 else (0, 4) if idx == 0 else (4, 0))
            self.card_widgets.append(card)

        # Settings Section (Transitions + Audio + Chapter Teams)
        settings_grid = tk.Frame(self.standard_workspace_frame, bg=BG_DARK)
        settings_grid.pack(fill=tk.X, pady=(4, 8))

        # Transition Card
        trans_card = tk.Frame(settings_grid, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1, padx=12, pady=8)
        trans_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 6))

        tk.Label(trans_card, text="Transition Style:", font=("Segoe UI", 9, "bold"), bg=CARD_BG, fg=ACCENT_CYAN).pack(anchor="w", pady=(0, 4))
        self.trans_var = tk.StringVar(value="black_fade")

        r_black = tk.Radiobutton(
            trans_card, text="● Black Fade (Recommended)", variable=self.trans_var, value="black_fade",
            bg=CARD_BG, fg="#67e8f9", selectcolor="#092f44", activebackground=CARD_BG, activeforeground=TEXT_LIGHT,
            font=("Segoe UI", 9, "bold"), cursor="hand2"
        )
        r_black.pack(anchor="w")

        r_woosh = tk.Radiobutton(
            trans_card, text="○ Woosh (Blur Cross-Zoom)", variable=self.trans_var, value="woosh",
            bg=CARD_BG, fg=TEXT_LIGHT, selectcolor="#092f44", activebackground=CARD_BG, activeforeground=TEXT_LIGHT,
            font=("Segoe UI", 9), cursor="hand2"
        )
        r_woosh.pack(anchor="w")

        r_none = tk.Radiobutton(
            trans_card, text="○ None (Hard Cut)", variable=self.trans_var, value="none",
            bg=CARD_BG, fg=TEXT_LIGHT, selectcolor="#092f44", activebackground=CARD_BG, activeforeground=TEXT_LIGHT,
            font=("Segoe UI", 9), cursor="hand2"
        )
        r_none.pack(anchor="w")

        # Audio & BGM Card with Audio Preview Button
        audio_card = tk.Frame(settings_grid, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1, padx=12, pady=8)
        audio_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=6)

        tk.Label(audio_card, text="Background Music:", font=("Segoe UI", 9, "bold"), bg=CARD_BG, fg=ACCENT_CYAN).pack(anchor="w", pady=(0, 4))

        audio_picker_row = tk.Frame(audio_card, bg=CARD_BG)
        audio_picker_row.pack(fill=tk.X, pady=(0, 6))

        self.music_combobox = ttk.Combobox(audio_picker_row, state="readonly", font=("Segoe UI", 9), width=24)
        self.music_combobox.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self.music_combobox.bind("<<ComboboxSelected>>", self._on_music_selected)

        btn_browse_audio = tk.Button(
            audio_picker_row, text="📁 Browse...", font=("Segoe UI", 8), bg="#334155", fg=TEXT_LIGHT,
            relief="flat", padx=6, pady=2, cursor="hand2", command=self._on_browse_audio
        )
        btn_browse_audio.pack(side=tk.LEFT, padx=(0, 4))

        self.btn_preview_audio = tk.Button(
            audio_picker_row,
            text="▶ Play",
            font=("Segoe UI", 8, "bold"),
            bg="#0284c7",
            fg="white",
            activebackground="#0369a1",
            activeforeground="white",
            relief="flat",
            padx=8,
            pady=2,
            cursor="hand2",
            command=self._toggle_audio_preview
        )
        self.btn_preview_audio.pack(side=tk.LEFT)

        vol_row = tk.Frame(audio_card, bg=CARD_BG)
        vol_row.pack(fill=tk.X)

        tk.Label(vol_row, text="Volume:", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED).pack(side=tk.LEFT, padx=(0, 6))
        self.vol_var = tk.DoubleVar(value=10.0)
        self.vol_slider = ttk.Scale(vol_row, from_=5.0, to=50.0, variable=self.vol_var, command=self._on_volume_change)
        self.vol_slider.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self.vol_val_lbl = tk.Label(vol_row, text="10%", font=("Segoe UI", 8, "bold"), bg=CARD_BG, fg=ACCENT_AMBER, width=4)
        self.vol_val_lbl.pack(side=tk.LEFT)

        # Studio Sync & Output Info Card
        sync_card = tk.Frame(settings_grid, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1, padx=12, pady=8)
        sync_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(6, 0))

        tk.Label(sync_card, text="Studio Metadata Sync:", font=("Segoe UI", 9, "bold"), bg=CARD_BG, fg=ACCENT_CYAN).pack(anchor="w", pady=(0, 4))
        tk.Label(sync_card, text="• Pure Timecodes (00:00, 01:22...)", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_LIGHT).pack(anchor="w")
        tk.Label(sync_card, text="• Team names format in Thumbnail Studio", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED).pack(anchor="w")

        self.gui_sync_status_lbl = tk.Label(sync_card, text="Ready to assemble timeline", font=("Segoe UI", 8, "italic"), bg=CARD_BG, fg="#94a3b8")
        self.gui_sync_status_lbl.pack(anchor="w", pady=(4, 0))

        # Checkboxes & Action Row
        action_card = tk.Frame(self.standard_workspace_frame, bg=BG_DARK)
        action_card.pack(fill=tk.X, pady=(4, 0))

        opts_row = tk.Frame(action_card, bg=BG_DARK)
        opts_row.pack(fill=tk.X, pady=(0, 6))

        self.launch_capcut_var = tk.BooleanVar(value=True)
        chk_capcut = tk.Checkbutton(
            opts_row, text="Open CapCut PC upon completion", variable=self.launch_capcut_var,
            bg=BG_DARK, fg=TEXT_LIGHT, selectcolor="#092f44", activebackground=BG_DARK, activeforeground=TEXT_LIGHT,
            font=("Segoe UI", 9), cursor="hand2"
        )
        chk_capcut.pack(side=tk.LEFT, padx=(0, 16))

        self.sync_cloud_var = tk.BooleanVar(value=True)
        chk_cloud = tk.Checkbutton(
            opts_row, text="Sync Timestamps to Render Cloud (for Phone Studio)", variable=self.sync_cloud_var,
            bg=BG_DARK, fg=TEXT_LIGHT, selectcolor="#092f44", activebackground=BG_DARK, activeforeground=TEXT_LIGHT,
            font=("Segoe UI", 9), cursor="hand2"
        )
        chk_cloud.pack(side=tk.LEFT)

        self.btn_run = tk.Button(
            action_card,
            text="🚀 1-CLICK AUTO-EDIT & OPEN CAPCUT",
            font=("Segoe UI", 12, "bold"),
            bg="#059669",
            fg="white",
            activebackground="#047857",
            activeforeground="white",
            relief="flat",
            pady=10,
            cursor="hand2",
            command=self._on_start_processing
        )
        self.btn_run.pack(fill=tk.X)

        self.progress_lbl = tk.Label(
            action_card,
            text="Ready to synthesize project.",
            font=("Segoe UI", 9),
            bg=BG_DARK,
            fg=TEXT_MUTED
        )
        self.progress_lbl.pack(anchor="center", pady=(4, 0))

        # 4. Showcase Workspace Frame (starts unpacked)
        self.showcase_workspace_frame = tk.Frame(main_container, bg=BG_DARK)
        self._build_showcase_workspace(self.showcase_workspace_frame)

    def _build_showcase_workspace(self, parent):
        # Banner Header
        banner = tk.Frame(parent, bg="#1e1b4b", highlightbackground="#4338ca", highlightthickness=1, padx=12, pady=6)
        banner.pack(fill=tk.X, pady=(0, 8))

        tk.Label(
            banner,
            text="🌟 INVERSE DUAL-RUN PIPELINE • Generates 2 Complete CapCut Projects (One per Team)!",
            font=("Segoe UI", 9, "bold"),
            bg="#1e1b4b",
            fg="#c7d2fe"
        ).pack(anchor="w")

        tk.Label(
            banner,
            text="Run 1: Team A (1st Half) + Team B (2nd Half)  |  Run 2: Team B (1st Half) + Team A (2nd Half)  |  Draft 1: Team A Clears Both  |  Draft 2: Team B Clears Both",
            font=("Segoe UI", 8),
            bg="#1e1b4b",
            fg="#a5b4fc"
        ).pack(anchor="w")

        # Two-Column Arrangement (Run 1 / Team A Left | Run 2 / Team B Right)
        cols_container = tk.Frame(parent, bg=BG_DARK)
        cols_container.pack(fill=tk.X, pady=(0, 6))

        # Left Column: Run 1 (Team A Primary)
        col_run1 = tk.Frame(cols_container, bg=CARD_BG, highlightbackground="#0d9488", highlightthickness=2, padx=8, pady=6)
        col_run1.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 4))

        tk.Label(
            col_run1,
            text="🔵 RUN 1 FOOTAGE (Team A 1st Half / Team B 2nd Half)",
            font=("Segoe UI", 9, "bold"),
            bg=CARD_BG,
            fg="#2dd4bf"
        ).pack(anchor="w", pady=(0, 2))

        # Draft Name input for Team A
        name_row1 = tk.Frame(col_run1, bg=CARD_BG)
        name_row1.pack(fill=tk.X, pady=(0, 4))
        tk.Label(name_row1, text="Draft 1 Name:", font=("Segoe UI", 8, "bold"), bg=CARD_BG, fg="#2dd4bf").pack(side=tk.LEFT, padx=(0, 6))
        ent_team_a = tk.Entry(name_row1, textvariable=self.showcase_team_a_name, font=("Segoe UI", 9, "bold"), bg="#0f172a", fg="white", insertbackground="white", relief="flat")
        ent_team_a.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))

        btn_pick_r1 = tk.Button(
            name_row1,
            text="🎬 Pick 3 Clips...",
            font=("Segoe UI", 8, "bold"),
            bg="#0f766e",
            fg="white",
            relief="flat",
            padx=6,
            pady=2,
            cursor="hand2",
            command=self._on_select_run1_files
        )
        btn_pick_r1.pack(side=tk.RIGHT)

        # 3 Chamber Cards for Run 1
        self.showcase_run1_cards = []
        for c_idx in range(3):
            card = self._build_showcase_chamber_card(col_run1, run_num=1, chamber_idx=c_idx, accent_color="#2dd4bf")
            card.pack(fill=tk.X, pady=2)
            self.showcase_run1_cards.append(card)

        # Right Column: Run 2 (Team B Primary)
        col_run2 = tk.Frame(cols_container, bg=CARD_BG, highlightbackground="#7c3aed", highlightthickness=2, padx=8, pady=6)
        col_run2.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(4, 0))

        tk.Label(
            col_run2,
            text="🟣 RUN 2 FOOTAGE (Team B 1st Half / Team A 2nd Half)",
            font=("Segoe UI", 9, "bold"),
            bg=CARD_BG,
            fg="#c084fc"
        ).pack(anchor="w", pady=(0, 2))

        # Draft Name input for Team B
        name_row2 = tk.Frame(col_run2, bg=CARD_BG)
        name_row2.pack(fill=tk.X, pady=(0, 4))
        tk.Label(name_row2, text="Draft 2 Name:", font=("Segoe UI", 8, "bold"), bg=CARD_BG, fg="#c084fc").pack(side=tk.LEFT, padx=(0, 6))
        ent_team_b = tk.Entry(name_row2, textvariable=self.showcase_team_b_name, font=("Segoe UI", 9, "bold"), bg="#0f172a", fg="white", insertbackground="white", relief="flat")
        ent_team_b.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))

        btn_pick_r2 = tk.Button(
            name_row2,
            text="🎬 Pick 3 Clips...",
            font=("Segoe UI", 8, "bold"),
            bg="#6b21a8",
            fg="white",
            relief="flat",
            padx=6,
            pady=2,
            cursor="hand2",
            command=self._on_select_run2_files
        )
        btn_pick_r2.pack(side=tk.RIGHT)

        # 3 Chamber Cards for Run 2
        self.showcase_run2_cards = []
        for c_idx in range(3):
            card = self._build_showcase_chamber_card(col_run2, run_num=2, chamber_idx=c_idx, accent_color="#c084fc")
            card.pack(fill=tk.X, pady=2)
            self.showcase_run2_cards.append(card)

        # Builds Footage Section (Bottom Span)
        builds_card = tk.Frame(parent, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1, padx=10, pady=6)
        builds_card.pack(fill=tk.X, pady=(0, 6))

        builds_hdr = tk.Frame(builds_card, bg=CARD_BG)
        builds_hdr.pack(fill=tk.X, pady=(0, 4))

        tk.Label(builds_hdr, text="🛠️ BUILDS FOOTAGE ASSIGNMENT:", font=("Segoe UI", 9, "bold"), bg=CARD_BG, fg=ACCENT_AMBER).pack(side=tk.LEFT, padx=(0, 10))

        r_comb = tk.Radiobutton(
            builds_hdr, text="● Combined Clip (Interactive Scrub Splitter)", variable=self.showcase_builds_mode, value="combined",
            bg=CARD_BG, fg=TEXT_LIGHT, selectcolor="#092f44", font=("Segoe UI", 8, "bold"), cursor="hand2",
            command=self._on_builds_mode_changed
        )
        r_comb.pack(side=tk.LEFT, padx=(0, 10))

        r_sep = tk.Radiobutton(
            builds_hdr, text="○ 2 Separate Build Files", variable=self.showcase_builds_mode, value="separate",
            bg=CARD_BG, fg=TEXT_LIGHT, selectcolor="#092f44", font=("Segoe UI", 8), cursor="hand2",
            command=self._on_builds_mode_changed
        )
        r_sep.pack(side=tk.LEFT)

        # Container for Combined Builds (with Slider & Live Scrub Preview)
        self.builds_combined_frame = tk.Frame(builds_card, bg=CARD_BG)
        self.builds_combined_frame.pack(fill=tk.X, pady=(2, 0))

        comb_top = tk.Frame(self.builds_combined_frame, bg=CARD_BG)
        comb_top.pack(fill=tk.X)

        btn_pick_comb = tk.Button(
            comb_top,
            text="🎬 Browse Combined Builds Video...",
            font=("Segoe UI", 8, "bold"),
            bg="#d97706",
            fg="white",
            relief="flat",
            padx=8,
            pady=2,
            cursor="hand2",
            command=self._on_select_combined_builds
        )
        btn_pick_comb.pack(side=tk.LEFT, padx=(0, 8))

        self.comb_builds_fn_lbl = tk.Label(comb_top, text="No combined builds video loaded", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED)
        self.comb_builds_fn_lbl.pack(side=tk.LEFT)

        # Scrub slider and preview row
        slider_row = tk.Frame(self.builds_combined_frame, bg=CARD_BG)
        slider_row.pack(fill=tk.X, pady=(4, 0))

        # Mini scrub thumbnail preview
        self.scrub_thumb_lbl = tk.Label(slider_row, bg="#070d19", width=128, height=60, text="[Scrub Frame]", fg=TEXT_MUTED, font=("Segoe UI", 7))
        self.scrub_thumb_lbl.pack(side=tk.LEFT, padx=(0, 8))

        slider_inner = tk.Frame(slider_row, bg=CARD_BG)
        slider_inner.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.split_info_lbl = tk.Label(
            slider_inner,
            text="Scrub Split: 30.0s (00:30)  |  ◀ Team A: 00:00 - 00:30  |  Team B: 00:30 - End ▶",
            font=("Segoe UI", 8, "bold"),
            bg=CARD_BG,
            fg=ACCENT_AMBER
        )
        self.split_info_lbl.pack(anchor="w", pady=(0, 2))

        self.builds_scale = ttk.Scale(
            slider_inner,
            from_=0.0,
            to=60.0,
            variable=self.showcase_split_sec,
            command=self._on_scrub_change
        )
        self.builds_scale.pack(fill=tk.X)

        # Container for Separate Builds (starts hidden)
        self.builds_separate_frame = tk.Frame(builds_card, bg=CARD_BG)

        sep_row1 = tk.Frame(self.builds_separate_frame, bg=CARD_BG)
        sep_row1.pack(fill=tk.X, pady=2)
        btn_pick_a_b = tk.Button(sep_row1, text="📁 Team A Builds File...", font=("Segoe UI", 8), bg="#0f766e", fg="white", relief="flat", padx=6, pady=2, command=self._on_select_team_a_builds)
        btn_pick_a_b.pack(side=tk.LEFT, padx=(0, 6))
        self.sep_a_fn_lbl = tk.Label(sep_row1, text="No file selected", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED)
        self.sep_a_fn_lbl.pack(side=tk.LEFT)

        sep_row2 = tk.Frame(self.builds_separate_frame, bg=CARD_BG)
        sep_row2.pack(fill=tk.X, pady=2)
        btn_pick_b_b = tk.Button(sep_row2, text="📁 Team B Builds File...", font=("Segoe UI", 8), bg="#6b21a8", fg="white", relief="flat", padx=6, pady=2, command=self._on_select_team_b_builds)
        btn_pick_b_b.pack(side=tk.LEFT, padx=(0, 6))
        self.sep_b_fn_lbl = tk.Label(sep_row2, text="No file selected", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED)
        self.sep_b_fn_lbl.pack(side=tk.LEFT)

        # Showcase Settings & Big Action Row
        showcase_action_card = tk.Frame(parent, bg=BG_DARK)
        showcase_action_card.pack(fill=tk.X, pady=(4, 0))

        showcase_opts_row = tk.Frame(showcase_action_card, bg=BG_DARK)
        showcase_opts_row.pack(fill=tk.X, pady=(0, 6))

        tk.Label(showcase_opts_row, text="Transitions:", font=("Segoe UI", 8, "bold"), bg=BG_DARK, fg=TEXT_LIGHT).pack(side=tk.LEFT, padx=(0, 4))
        tk.Radiobutton(showcase_opts_row, text="Black Fade", variable=self.trans_var, value="black_fade", bg=BG_DARK, fg="#67e8f9", selectcolor="#092f44", font=("Segoe UI", 8, "bold")).pack(side=tk.LEFT, padx=(0, 6))
        tk.Radiobutton(showcase_opts_row, text="Woosh", variable=self.trans_var, value="woosh", bg=BG_DARK, fg=TEXT_LIGHT, selectcolor="#092f44", font=("Segoe UI", 8)).pack(side=tk.LEFT, padx=(0, 12))

        chk_sc_cc = tk.Checkbutton(showcase_opts_row, text="Launch CapCut", variable=self.launch_capcut_var, bg=BG_DARK, fg=TEXT_LIGHT, selectcolor="#092f44", font=("Segoe UI", 8))
        chk_sc_cc.pack(side=tk.LEFT, padx=(0, 10))

        chk_sc_cl = tk.Checkbutton(showcase_opts_row, text="Cloud Sync Timestamps", variable=self.sync_cloud_var, bg=BG_DARK, fg=TEXT_LIGHT, selectcolor="#092f44", font=("Segoe UI", 8))
        chk_sc_cl.pack(side=tk.LEFT)

        self.btn_run_showcase = tk.Button(
            showcase_action_card,
            text="🚀 AUTO-EDIT 2 CAPCUT SHOWCASES (Draft 1 & Draft 2)",
            font=("Segoe UI", 12, "bold"),
            bg="#7c3aed",
            fg="white",
            activebackground="#6d28d9",
            activeforeground="white",
            relief="flat",
            pady=10,
            cursor="hand2",
            command=self._on_start_showcase_processing
        )
        self.btn_run_showcase.pack(fill=tk.X)

        self.showcase_progress_lbl = tk.Label(
            showcase_action_card,
            text="Assign Run 1 and Run 2 footage above, then click synthesize.",
            font=("Segoe UI", 9),
            bg=BG_DARK,
            fg=TEXT_MUTED
        )
        self.showcase_progress_lbl.pack(anchor="center", pady=(4, 0))

    def _build_showcase_chamber_card(self, parent, run_num: int, chamber_idx: int, accent_color: str) -> tk.Frame:
        card = tk.Frame(parent, bg="#0f172a", highlightbackground="#334155", highlightthickness=1, padx=4, pady=4)

        top_bar = tk.Frame(card, bg="#0f172a")
        top_bar.pack(fill=tk.X, pady=(0, 2))

        ch_name = f"Chamber {chamber_idx + 1}"
        tk.Label(top_bar, text=ch_name.upper(), font=("Segoe UI", 7, "bold"), bg="#0f172a", fg=accent_color).pack(side=tk.LEFT)

        if chamber_idx > 0:
            btn_up = tk.Button(
                top_bar, text="▲", font=("Segoe UI", 6), bg="#1e293b", fg=TEXT_LIGHT, relief="flat", padx=2, pady=0,
                command=lambda: self._swap_showcase_slots(run_num, chamber_idx, chamber_idx - 1)
            )
            btn_up.pack(side=tk.RIGHT, padx=(1, 0))

        if chamber_idx < 2:
            btn_down = tk.Button(
                top_bar, text="▼", font=("Segoe UI", 6), bg="#1e293b", fg=TEXT_LIGHT, relief="flat", padx=2, pady=0,
                command=lambda: self._swap_showcase_slots(run_num, chamber_idx, chamber_idx + 1)
            )
            btn_down.pack(side=tk.RIGHT)

        body_row = tk.Frame(card, bg="#0f172a")
        body_row.pack(fill=tk.X)

        thumb_lbl = tk.Label(body_row, bg="#070d19", width=96, height=54, text="[No Clip]", fg=TEXT_MUTED, font=("Segoe UI", 7))
        thumb_lbl.pack(side=tk.LEFT, padx=(0, 6))

        info_col = tk.Frame(body_row, bg="#0f172a")
        info_col.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        fn_lbl = tk.Label(info_col, text="Empty slot", font=("Segoe UI", 7), bg="#0f172a", fg=TEXT_MUTED, anchor="w", wraplength=140)
        fn_lbl.pack(anchor="w")

        dur_lbl = tk.Label(info_col, text="⏱ --:--", font=("Segoe UI", 7, "bold"), bg="#0f172a", fg=TEXT_LIGHT, anchor="w")
        dur_lbl.pack(anchor="w")

        action_row = tk.Frame(info_col, bg="#0f172a")
        action_row.pack(anchor="w", pady=(2, 0))

        btn_play = tk.Button(
            action_row, text="▶", font=("Segoe UI", 7, "bold"), bg="#0284c7", fg="white", relief="flat", padx=4, pady=0,
            cursor="hand2", command=lambda: self._preview_showcase_clip(run_num, chamber_idx)
        )
        btn_play.pack(side=tk.LEFT, padx=(0, 4))

        btn_browse = tk.Button(
            action_row, text="📁 Browse", font=("Segoe UI", 7), bg="#334155", fg=TEXT_LIGHT, relief="flat", padx=4, pady=0,
            cursor="hand2", command=lambda: self._change_showcase_slot_file(run_num, chamber_idx)
        )
        btn_browse.pack(side=tk.LEFT)

        card.thumb_lbl = thumb_lbl
        card.fn_lbl = fn_lbl
        card.dur_lbl = dur_lbl
        card.btn_play = btn_play

        return card

    def _switch_mode(self, mode: str):
        if mode == self.app_mode:
            return
        self.app_mode = mode
        if mode == "standard":
            self.btn_mode_std.config(bg="#0284c7", fg="white")
            self.btn_mode_showcase.config(bg="#1e293b", fg="#94a3b8")
            self.showcase_workspace_frame.pack_forget()
            self.standard_workspace_frame.pack(fill=tk.BOTH, expand=True)
        else:
            self.btn_mode_std.config(bg="#1e293b", fg="#94a3b8")
            self.btn_mode_showcase.config(bg="#7c3aed", fg="white")
            self.standard_workspace_frame.pack_forget()
            self.showcase_workspace_frame.pack(fill=tk.BOTH, expand=True)

    def _on_builds_mode_changed(self):
        m = self.showcase_builds_mode.get()
        if m == "combined":
            self.builds_separate_frame.pack_forget()
            self.builds_combined_frame.pack(fill=tk.X, pady=(2, 0))
        else:
            self.builds_combined_frame.pack_forget()
            self.builds_separate_frame.pack(fill=tk.X, pady=(2, 0))

    def _on_select_run1_files(self):
        files = filedialog.askopenfilenames(
            title="Select 3 Video Files for Run 1 (C1, C2, C3)",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if files:
            paths = sorted([Path(f) for f in files], key=lambda x: x.stat().st_mtime)
            self.showcase_run1_clips = [None, None, None]
            for i in range(min(3, len(paths))):
                self.showcase_run1_clips[i] = paths[i]
            self._render_showcase_cards()

    def _on_select_run2_files(self):
        files = filedialog.askopenfilenames(
            title="Select 3 Video Files for Run 2 (C1, C2, C3)",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if files:
            paths = sorted([Path(f) for f in files], key=lambda x: x.stat().st_mtime)
            self.showcase_run2_clips = [None, None, None]
            for i in range(min(3, len(paths))):
                self.showcase_run2_clips[i] = paths[i]
            self._render_showcase_cards()

    def _change_showcase_slot_file(self, run_num: int, chamber_idx: int):
        f = filedialog.askopenfilename(
            title=f"Select Video for Run {run_num} Chamber {chamber_idx + 1}",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if f:
            if run_num == 1:
                self.showcase_run1_clips[chamber_idx] = Path(f)
            else:
                self.showcase_run2_clips[chamber_idx] = Path(f)
            self._render_showcase_cards()

    def _swap_showcase_slots(self, run_num: int, idx1: int, idx2: int):
        if run_num == 1:
            if 0 <= idx1 < 3 and 0 <= idx2 < 3:
                self.showcase_run1_clips[idx1], self.showcase_run1_clips[idx2] = self.showcase_run1_clips[idx2], self.showcase_run1_clips[idx1]
        else:
            if 0 <= idx1 < 3 and 0 <= idx2 < 3:
                self.showcase_run2_clips[idx1], self.showcase_run2_clips[idx2] = self.showcase_run2_clips[idx2], self.showcase_run2_clips[idx1]
        self._render_showcase_cards()

    def _preview_showcase_clip(self, run_num: int, chamber_idx: int):
        clip = self.showcase_run1_clips[chamber_idx] if run_num == 1 else self.showcase_run2_clips[chamber_idx]
        if clip and clip.exists():
            try:
                os.startfile(str(clip))
            except Exception as e:
                messagebox.showerror("Play Error", f"Could not open clip: {e}")

    def _render_showcase_cards(self):
        # Render Run 1 cards
        for idx, card in enumerate(self.showcase_run1_cards):
            clip = self.showcase_run1_clips[idx]
            if clip and clip.exists():
                name_txt = clip.name
                if len(name_txt) > 20:
                    name_txt = name_txt[:9] + "..." + name_txt[-8:]
                card.fn_lbl.config(text=name_txt, fg=TEXT_LIGHT)
                try:
                    dur_s, _, _, _ = probe_video_metadata(clip)
                    cut_dur_s = estimate_chamber_cut_duration(clip, is_builds=False)
                    card.dur_lbl.config(text=f"⏱ {format_timestamp(cut_dur_s)} ({format_timestamp(dur_s)} raw)")
                except Exception:
                    card.dur_lbl.config(text="⏱ --:--")
                threading.Thread(target=self._load_showcase_thumbnail, args=(card, clip), daemon=True).start()
            else:
                card.fn_lbl.config(text="Empty slot", fg=TEXT_MUTED)
                card.dur_lbl.config(text="⏱ --:--")
                card.thumb_lbl.config(image="", text="[No Clip]")

        # Render Run 2 cards
        for idx, card in enumerate(self.showcase_run2_cards):
            clip = self.showcase_run2_clips[idx]
            if clip and clip.exists():
                name_txt = clip.name
                if len(name_txt) > 20:
                    name_txt = name_txt[:9] + "..." + name_txt[-8:]
                card.fn_lbl.config(text=name_txt, fg=TEXT_LIGHT)
                try:
                    dur_s, _, _, _ = probe_video_metadata(clip)
                    cut_dur_s = estimate_chamber_cut_duration(clip, is_builds=False)
                    card.dur_lbl.config(text=f"⏱ {format_timestamp(cut_dur_s)} ({format_timestamp(dur_s)} raw)")
                except Exception:
                    card.dur_lbl.config(text="⏱ --:--")
                threading.Thread(target=self._load_showcase_thumbnail, args=(card, clip), daemon=True).start()
            else:
                card.fn_lbl.config(text="Empty slot", fg=TEXT_MUTED)
                card.dur_lbl.config(text="⏱ --:--")
                card.thumb_lbl.config(image="", text="[No Clip]")

        # Update status
        r1_count = sum(1 for c in self.showcase_run1_clips if c is not None)
        r2_count = sum(1 for c in self.showcase_run2_clips if c is not None)
        if r1_count == 3 and r2_count == 3:
            self.showcase_progress_lbl.config(text="✓ Both runs complete (3/3 clips each). Ready to synthesize!", fg=ACCENT_GREEN)
        else:
            self.showcase_progress_lbl.config(text=f"Assigned: Run 1 ({r1_count}/3) | Run 2 ({r2_count}/3)", fg=ACCENT_AMBER)

    def _load_showcase_thumbnail(self, card, clip_path: Path):
        try:
            thumb_file = get_or_create_thumbnail(clip_path, seek_s=24.0, width=96, height=54)
            if thumb_file.exists():
                pil_img = Image.open(thumb_file)
                tk_img = ImageTk.PhotoImage(pil_img)
                self.root.after(0, self._apply_showcase_thumb, card, tk_img)
        except Exception:
            pass

    def _apply_showcase_thumb(self, card, tk_img):
        card.thumb_lbl.config(image=tk_img, text="")
        card.thumb_lbl.image = tk_img

    def _on_select_combined_builds(self):
        f = filedialog.askopenfilename(
            title="Select Combined Builds Video (Featuring both teams)",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if f:
            p = Path(f)
            self.showcase_combined_builds = p
            fn_txt = p.name
            try:
                dur_s, _, _, _ = probe_video_metadata(p)
                self.combined_builds_dur = dur_s
                self.comb_builds_fn_lbl.config(text=f"{fn_txt} ({format_timestamp(dur_s)})", fg=TEXT_LIGHT)
                self.builds_scale.config(to=dur_s)
                default_split = dur_s / 2.0
                self.showcase_split_sec.set(default_split)
                self._update_split_info_text(default_split)
                self._trigger_scrub_preview(default_split)
            except Exception:
                self.comb_builds_fn_lbl.config(text=fn_txt, fg=TEXT_LIGHT)

    def _on_scrub_change(self, val):
        sec = float(val)
        self.showcase_split_sec.set(sec)
        self._update_split_info_text(sec)
        # Debounce preview extraction
        if self._scrub_timer:
            self.root.after_cancel(self._scrub_timer)
        self._scrub_timer = self.root.after(70, lambda: self._trigger_scrub_preview(sec))

    def _update_split_info_text(self, sec: float):
        total = self.combined_builds_dur
        team_a_dur = sec
        team_b_dur = max(0.0, total - sec)
        self.split_info_lbl.config(
            text=f"Split at: {format_timestamp(sec)} ({sec:.1f}s)  |  ◀ Team A: 00:00 - {format_timestamp(sec)} ({format_timestamp(team_a_dur)})  |  Team B: {format_timestamp(sec)} - {format_timestamp(total)} ({format_timestamp(team_b_dur)}) ▶"
        )

    def _trigger_scrub_preview(self, sec: float):
        if not self.showcase_combined_builds or not self.showcase_combined_builds.exists():
            return
        threading.Thread(target=self._extract_and_apply_scrub_preview, args=(self.showcase_combined_builds, sec), daemon=True).start()

    def _extract_and_apply_scrub_preview(self, video_path: Path, sec: float):
        pil_img = extract_video_frame(video_path, sec, width=128, height=72)
        if pil_img:
            tk_img = ImageTk.PhotoImage(pil_img)
            self.root.after(0, self._apply_scrub_thumb, tk_img)

    def _apply_scrub_thumb(self, tk_img):
        self.scrub_preview_img = tk_img
        self.scrub_thumb_lbl.config(image=tk_img, text="")
        self.scrub_thumb_lbl.image = tk_img

    def _on_select_team_a_builds(self):
        f = filedialog.askopenfilename(
            title="Select Team A Character Builds Video",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if f:
            self.showcase_team_a_builds = Path(f)
            self.sep_a_fn_lbl.config(text=self.showcase_team_a_builds.name, fg=TEXT_LIGHT)

    def _on_select_team_b_builds(self):
        f = filedialog.askopenfilename(
            title="Select Team B Character Builds Video",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if f:
            self.showcase_team_b_builds = Path(f)
            self.sep_b_fn_lbl.config(text=self.showcase_team_b_builds.name, fg=TEXT_LIGHT)

    def _on_start_showcase_processing(self):
        if self.is_processing:
            return

        self.audio_player.stop()

        r1_files = [c for c in self.showcase_run1_clips if c is not None and c.exists()]
        r2_files = [c for c in self.showcase_run2_clips if c is not None and c.exists()]

        if len(r1_files) < 3:
            messagebox.showerror("Incomplete Footage", "Please assign all 3 clips (Chambers 1, 2, 3) for Run 1.")
            return

        if len(r2_files) < 3:
            messagebox.showerror("Incomplete Footage", "Please assign all 3 clips (Chambers 1, 2, 3) for Run 2.")
            return

        b_mode = self.showcase_builds_mode.get()
        if b_mode == "combined":
            if not self.showcase_combined_builds or not self.showcase_combined_builds.exists():
                messagebox.showerror("Missing Builds Video", "Please select the combined character builds video.")
                return
        else:
            if not self.showcase_team_a_builds or not self.showcase_team_b_builds:
                messagebox.showerror("Missing Builds Video", "Please select both Team A and Team B builds videos.")
                return

        if is_capcut_running():
            resp = messagebox.askyesno(
                "CapCut is Running",
                "CapCut PC is currently running.\nCapCut locks draft files while open, which may prevent new showcase projects from showing up immediately.\n\nProceed anyway?"
            )
            if not resp:
                return

        self.is_processing = True
        self.btn_run_showcase.config(state=tk.DISABLED, bg="#475569", text="⏳ SYNTHESIZING DUAL SHOWCASES & SLICING RUNS...")
        self.showcase_progress_lbl.config(text="Detecting loading screens and cutting inverse segments...", fg=ACCENT_CYAN)

        threading.Thread(target=self._run_showcase_pipeline_worker, daemon=True).start()

    def _run_showcase_pipeline_worker(self):
        try:
            r1_files = [c for c in self.showcase_run1_clips if c is not None]
            r2_files = [c for c in self.showcase_run2_clips if c is not None]
            team_a = self.showcase_team_a_name.get().strip() or "Team A Showcase"
            team_b = self.showcase_team_b_name.get().strip() or "Team B Showcase"

            b_mode = self.showcase_builds_mode.get()
            split_s = self.showcase_split_sec.get() if b_mode == "combined" else 0.0
            comb_builds = self.showcase_combined_builds if b_mode == "combined" else None
            a_builds = self.showcase_team_a_builds if b_mode == "separate" else None
            b_builds = self.showcase_team_b_builds if b_mode == "separate" else None

            trans = self.trans_var.get()
            vol = self.vol_var.get() / 100.0
            open_cc = self.launch_capcut_var.get()
            sync_cl = self.sync_cloud_var.get()

            results = assemble_inverse_showcase_projects(
                run1_files=r1_files,
                run2_files=r2_files,
                team_a_name=team_a,
                team_b_name=team_b,
                builds_split_seconds=split_s,
                combined_builds_file=comb_builds,
                team_a_builds_file=a_builds,
                team_b_builds_file=b_builds,
                transition_type=trans,
                music_volume=vol,
                sync_to_cloud=sync_cl,
                auto_launch=open_cc
            )
            self.root.after(0, self._on_showcase_pipeline_success, results)
        except Exception as e:
            self.root.after(0, self._on_showcase_pipeline_error, str(e))

    def _on_showcase_pipeline_success(self, results: dict):
        self.is_processing = False
        self.btn_run_showcase.config(state=tk.NORMAL, bg="#7c3aed", text="🚀 AUTO-EDIT 2 CAPCUT SHOWCASES (Draft 1 & Draft 2)")
        self.showcase_progress_lbl.config(
            text="✓ Successfully synthesized both showcase drafts & synced cloud!",
            fg=ACCENT_GREEN
        )

        p_a = results.get("team_a_project", {})
        p_b = results.get("team_b_project", {})

        name_a = p_a.get("project_name", "Team A")
        dur_a = p_a.get("total_duration_formatted", "--:--")
        stars_a = p_a.get("compliance_summary", {}).get("total_stars", 9)
        chaps_a = p_a.get("chapter_text", "")

        name_b = p_b.get("project_name", "Team B")
        dur_b = p_b.get("total_duration_formatted", "--:--")
        stars_b = p_b.get("compliance_summary", {}).get("total_stars", 9)
        chaps_b = p_b.get("chapter_text", "")

        all_chapters = f"=== {name_a} SHOWCASE ===\n{chaps_a}\n\n=== {name_b} SHOWCASE ===\n{chaps_b}"

        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(all_chapters)
            self.root.update()
        except Exception:
            pass

        summary_msg = (
            f"🎉 2 Showcase Projects Created Successfully!\n\n"
            f"🔵 Draft 1: {name_a}\n"
            f"   Duration: {dur_a} | 3-Star Compliance: {stars_a}/9 Stars ⭐\n\n"
            f"🟣 Draft 2: {name_b}\n"
            f"   Duration: {dur_b} | 3-Star Compliance: {stars_b}/9 Stars ⭐\n\n"
            f"✓ All YouTube Chapter Timestamps copied to your clipboard!"
        )
        messagebox.showinfo("Dual Showcase Synthesis Complete!", summary_msg)

    def _on_showcase_pipeline_error(self, err_msg: str):
        self.is_processing = False
        self.btn_run_showcase.config(state=tk.NORMAL, bg="#7c3aed", text="🚀 AUTO-EDIT 2 CAPCUT SHOWCASES (Draft 1 & Draft 2)")
        self.showcase_progress_lbl.config(text=f"Error: {err_msg}", fg="#f87171")
        messagebox.showerror("Showcase Pipeline Error", f"An error occurred while creating showcase drafts:\n{err_msg}")

    def _build_clip_card(self, parent, slot_idx: int, slot_title: str) -> tk.Frame:
        card = tk.Frame(parent, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1, padx=6, pady=6)

        # Slot Header
        hdr = tk.Frame(card, bg=CARD_BG)
        hdr.pack(fill=tk.X, pady=(0, 4))

        color = ACCENT_AMBER if "Builds" in slot_title else ACCENT_CYAN
        badge = tk.Label(hdr, text=slot_title.upper(), font=("Segoe UI", 8, "bold"), bg=CARD_BG, fg=color)
        badge.pack(side=tk.LEFT)

        btn_swap_left = tk.Button(
            hdr, text="◀", font=("Segoe UI", 7), bg="#334155", fg=TEXT_LIGHT, relief="flat", padx=3, pady=1,
            command=lambda: self._swap_slots(slot_idx, slot_idx - 1)
        )
        if slot_idx > 0:
            btn_swap_left.pack(side=tk.RIGHT, padx=(2, 0))

        btn_swap_right = tk.Button(
            hdr, text="▶", font=("Segoe UI", 7), bg="#334155", fg=TEXT_LIGHT, relief="flat", padx=3, pady=1,
            command=lambda: self._swap_slots(slot_idx, slot_idx + 1)
        )
        if slot_idx < 3:
            btn_swap_right.pack(side=tk.RIGHT)

        # Thumbnail Canvas / Label
        thumb_lbl = tk.Label(card, bg="#070d19", width=160, height=90)
        thumb_lbl.pack(pady=(0, 4))

        # Details
        fn_lbl = tk.Label(card, text="No video selected", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED, wraplength=160)
        fn_lbl.pack(pady=(0, 2))

        dur_lbl = tk.Label(card, text="--:--", font=("Segoe UI", 8, "bold"), bg=CARD_BG, fg=TEXT_LIGHT)
        dur_lbl.pack(pady=(0, 2))

        bgm_row = tk.Frame(card, bg=CARD_BG)
        bgm_row.pack(fill=tk.X, pady=(0, 4))

        bgm_lbl = tk.Label(bgm_row, text="♫ BGM: Auto Match", font=("Segoe UI", 7), bg=CARD_BG, fg="#38bdf8", wraplength=105)
        bgm_lbl.pack(side=tk.LEFT, fill=tk.X, expand=True)

        btn_pick_bgm = tk.Button(
            bgm_row, text="♫ Track", font=("Segoe UI", 7, "bold"), bg="#1e3a5f", fg="#38bdf8",
            activebackground="#0284c7", activeforeground="white", relief="flat", padx=4, pady=1,
            cursor="hand2", command=lambda: self._open_desktop_track_picker(slot_idx)
        )
        btn_pick_bgm.pack(side=tk.RIGHT)

        # Action Button Row (Play / Change)
        btn_row = tk.Frame(card, bg=CARD_BG)
        btn_row.pack(fill=tk.X)

        btn_play = tk.Button(
            btn_row, text="▶ Audition", font=("Segoe UI", 8, "bold"), bg="#0284c7", fg=TEXT_LIGHT, relief="flat", padx=6, pady=2,
            cursor="hand2", command=lambda: self._preview_video(slot_idx)
        )
        btn_play.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 2))

        btn_change = tk.Button(
            btn_row, text="📁", font=("Segoe UI", 8), bg="#334155", fg=TEXT_LIGHT, relief="flat", padx=4, pady=2,
            cursor="hand2", command=lambda: self._change_slot_file(slot_idx)
        )
        btn_change.pack(side=tk.LEFT)

        card.thumb_lbl = thumb_lbl
        card.fn_lbl = fn_lbl
        card.dur_lbl = dur_lbl
        card.bgm_lbl = bgm_lbl
        card.btn_play = btn_play

        return card

    def _swap_slots(self, idx1: int, idx2: int):
        if 0 <= idx1 < 4 and 0 <= idx2 < 4:
            self.selected_clips[idx1], self.selected_clips[idx2] = self.selected_clips[idx2], self.selected_clips[idx1]
            self._render_cards()

    def _preview_video(self, slot_idx: int):
        clip = self.selected_clips[slot_idx]
        if clip and clip.exists():
            try:
                import webbrowser
                import urllib.request
                server_running = False
                try:
                    with urllib.request.urlopen("http://localhost:7860/api/health", timeout=0.6) as resp:
                        if resp.status == 200:
                            server_running = True
                except Exception:
                    pass

                if not server_running:
                    app_script = PROJECT_DIR / "app.py"
                    python_exe = sys.executable
                    subprocess.Popen([python_exe, str(app_script)], creationflags=0x08000000)
                    time.sleep(1.2)

                webbrowser.open(f"http://localhost:7860/?audition={slot_idx}")
            except Exception:
                try:
                    os.startfile(str(clip))
                except Exception as e:
                    messagebox.showerror("Play Error", f"Could not launch video: {e}")

    def _change_slot_file(self, slot_idx: int):
        f = filedialog.askopenfilename(
            title=f"Select Replacement Video for Slot {slot_idx+1}",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if f:
            self.selected_clips[slot_idx] = Path(f)
            self._render_cards()

    def _open_desktop_track_picker(self, slot_idx: int):
        slot_names = ["Chamber 1", "Chamber 2", "Chamber 3", "Character Builds Outro"]
        slot_name = slot_names[slot_idx]

        clip = self.selected_clips[slot_idx]
        target_sec = 90.0
        if clip and clip.exists():
            try:
                target_sec = estimate_chamber_cut_duration(clip, is_builds=(slot_idx == 3))
            except Exception:
                pass

        catalog_path = PROJECT_DIR / "data" / "cache" / "music_catalog.json"
        tracks_data = []
        if catalog_path.exists():
            try:
                with open(catalog_path, "r", encoding="utf-8") as f:
                    tracks_data = json.load(f)
            except Exception:
                pass

        picker = tk.Toplevel(self.root)
        picker.title(f"Select Custom BGM for {slot_name}")
        picker.geometry("640x520")
        picker.configure(bg=BG_DARK)
        picker.transient(self.root)
        picker.grab_set()

        hdr = tk.Frame(picker, bg=BG_DARK, padx=14, pady=10)
        hdr.pack(fill=tk.X)

        tk.Label(
            hdr,
            text=f"🎵 Select Custom Soundtrack for {slot_name}",
            font=("Segoe UI", 12, "bold"),
            bg=BG_DARK,
            fg=TEXT_LIGHT
        ).pack(anchor="w")

        tk.Label(
            hdr,
            text=f"Clip target duration: {format_timestamp(target_sec)} ({target_sec:.1f}s). Tracks sorted by length proximity & tone fit.",
            font=("Segoe UI", 8),
            bg=BG_DARK,
            fg=TEXT_MUTED
        ).pack(anchor="w", pady=(2, 0))

        search_frame = tk.Frame(picker, bg=CARD_BG, padx=10, pady=6)
        search_frame.pack(fill=tk.X, padx=14, pady=(0, 8))

        tk.Label(search_frame, text="Filter:", font=("Segoe UI", 8, "bold"), bg=CARD_BG, fg=ACCENT_CYAN).pack(side=tk.LEFT, padx=(0, 6))
        filter_var = tk.StringVar()
        ent_filter = tk.Entry(search_frame, textvariable=filter_var, font=("Segoe UI", 9), bg="#0f172a", fg="white", insertbackground="white", relief="flat")
        ent_filter.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))

        list_frame = tk.Frame(picker, bg=CARD_BG)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 8))

        scroll = ttk.Scrollbar(list_frame)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)

        tree = ttk.Treeview(
            list_frame,
            columns=("name", "duration", "energy", "delta"),
            show="headings",
            yscrollcommand=scroll.set,
            selectmode="browse"
        )
        scroll.config(command=tree.yview)

        tree.heading("name", text="Track Name")
        tree.heading("duration", text="Length")
        tree.heading("energy", text="Energy / Mood")
        tree.heading("delta", text="Fit (Delta)")

        tree.column("name", width=280)
        tree.column("duration", width=65, anchor="center")
        tree.column("energy", width=110, anchor="center")
        tree.column("delta", width=80, anchor="center")
        tree.pack(fill=tk.BOTH, expand=True)

        tracks_with_fit = []
        for t in tracks_data:
            dur = t.get("duration", 0)
            delta = dur - target_sec
            tracks_with_fit.append({
                "track": t,
                "delta": delta,
                "abs_delta": abs(delta)
            })

        tracks_with_fit.sort(key=lambda x: (0 if -10 <= x["delta"] <= 20 else 1, x["abs_delta"]))

        def update_list(*args):
            query = filter_var.get().strip().lower()
            tree.delete(*tree.get_children())
            for item in tracks_with_fit:
                t = item["track"]
                name = t.get("name", "")
                if query and query not in name.lower():
                    continue
                dur = t.get("duration", 0)
                dur_str = f"{int(dur // 60):02d}:{int(dur % 60):02d}"
                energy = t.get("energy", "combat").capitalize()
                delta = item["delta"]
                delta_str = f"+{delta:.0f}s" if delta > 0 else f"{delta:.0f}s"
                tree.insert("", tk.END, values=(name, dur_str, energy, delta_str), tags=(t.get("file_path", ""),))

        filter_var.trace_add("write", update_list)
        update_list()

        btn_bar = tk.Frame(picker, bg=BG_DARK, padx=14, pady=10)
        btn_bar.pack(fill=tk.X)

        def do_listen():
            sel = tree.selection()
            if not sel:
                return
            tags = tree.item(sel[0], "tags")
            if tags:
                file_rel = tags[0]
                full_path = PROJECT_DIR / file_rel
                if full_path.exists():
                    self.audio_player.play(full_path)

        btn_listen = tk.Button(
            btn_bar, text="▶ Audition Track", font=("Segoe UI", 9, "bold"), bg="#0284c7", fg="white",
            relief="flat", padx=10, pady=4, cursor="hand2", command=do_listen
        )
        btn_listen.pack(side=tk.LEFT, padx=(0, 8))

        def do_select():
            sel = tree.selection()
            if not sel:
                return
            tags = tree.item(sel[0], "tags")
            if tags:
                file_rel = tags[0]
                matched_track = None
                for t in tracks_data:
                    if t.get("file_path") == file_rel:
                        matched_track = t
                        break
                if matched_track:
                    self.custom_bgm_suite[slot_idx] = matched_track
                    self._update_card_bgm_recommendations()
            self.audio_player.stop()
            picker.destroy()

        btn_apply = tk.Button(
            btn_bar, text="✓ Assign Track to Slot", font=("Segoe UI", 9, "bold"), bg="#059669", fg="white",
            relief="flat", padx=12, pady=4, cursor="hand2", command=do_select
        )
        btn_apply.pack(side=tk.RIGHT)

        btn_cancel = tk.Button(
            btn_bar, text="Cancel", font=("Segoe UI", 9), bg="#334155", fg=TEXT_LIGHT,
            relief="flat", padx=10, pady=4, cursor="hand2", command=lambda: [self.audio_player.stop(), picker.destroy()]
        )
        btn_cancel.pack(side=tk.RIGHT, padx=(0, 8))

    def _toggle_audio_preview(self):
        if self.audio_player.is_playing():
            self.audio_player.stop()
            self.btn_preview_audio.config(text="▶ Play", bg="#0284c7")
        else:
            if self.music_file and self.music_file.exists():
                self.audio_player.play(self.music_file)
                self.btn_preview_audio.config(text="■ Stop", bg="#ef4444")
            else:
                messagebox.showinfo("No Music", "No background music file is currently selected.")

    def _on_music_selected(self, event):
        idx = self.music_combobox.current()
        if 0 <= idx < len(self.music_files_list):
            self.music_file = self.music_files_list[idx]
            if self.audio_player.is_playing():
                self.audio_player.play(self.music_file)

    def _on_browse_audio(self):
        f = filedialog.askopenfilename(
            title="Select Custom Background Music (WAV / MP3)",
            filetypes=[("Audio Files", "*.mp3 *.wav *.flac *.m4a *.aac"), ("All Files", "*.*")]
        )
        if f:
            p = Path(f)
            self.music_file = p
            self.music_combobox.set(p.name)
            if self.audio_player.is_playing():
                self.audio_player.play(self.music_file)

    def _on_volume_change(self, val):
        self.vol_val_lbl.config(text=f"{int(float(val))}%")

    def _load_defaults(self):
        music_tracks = list_available_music()
        self.music_files_list = music_tracks
        track_labels = [p.name for p in music_tracks]
        self.music_combobox["values"] = track_labels

        if self.music_files_list:
            self.music_combobox.current(0)
            self.music_file = self.music_files_list[0]

        self._refresh_sessions()

    def _refresh_sessions(self):
        if not DEFAULT_INPUT_DIR.exists():
            self.status_badge.config(text=f"Folder not found: {DEFAULT_INPUT_DIR}", fg="#f87171")
            return

        self.available_sessions = cluster_recording_sessions(DEFAULT_INPUT_DIR)
        session_labels = []
        for idx, s in enumerate(self.available_sessions):
            tag = "★ " if idx == 0 else ""
            session_labels.append(f"{tag}{s['label']}")

        self.session_combobox["values"] = session_labels
        if session_labels:
            self.session_combobox.current(0)
            self._load_session(0)
        else:
            self.status_badge.config(text="No recordings found", fg="#f87171")

    def _on_session_selected(self, event):
        idx = self.session_combobox.current()
        if idx >= 0 and idx < len(self.available_sessions):
            self._load_session(idx)

    def _load_session(self, idx: int):
        session = self.available_sessions[idx]
        clips = session["clips"]
        self.selected_clips = [None, None, None, None]
        for i in range(min(4, len(clips))):
            self.selected_clips[i] = clips[i]
        self.custom_bgm_suite = [None, None, None, None]
        self._render_cards()

    def _on_select_files(self):
        files = filedialog.askopenfilenames(
            title="Select 3 or 4 Abyss Recordings",
            filetypes=[("MP4 Video Files", "*.mp4"), ("All Files", "*.*")]
        )
        if files:
            paths = sorted([Path(f) for f in files], key=lambda x: x.stat().st_mtime)
            self.selected_clips = [None, None, None, None]
            for i in range(min(4, len(paths))):
                self.selected_clips[i] = paths[i]
            self.custom_bgm_suite = [None, None, None, None]
            self._render_cards()

    def _on_select_folder(self):
        folder = filedialog.askdirectory(title="Pick Folder Containing Screen Recordings")
        if folder:
            p = Path(folder)
            sessions = cluster_recording_sessions(p)
            if sessions:
                self.available_sessions = sessions
                self.session_combobox["values"] = [s["label"] for s in sessions]
                self.session_combobox.current(0)
                self._load_session(0)
            else:
                recs = find_latest_screen_recordings(p, count=4)
                self.selected_clips = [None, None, None, None]
                for i in range(min(4, len(recs))):
                    self.selected_clips[i] = recs[i]
                self.custom_bgm_suite = [None, None, None, None]
                self._render_cards()

    def _render_cards(self):
        loaded_count = sum(1 for c in self.selected_clips if c is not None)
        has_builds = self.selected_clips[3] is not None
        if loaded_count >= 3:
            b_txt = "with Builds" if has_builds else "without Builds"
            self.status_badge.config(text=f"✓ Ready: {loaded_count} clips assigned ({b_txt})", fg=ACCENT_GREEN)
        else:
            self.status_badge.config(text=f"⚠ Assigned {loaded_count}/3 required chambers", fg="#fbbf24")

        for idx, card in enumerate(self.card_widgets):
            clip = self.selected_clips[idx]
            if clip and clip.exists():
                short_name = clip.name
                if len(short_name) > 22:
                    short_name = short_name[:10] + "..." + short_name[-10:]
                card.fn_lbl.config(text=short_name, fg=TEXT_LIGHT)
                try:
                    dur_s, _, _, _ = probe_video_metadata(clip)
                    cut_dur_s = estimate_chamber_cut_duration(clip, is_builds=(idx == 3))
                    if abs(dur_s - cut_dur_s) >= 2.0:
                        card.dur_lbl.config(text=f"⏱ {format_timestamp(cut_dur_s)} ({format_timestamp(dur_s)} raw)")
                    else:
                        card.dur_lbl.config(text=f"⏱ {format_timestamp(dur_s)}")
                except Exception:
                    card.dur_lbl.config(text="--:--")

                threading.Thread(target=self._load_card_thumbnail, args=(card, clip, idx), daemon=True).start()
            else:
                card.fn_lbl.config(text="Empty slot", fg=TEXT_MUTED)
                card.dur_lbl.config(text="--:--")
                card.thumb_lbl.config(image="", text="[No Clip]", fg=TEXT_MUTED)
                if hasattr(card, "bgm_lbl"):
                    card.bgm_lbl.config(text="♫ BGM: --", fg=TEXT_MUTED)

        threading.Thread(target=self._update_card_bgm_recommendations, daemon=True).start()

    def _update_card_bgm_recommendations(self):
        try:
            import music_recommender
            valid_chambers = [c for c in self.selected_clips[:3] if c is not None and c.exists()]
            if not valid_chambers:
                return

            c_durs = [estimate_chamber_cut_duration(c, is_builds=False) for c in valid_chambers]
            has_builds = (self.selected_clips[3] is not None and self.selected_clips[3].exists())
            b_dur = estimate_chamber_cut_duration(self.selected_clips[3], is_builds=True) if has_builds else None

            suite = music_recommender.recommend_bgm_suite(c_durs, builds_duration=b_dur)

            def _apply():
                for idx, track_info in enumerate(suite):
                    if idx < len(self.card_widgets):
                        card = self.card_widgets[idx]
                        if hasattr(card, "bgm_lbl"):
                            custom = self.custom_bgm_suite[idx]
                            if custom:
                                track_name = custom.get("name", "Custom")
                                card.bgm_lbl.config(text=f"♫ {track_name} (Custom)", fg="#38bdf8")
                            elif track_info:
                                track_name = track_info.get("track_name", "Auto")
                                card.bgm_lbl.config(text=f"♫ {track_name}", fg="#38bdf8")
                            else:
                                card.bgm_lbl.config(text="♫ BGM: Auto Match", fg=TEXT_MUTED)
            self.root.after(0, _apply)
        except Exception:
            pass

    def _load_card_thumbnail(self, card, clip_path: Path, slot_idx: int):
        try:
            seek_time = 10.0 if slot_idx == 3 else 24.0
            thumb_file = get_or_create_thumbnail(clip_path, seek_s=seek_time, width=160, height=90)
            if thumb_file.exists():
                pil_img = Image.open(thumb_file)
                tk_img = ImageTk.PhotoImage(pil_img)
                self.root.after(0, self._apply_thumbnail, card, tk_img)
        except Exception:
            pass

    def _apply_thumbnail(self, card, tk_img):
        card.thumb_lbl.config(image=tk_img, text="")
        card.thumb_lbl.image = tk_img

    def _on_start_processing(self):
        if self.is_processing:
            return

        self.audio_player.stop()
        self.btn_preview_audio.config(text="▶ Play", bg="#0284c7")

        valid_chambers = [c for c in self.selected_clips[:3] if c is not None and c.exists()]
        if len(valid_chambers) < 3:
            messagebox.showerror("Incomplete Run", "Please assign video clips to Chambers 1, 2, and 3.")
            return

        if is_capcut_running():
            resp = messagebox.askyesno(
                "CapCut is Running",
                "CapCut PC is currently running.\nCapCut locks draft files while open, which may prevent new showcase projects from showing up immediately.\n\nProceed anyway?"
            )
            if not resp:
                return

        self.is_processing = True
        self.btn_run.config(state=tk.DISABLED, bg="#475569", text="⏳ SYNTHESIZING RUN & CUTTING INTERMISSIONS...")
        self.progress_lbl.config(text="Analyzing loading screens and slicing segments...", fg=ACCENT_CYAN)

        thread = threading.Thread(target=self._run_pipeline_worker, daemon=True)
        thread.start()

    def _run_pipeline_worker(self):
        try:
            chamber_files = [c for c in self.selected_clips[:3] if c is not None]
            builds_file = self.selected_clips[3] if (self.selected_clips[3] and self.selected_clips[3].exists()) else None

            transition_type = self.trans_var.get()
            volume = self.vol_var.get() / 100.0
            side1 = ""
            side2 = ""
            sync_cloud = self.sync_cloud_var.get()
            open_capcut = self.launch_capcut_var.get()

            result = assemble_abyss_project(
                chamber_files=chamber_files,
                builds_file=builds_file,
                music_file=self.music_file,
                transition_type=transition_type,
                music_volume=volume,
                side1_name=side1,
                side2_name=side2,
                sync_to_cloud=sync_cloud,
                auto_launch=open_capcut
            )

            self.root.after(0, self._on_pipeline_success, result)
        except Exception as e:
            self.root.after(0, self._on_pipeline_error, str(e))

    def _on_pipeline_success(self, result: dict):
        self.is_processing = False
        self.btn_run.config(state=tk.NORMAL, bg="#059669", text="🚀 1-CLICK AUTO-EDIT & OPEN CAPCUT")
        dur_txt = result.get("total_duration_formatted", "")
        self.progress_lbl.config(
            text=f"✓ Project Ready ({dur_txt})! CapCut loaded & timestamps synced.",
            fg=ACCENT_GREEN
        )
        if hasattr(self, "gui_sync_status_lbl"):
            self.gui_sync_status_lbl.config(text=f"✓ Synced {dur_txt} run to Cloud Studio!", fg="#10b981")

        chapters = result.get("chapter_text", "")

        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(chapters)
            self.root.update()
        except Exception:
            pass

        msg = f"🎉 CapCut Project Created Successfully!\nTotal Duration: {dur_txt}\n\n✓ Timestamps copied to clipboard!\n\nYouTube Timestamps Synced:\n{chapters}"
        messagebox.showinfo("Auto-Edit Complete!", msg)

    def _on_pipeline_error(self, err_msg: str):
        self.is_processing = False
        self.btn_run.config(state=tk.NORMAL, bg="#059669", text="🚀 1-CLICK AUTO-EDIT & OPEN CAPCUT")
        self.progress_lbl.config(text=f"Error: {err_msg}", fg="#f87171")
        messagebox.showerror("Pipeline Error", f"An error occurred while creating project:\n{err_msg}")

    def _ensure_desktop_shortcut(self):
        try:
            desktop = Path.home() / "Desktop"
            shortcut_path = desktop / "Genshin Abyss Auto-Editor.lnk"
            if shortcut_path.exists():
                return
            pythonw_exe = Path(sys.executable).parent / "pythonw.exe"
            if not pythonw_exe.exists():
                pythonw_exe = Path(sys.executable)
            script_path = Path(__file__).resolve()
            ps_cmd = f"""
            $WshShell = New-Object -ComObject WScript.Shell
            $Shortcut = $WshShell.CreateShortcut('{str(shortcut_path)}')
            $Shortcut.TargetPath = '{str(pythonw_exe)}'
            $Shortcut.Arguments = '"{str(script_path)}"'
            $Shortcut.WorkingDirectory = '{str(PROJECT_DIR)}'
            $Shortcut.Description = '1-Click Genshin Abyss Video Auto-Editor'
            $Shortcut.Save()
            """
            subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=False, creationflags=0x08000000)
        except Exception:
            pass

    def _on_close(self):
        self.audio_player.stop()
        self.root.destroy()


def main():
    root = tk.Tk()
    app = AbyssEditorGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()