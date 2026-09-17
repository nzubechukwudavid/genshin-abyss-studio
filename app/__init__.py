# App package
import sys
import importlib.util
from pathlib import Path

# Re-export root app.py symbols during PR 4 transition
_root_app_path = Path(__file__).resolve().parent.parent / "app.py"
if _root_app_path.exists():
    _spec = importlib.util.spec_from_file_location("root_app_module", str(_root_app_path))
    if _spec and _spec.loader:
        _mod = importlib.util.module_from_spec(_spec)
        sys.modules["root_app_module"] = _mod
        _spec.loader.exec_module(_mod)
        for _attr in ("app", "validate_safe_media_path", "validate_proxy_url", "ALLOWED_PROXY_DOMAINS", "enhancement_semaphore"):
            if hasattr(_mod, _attr):
                globals()[_attr] = getattr(_mod, _attr)
