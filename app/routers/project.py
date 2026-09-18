"""
Project Persistence Router for Genshin Abyss Studio.
Handles .abyss project validation, serialization, disk saving, and project workspace hydration.
"""

import os
import re
import json
import time
from pathlib import Path
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from app.schemas.models import AbyssProject
from app.core.logger import logger

router = APIRouter(prefix="/api/project", tags=["project"])

PROJECTS_DIR = Path("data/projects").resolve()


def ensure_projects_dir() -> Path:
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    return PROJECTS_DIR


def sanitize_project_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and ensure safe storage."""
    base = os.path.basename(filename).strip()
    if base.endswith(".abyss"):
        base = base[:-6]
    elif base.endswith(".json"):
        base = base[:-5]
    
    # Strip any characters other than alphanumeric, underscore, and dash
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', base)
    if not clean:
        clean = f"abyss_project_{int(time.time())}"
    return f"{clean}.abyss"


@router.post("/validate")
async def validate_project(payload: Dict[str, Any]):
    """Validate an incoming .abyss project JSON against the domain schema."""
    try:
        project = AbyssProject(**payload)
        return {
            "valid": True,
            "project_name": project.project_name,
            "version": project.version,
            "floor": project.floor,
            "side1_character": project.side1.character,
            "side2_character": project.side2.character,
            "segments_count": len(project.segments)
        }
    except ValidationError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"valid": False, "errors": err.errors()}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"valid": False, "error": str(exc)}
        )


from app.core.fs import atomic_write_text
import asyncio

_project_lock = asyncio.Lock()

@router.post("/save")
async def save_project(project: AbyssProject):
    """Save an .abyss project payload to local server storage."""
    target_dir = ensure_projects_dir()
    safe_filename = sanitize_project_filename(project.project_name)
    target_file = target_dir / safe_filename

    # Safety check against path traversal
    if not str(target_file.resolve()).startswith(str(PROJECTS_DIR)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project path")

    async with _project_lock:
        try:
            atomic_write_text(target_file, project.model_dump_json(indent=2))
            return {
                "saved": True,
                "filename": safe_filename,
                "size_bytes": target_file.stat().st_size
            }
        except OSError as exc:
            logger.error(f"Failed to save project: {exc}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save project: {exc}")


@router.get("/list")
async def list_projects():
    """List all saved .abyss projects in local server storage."""
    target_dir = ensure_projects_dir()
    projects = []
    for f in sorted(target_dir.glob("*.abyss"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            stat = f.stat()
            projects.append({
                "filename": f.name,
                "size_bytes": stat.st_size,
                "modified_at": stat.st_mtime
            })
        except Exception:
            continue
    return {"projects": projects}


@router.get("/{filename}")
async def get_project(filename: str):
    """Retrieve and load a specific saved .abyss project."""
    target_dir = ensure_projects_dir()
    safe_filename = sanitize_project_filename(filename)
    target_file = target_dir / safe_filename

    if not target_file.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project file not found")

    try:
        content = json.loads(target_file.read_text(encoding="utf-8"))
        return content
    except (json.JSONDecodeError, OSError) as exc:
        logger.error(f"Failed to read project: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to read project: {exc}")
