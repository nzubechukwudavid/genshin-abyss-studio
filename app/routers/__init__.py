from .catalog import router as catalog_router
from .project import router as project_router
from .settings import router as settings_router
from .capcut import router as capcut_router
from .stygian import router as stygian_router

__all__ = [
    "catalog_router",
    "project_router",
    "settings_router",
    "capcut_router",
    "stygian_router",
]
