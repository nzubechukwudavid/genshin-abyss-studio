"""
Media Service for Genshin Abyss Studio.
Handles RFC 7233 byte-range chunk streaming and thumbnail transformation.
"""

from pathlib import Path
from io import BytesIO
from typing import Generator, Tuple
from fastapi import HTTPException
from PIL import Image


def parse_byte_range(range_header: str, file_size: int) -> Tuple[int, int]:
    """Parses HTTP Range header according to RFC 7233.
    Raises HTTPException 416 if the requested range is unsatisfiable.
    """
    if not range_header or "=" not in range_header:
        return 0, max(0, file_size - 1)
    
    if file_size <= 0:
        raise HTTPException(
            status_code=416,
            detail="Range Not Satisfiable",
            headers={"Content-Range": "bytes */0"}
        )

    try:
        unit, range_str = range_header.strip().split("=", 1)
        if unit.strip().lower() != "bytes":
            raise HTTPException(
                status_code=416,
                detail="Range Not Satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        parts = range_str.split("-", 1)
        if not parts[0]:
            # Suffix range: bytes=-500 (last 500 bytes)
            suffix_len = int(parts[1])
            if suffix_len <= 0:
                raise HTTPException(
                    status_code=416,
                    detail="Range Not Satisfiable",
                    headers={"Content-Range": f"bytes */{file_size}"}
                )
            start = max(0, file_size - suffix_len)
            end = file_size - 1
        else:
            start = int(parts[0])
            end = int(parts[1]) if (len(parts) > 1 and parts[1].strip()) else file_size - 1

        if start < 0 or start >= file_size or end < start:
            raise HTTPException(
                status_code=416,
                detail="Range Not Satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        end = min(end, file_size - 1)
        return start, end
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=416,
            detail="Range Not Satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"}
        )


def stream_file_range(file_path: Path, start: int, end: int, chunk_size: int = 1024 * 1024) -> Generator[bytes, None, None]:
    """Yields byte chunks from start to end inclusive for HTTP 206 partial content streaming."""
    with open(file_path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            read_len = min(chunk_size, remaining)
            chunk = f.read(read_len)
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def make_webp_thumbnail(image_bytes: bytes, max_dim: int = 400) -> bytes:
    """Downscales and compresses an image payload into a lightweight WebP buffer."""
    with Image.open(BytesIO(image_bytes)) as img:
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        out_buf = BytesIO()
        img.save(out_buf, format="WEBP", quality=80, method=4)
        return out_buf.getvalue()
