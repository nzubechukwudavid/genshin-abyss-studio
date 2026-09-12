"""
Genshin Abyss Studio - Executable Desktop Entrypoint
DOE-VERSION: 2026.09.12
"""
import sys
from pathlib import Path

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(BASE_DIR))

from execution.launch_studio_desktop import main

if __name__ == "__main__":
    main()
