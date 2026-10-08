from .catalog import router as catalog_router
from .project import router as project_router
from .settings import router as settings_router
from .capcut import router as capcut_router
from .stygian import router as stygian_router
from .characters import router as characters_router
from .recordings import router as recordings_router
from .music import router as music_router
from .assembly import router as assembly_router

__all__ = [
    'catalog_router',
    'project_router',
    'settings_router',
    'capcut_router',
    'stygian_router',
    'characters_router',
    'recordings_router',
    'music_router',
    'assembly_router'
]
