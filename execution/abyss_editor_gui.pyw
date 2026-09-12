"""
Genshin Abyss Auto-Editor & CapCut Synthesizer Desktop GUI (v2.0)
DOE-VERSION: 2026.09.11

Visual Clip Card Arranger with:
1. Real 16:9 in-game video thumbnails for each clip (Chamber 1, 2, 3, Builds)
2. Smart Session Auto-Detection (clusters runs & filters retakes)
3. Direct clip slot assignment & 1-click video player preview
4. Native Windows BGM Audio Preview Player (Play/Stop without popup)
5. Black Fade transition, custom volume, and Render cloud timestamp sync
"""

import os
import sys
import time
import json
import threading
import subprocess
from pathlib import Path
from typing import List, Dict, Optional

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk

# Adjust path to import auto_edit_abyss and capcut_template_schema
EXECUTION_DIR = Path(__file__).resolve().parent
PROJECT_DIR = EXECUTION_DIR.parent
sys.path.insert(0, str(EXECUTION_DIR))

import auto_edit_abyss
from auto_edit_abyss import (
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
    format_timestamp
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


class AbyssEditorGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Genshin Abyss Auto-Editor & CapCut Synthesizer")
        self.root.geometry("860x940")
        self.root.minsize(820, 880)
        self.root.configure(bg=BG_DARK)

        # State
        self.audio_player = AudioPreviewPlayer()
        self.available_sessions: List[Dict] = []
        self.selected_clips: List[Optional[Path]] = [None, None, None, None] # C1, C2, C3, Builds
        self.thumbnail_images: Dict[str, ImageTk.PhotoImage] = {}
        self.music_files_list: List[Path] = []
        self.music_file: Optional[Path] = None
        self.custom_bgm_suite: List[Optional[Dict]] = [None, None, None, None]
        self.is_processing = False

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
        main_container = tk.Frame(self.root, bg=BG_DARK, padx=18, pady=12)
        main_container.pack(fill=tk.BOTH, expand=True)

        # 1. Header
        header_frame = tk.Frame(main_container, bg=BG_DARK)
        header_frame.pack(fill=tk.X, pady=(0, 8))

        title_lbl = tk.Label(
            header_frame,
            text="🎬 Genshin Abyss Auto-Editor",
            font=("Segoe UI", 16, "bold"),
            bg=BG_DARK,
            fg=TEXT_LIGHT
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header_frame,
            text="Visual Clip Arranger • 16:9 CapCut PC Synthesizer • Cloud YouTube Timestamps Sync",
            font=("Segoe UI", 9),
            bg=BG_DARK,
            fg=TEXT_MUTED
        )
        sub_lbl.pack(anchor="w")

        # 2. Discovery & Session Toolbar
        disc_frame = tk.Frame(main_container, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1)
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

        # 3. Visual Clip Cards Grid (4 Slots)
        clips_label_row = tk.Frame(main_container, bg=BG_DARK)
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
        self.cards_frame = tk.Frame(main_container, bg=BG_DARK)
        self.cards_frame.pack(fill=tk.X, pady=(0, 8))

        self.card_widgets = []
        slot_titles = ["Chamber 1", "Chamber 2", "Chamber 3", "Builds (Optional)"]
        for idx in range(4):
            card = self._build_clip_card(self.cards_frame, idx, slot_titles[idx])
            card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=4 if idx > 0 and idx < 3 else (0, 4) if idx == 0 else (4, 0))
            self.card_widgets.append(card)

        # 4. Settings Section (Transitions + Audio + Chapter Teams)
        settings_grid = tk.Frame(main_container, bg=BG_DARK)
        settings_grid.pack(fill=tk.X, pady=(4, 8))

        # 4a. Transition Card
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

        # 4b. Audio & BGM Card with Audio Preview Button
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

        # AUDIO PREVIEW BUTTON
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

        # Volume Slider
        vol_row = tk.Frame(audio_card, bg=CARD_BG)
        vol_row.pack(fill=tk.X)

        tk.Label(vol_row, text="Volume:", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED).pack(side=tk.LEFT, padx=(0, 6))
        self.vol_var = tk.DoubleVar(value=10.0)
        self.vol_slider = ttk.Scale(vol_row, from_=5.0, to=50.0, variable=self.vol_var, command=self._on_volume_change)
        self.vol_slider.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self.vol_val_lbl = tk.Label(vol_row, text="10%", font=("Segoe UI", 8, "bold"), bg=CARD_BG, fg=ACCENT_AMBER, width=4)
        self.vol_val_lbl.pack(side=tk.LEFT)

        # 4c. Studio Sync & Output Info Card
        sync_card = tk.Frame(settings_grid, bg=CARD_BG, highlightbackground=CARD_BORDER, highlightthickness=1, padx=12, pady=8)
        sync_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(6, 0))

        tk.Label(sync_card, text="Studio Metadata Sync:", font=("Segoe UI", 9, "bold"), bg=CARD_BG, fg=ACCENT_CYAN).pack(anchor="w", pady=(0, 4))

        tk.Label(sync_card, text="• Pure Timecodes (00:00, 01:22...)", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_LIGHT).pack(anchor="w")
        tk.Label(sync_card, text="• Team names format in Thumbnail Studio", font=("Segoe UI", 8), bg=CARD_BG, fg=TEXT_MUTED).pack(anchor="w")

        self.gui_sync_status_lbl = tk.Label(sync_card, text="Ready to assemble timeline", font=("Segoe UI", 8, "italic"), bg=CARD_BG, fg="#94a3b8")
        self.gui_sync_status_lbl.pack(anchor="w", pady=(4, 0))

        # 5. Checkboxes & Action Row
        action_card = tk.Frame(main_container, bg=BG_DARK)
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

        # BIG ACTION BUTTON
        self.btn_run = tk.Button(
            action_card,
            text="🚀 1-CLICK AUTO-EDIT & OPEN CAPCUT",
            font=("Segoe UI", 12, "bold"),
            bg="#059669",             # emerald-600
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
                # Launch internal studio audition player in default browser (GPU-accelerated, zero lag)
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
                    # Spawn studio server in background daemon
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
                target_sec, _, _, _ = probe_video_metadata(clip)
            except Exception:
                pass

        # Load music catalog
        catalog_path = PROJECT_DIR / "data" / "cache" / "music_catalog.json"
        tracks_data = []
        if catalog_path.exists():
            try:
                cat = json.loads(catalog_path.read_text(encoding="utf-8"))
                tracks_data = cat.get("tracks", [])
            except Exception:
                pass

        # Create Toplevel popup
        top = tk.Toplevel(self.root)
        top.title(f"Pick BGM - {slot_name}")
        top.geometry("620x520")
        top.minsize(580, 460)
        top.configure(bg=BG_DARK)
        top.transient(self.root)
        top.grab_set()

        # Header
        hdr = tk.Frame(top, bg=CARD_BG, padx=14, pady=10)
        hdr.pack(fill=tk.X)
        tk.Label(hdr, text=f"🎵 Select BGM for {slot_name}", font=("Segoe UI", 11, "bold"), bg=CARD_BG, fg=TEXT_LIGHT).pack(anchor="w")
        tk.Label(hdr, text=f"Target Duration: {format_timestamp(target_sec)} • {len(tracks_data):,} tracks available", font=("Segoe UI", 8), bg=CARD_BG, fg=ACCENT_CYAN).pack(anchor="w")

        # Search row
        search_frame = tk.Frame(top, bg=BG_DARK, padx=14, pady=8)
        search_frame.pack(fill=tk.X)
        tk.Label(search_frame, text="🔍 Search:", font=("Segoe UI", 9), bg=BG_DARK, fg=TEXT_MUTED).pack(side=tk.LEFT, padx=(0, 6))
        search_var = tk.StringVar()
        search_entry = tk.Entry(search_frame, textvariable=search_var, font=("Segoe UI", 9), bg=CARD_BG, fg=TEXT_LIGHT, insertbackground="white")
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
        search_entry.focus()

        # Listbox with Scrollbar
        list_frame = tk.Frame(top, bg=BG_DARK, padx=14)
        list_frame.pack(fill=tk.BOTH, expand=True)

        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        track_listbox = tk.Listbox(
            list_frame, font=("Segoe UI", 9), bg=CARD_BG, fg=TEXT_LIGHT,
            selectbackground="#0284c7", selectforeground="white",
            yscrollcommand=scrollbar.set, relief="flat", highlightthickness=1, highlightbackground=CARD_BORDER
        )
        track_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=track_listbox.yview)

        # Bottom buttons
        btn_bar = tk.Frame(top, bg=BG_DARK, padx=14, pady=10)
        btn_bar.pack(fill=tk.X)

        btn_listen = tk.Button(
            btn_bar, text="▶ Listen Preview", font=("Segoe UI", 9), bg="#0284c7", fg="white",
            relief="flat", padx=10, pady=4, cursor="hand2"
        )
        btn_listen.pack(side=tk.LEFT, padx=(0, 8))

        btn_studio = tk.Button(
            btn_bar, text="🎧 Audition in Studio...", font=("Segoe UI", 9), bg="#334155", fg=TEXT_LIGHT,
            relief="flat", padx=10, pady=4, cursor="hand2",
            command=lambda: [top.destroy(), self._preview_video(slot_idx)]
        )
        btn_studio.pack(side=tk.LEFT)

        btn_select = tk.Button(
            btn_bar, text="✓ Assign This Track", font=("Segoe UI", 9, "bold"), bg=ACCENT_GREEN, fg="white",
            relief="flat", padx=14, pady=4, cursor="hand2"
        )
        btn_select.pack(side=tk.RIGHT)

        filtered_tracks = []

        def update_list(*args):
            nonlocal filtered_tracks
            q = search_var.get().lower().strip()
            candidates = list(tracks_data)
            if q:
                candidates = [t for t in candidates if q in f"{t.get('title','')} {t.get('artist','')} {t.get('album','')}".lower()]

            candidates.sort(key=lambda t: abs(float(t.get("duration_sec", 0.0)) - target_sec))
            filtered_tracks = candidates[:100]

            track_listbox.delete(0, tk.END)
            for t in filtered_tracks:
                d = float(t.get("duration_sec", 0.0))
                delta = d - target_sec
                fit_str = f"{'+' if delta >= 0 else ''}{delta:.1f}s"
                track_listbox.insert(tk.END, f"{t.get('title', 'Unknown')} - {t.get('artist', 'Unknown')} ({t.get('duration_formatted', '')} | Fit: {fit_str})")

            if filtered_tracks:
                track_listbox.select_set(0)

        search_var.trace("w", update_list)
        update_list()

        def do_listen():
            sel = track_listbox.curselection()
            if sel and sel[0] < len(filtered_tracks):
                t = filtered_tracks[sel[0]]
                p = Path(t.get("path", ""))
                if p.exists():
                    if self.audio_player.is_playing() and self.audio_player.current_path == p:
                        self.audio_player.stop()
                        btn_listen.config(text="▶ Listen Preview")
                    else:
                        self.audio_player.play(p)
                        btn_listen.config(text="⏹ Stop Preview")

        btn_listen.config(command=do_listen)

        def do_select():
            sel = track_listbox.curselection()
            if sel and sel[0] < len(filtered_tracks):
                self.audio_player.stop()
                chosen = filtered_tracks[sel[0]]
                d = float(chosen.get("duration_sec", 0.0))
                delta = d - target_sec
                chosen["fit_label"] = f"{'+' if delta >= 0 else ''}{delta:.1f}s"
                chosen["delta_sec"] = round(delta, 2)
                self.custom_bgm_suite[slot_idx] = chosen

                # Save to active_bgm_suite.json
                suite_file = PROJECT_DIR / "data" / "cache" / "active_bgm_suite.json"
                try:
                    existing = []
                    if suite_file.exists():
                        existing = json.loads(suite_file.read_text(encoding="utf-8"))
                    while len(existing) < 4:
                        existing.append(None)
                    existing[slot_idx] = chosen
                    suite_file.write_text(json.dumps(existing, indent=2), encoding="utf-8")
                except Exception:
                    pass

                # Update card label
                title = chosen.get("title", "")
                fit_lbl = chosen.get("fit_label", "")
                if len(title) > 16:
                    title = title[:14] + ".."
                self.card_widgets[slot_idx].bgm_lbl.config(text=f"♫ {title} ({fit_lbl})", fg="#38bdf8")

                top.destroy()

        btn_select.config(command=do_select)
        track_listbox.bind("<Double-Button-1>", lambda e: do_select())

    def _toggle_audio_preview(self):
        if self.audio_player.is_playing():
            self.audio_player.stop()
            self.btn_preview_audio.config(text="▶ Play", bg="#0284c7")
        else:
            if self.music_file and self.music_file.exists():
                self.audio_player.play(self.music_file)
                self.btn_preview_audio.config(text="⏹ Stop", bg=ACCENT_AMBER)
            else:
                messagebox.showinfo("No Music", "Please select an audio track first.")

    def _on_music_selected(self, event):
        self.audio_player.stop()
        self.btn_preview_audio.config(text="▶ Play", bg="#0284c7")
        idx = self.music_combobox.current()
        if idx >= 0 and idx < len(self.music_files_list):
            self.music_file = self.music_files_list[idx]

    def _on_browse_audio(self):
        self.audio_player.stop()
        self.btn_preview_audio.config(text="▶ Play", bg="#0284c7")
        f = filedialog.askopenfilename(
            title="Select Background Music Audio",
            filetypes=[("Audio Files", "*.mp3 *.wav *.m4a *.aac"), ("All Files", "*.*")]
        )
        if f:
            p = Path(f)
            self.music_file = p
            values = list(self.music_combobox["values"])
            if p.name not in values:
                values.insert(0, p.name)
                self.music_files_list.insert(0, p)
                self.music_combobox["values"] = values
                self.music_combobox.current(0)

    def _on_volume_change(self, val):
        self.vol_val_lbl.config(text=f"{int(float(val))}%")

    def _load_defaults(self):
        # Scan music
        self.music_files_list = list_available_music(DEFAULT_DOWNLOADS_DIR)
        music_names = [f.name for f in self.music_files_list]
        self.music_combobox["values"] = music_names
        if music_names:
            self.music_combobox.current(0)
            self.music_file = self.music_files_list[0]

        # Pre-fill active team names from Thumbnail Studio if available
        teams_candidates = [
            PROJECT_DIR / "data" / "cache" / "active_teams.json",
            PROJECT_DIR.parent / "data" / "cache" / "active_teams.json"
        ]

        # Check if active BGM suite was previously configured
        suite_file = PROJECT_DIR / "data" / "cache" / "active_bgm_suite.json"
        if suite_file.exists():
            try:
                cached_suite = json.loads(suite_file.read_text(encoding="utf-8"))
                if isinstance(cached_suite, list):
                    for i in range(min(4, len(cached_suite))):
                        self.custom_bgm_suite[i] = cached_suite[i]
            except Exception:
                pass
        # Scan sessions
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
                    card.dur_lbl.config(text=f"⏱ {format_timestamp(dur_s)}")
                except Exception:
                    card.dur_lbl.config(text="--:--")

                # Asynchronously load thumbnail
                threading.Thread(target=self._load_card_thumbnail, args=(card, clip, idx), daemon=True).start()
            else:
                card.fn_lbl.config(text="Empty slot", fg=TEXT_MUTED)
                card.dur_lbl.config(text="--:--")
                card.thumb_lbl.config(image="", text="[No Clip]", fg=TEXT_MUTED)
                if hasattr(card, "bgm_lbl"):
                    card.bgm_lbl.config(text="♫ BGM: --", fg=TEXT_MUTED)

        # Asynchronously update matched BGM names on cards
        threading.Thread(target=self._update_card_bgm_recommendations, daemon=True).start()

    def _update_card_bgm_recommendations(self):
        try:
            durations = []
            for c in self.selected_clips[:3]:
                if c and c.exists():
                    d, _, _, _ = probe_video_metadata(c)
                    durations.append(d)
                else:
                    durations.append(90.0)
            builds_dur = 90.0
            if self.selected_clips[3] and self.selected_clips[3].exists():
                b_dur, _, _, _ = probe_video_metadata(self.selected_clips[3])
                builds_dur = b_dur

            from execution.music_recommender import recommend_bgm_suite
            rec = recommend_bgm_suite(durations, builds_duration=builds_dur)
            assigns = rec.get("assignments", {})
            keys = ["chamber_1", "chamber_2", "chamber_3", "builds"]

            def _apply():
                for idx, k in enumerate(keys):
                    if idx < len(self.card_widgets):
                        card = self.card_widgets[idx]
                        slot_data = assigns.get(k, {})
                        sel = self.custom_bgm_suite[idx] or slot_data.get("selected")
                        if sel and hasattr(card, "bgm_lbl"):
                            title = sel.get("title", "")
                            fit = sel.get("fit_label", "")
                            if len(title) > 16:
                                title = title[:14] + ".."
                            card.bgm_lbl.config(text=f"♫ {title} ({fit})", fg="#38bdf8")

            self.root.after(0, _apply)
        except Exception:
            pass

    def _load_card_thumbnail(self, card, clip_path: Path, slot_idx: int):
        try:
            # For builds (slot 3), seek to 10s; for chambers, seek to 24s for card selection banner
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
                "CapCut PC is currently running.\nCapCut locks draft files while open, which may prevent the newly generated project from showing up immediately.\n\nWould you like to proceed anyway?"
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

        # Auto-copy to Windows clipboard for standalone convenience
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
