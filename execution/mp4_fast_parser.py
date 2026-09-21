#!/usr/bin/env python3
"""
Module: execution/mp4_fast_parser.py
Purpose: High-speed pure-Python binary MP4 box parser to read 'mvhd' atom duration in < 1ms.
Zero external processes, zero OpenCV overhead.
"""

from pathlib import Path
from typing import Optional
import struct
import os

def fast_mp4_duration(filepath: Path) -> Optional[float]:
    """Reads MP4 duration from mvhd atom in binary mode (< 1ms) without launching subprocesses or OpenCV."""
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
