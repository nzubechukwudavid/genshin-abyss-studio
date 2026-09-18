"""
Atomic filesystem utilities for Genshin Abyss Studio.
Guarantees crash-resilient writes using temp files and atomic rename operations.
"""

import os
import json
import uuid
from pathlib import Path
from typing import Any


def atomic_write_bytes(path: Path, data: bytes) -> None:
    """Writes bytes to a target path atomically via a temporary sibling file."""
    path = Path(path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.tmp.{uuid.uuid4().hex[:8]}")
    try:
        with open(temp_path, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        temp_path.replace(path)
    except Exception:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise


def atomic_write_text(path: Path, content: str, encoding: str = "utf-8") -> None:
    """Writes text to a target path atomically via a temporary sibling file."""
    atomic_write_bytes(path, content.encode(encoding))


def atomic_write_json(path: Path, data: Any, indent: int = 2) -> None:
    """Serializes data to JSON and writes to a target path atomically."""
    content = json.dumps(data, indent=indent, ensure_ascii=False)
    atomic_write_text(path, content, encoding="utf-8")
