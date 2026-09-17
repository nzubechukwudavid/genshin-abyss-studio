"""
Catalog Router for Genshin Abyss Studio.
Serves meta teams and archetypes from versioned JSON files.
"""

import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.core import CATALOG_DIR

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

@router.get("/teams")
async def get_meta_teams():
    """Returns meta team compositions catalog."""
    teams_file = CATALOG_DIR / "meta_teams.json"
    if teams_file.exists():
        try:
            data = json.loads(teams_file.read_text(encoding="utf-8"))
            return JSONResponse(content=data, headers={"Cache-Control": "public, max-age=86400"})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load teams catalog: {e}")
    raise HTTPException(status_code=404, detail="Teams catalog not found")

@router.get("/archetypes")
async def get_meta_archetypes():
    """Returns meta team archetypes catalog."""
    archetypes_file = CATALOG_DIR / "meta_archetypes.json"
    if archetypes_file.exists():
        try:
            data = json.loads(archetypes_file.read_text(encoding="utf-8"))
            return JSONResponse(content=data, headers={"Cache-Control": "public, max-age=86400"})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load archetypes catalog: {e}")
    raise HTTPException(status_code=404, detail="Archetypes catalog not found")
