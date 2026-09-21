#!/usr/bin/env python3
"""
Module: execution/dialog_service.py
Purpose: Spawns native Windows file dialogs in an isolated process with proper foreground focus.
"""

import subprocess
import sys
import json
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger("abyss_studio.dialog_service")

def run_isolated_file_picker(title: str = "Select Video File", multiple: bool = False) -> List[Path]:
    """Executes native file dialog in an isolated process to avoid Tkinter event loop deadlock."""
    code = f'''
import tkinter as tk
from tkinter import filedialog
import json
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
try:
    if {multiple}:
        files = filedialog.askopenfilenames(title="{title}", filetypes=[("MP4 Video", "*.mp4"), ("All Files", "*.*")])
        print("__PICKED__" + json.dumps(list(files)))
    else:
        f = filedialog.askopenfilename(title="{title}", filetypes=[("MP4 Video", "*.mp4"), ("All Files", "*.*")])
        print("__PICKED__" + json.dumps([f] if f else []))
except Exception:
    print("__PICKED__[]")
finally:
    try:
        root.destroy()
    except Exception:
        pass
'''
    try:
        res = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=90)
        for line in res.stdout.splitlines():
            if line.startswith("__PICKED__"):
                file_strings = json.loads(line[len("__PICKED__"):])
                return [Path(p) for p in file_strings if p]
    except Exception as e:
        logger.warning(f"Native picker subprocess error: {e}")
    return []
