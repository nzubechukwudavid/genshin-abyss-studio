"""
Genshin Abyss Studio - Standalone Windows Executable Builder
DOE-VERSION: 2026.09.12

Builds a self-contained, portable Windows distribution (.exe + runtime assets)
using PyInstaller. Output is saved to dist/GenshinAbyssStudio and optionally
packaged into dist/GenshinAbyssStudio-Windows-x64.zip for GitHub Releases.
"""

import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"
BUILD_DIR = BASE_DIR / "build"
APP_DIST_DIR = DIST_DIR / "GenshinAbyssStudio"


def build():
    print("=" * 60)
    print("  Genshin Abyss Studio - Standalone Windows Packager")
    print("=" * 60)

    # 1. Clean previous builds
    print("\n[1/5] Cleaning previous build artifacts...")
    if APP_DIST_DIR.exists():
        shutil.rmtree(APP_DIST_DIR, ignore_errors=True)
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR, ignore_errors=True)

    # 2. Configure PyInstaller command
    entrypoint = BASE_DIR / "execution" / "desktop_main.py"
    icon_path = BASE_DIR / "data" / "assets" / "app_icon.ico"

    hidden_imports = [
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "fastapi",
        "fastapi.staticfiles",
        "fastapi.responses",
        "fastapi.middleware.cors",
        "starlette",
        "starlette.routing",
        "pydantic",
        "PIL",
        "PIL.Image",
        "PIL.ImageDraw",
        "PIL.ImageFont",
        "PIL.ImageFilter",
        "PIL.ImageOps",
        "cv2",
        "tinytag",
        "httpx",
        "requests",
        "app",
        "execution.launch_studio_desktop",
        "execution.generate_abyss_thumbnail",
        "execution.auto_edit_abyss",
        "execution.capcut_template_schema",
        "execution.music_indexer",
        "execution.music_recommender"
    ]

    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--name=GenshinAbyssStudio",
        "--onedir",
        "--noconsole",
        f"--distpath={DIST_DIR}",
        f"--workpath={BUILD_DIR}",
        "--clean",
        "-y"
    ]

    version_file = BASE_DIR / "execution" / "version_info.txt"
    version_content = """# UTF-8
#
# Windows Executable Version Information
# Genshin Abyss Studio - All-in-One Creator Suite
#
VSVersionInfo(
  ffi=FixedFileInfo(
    filevers=(1, 0, 0, 0),
    prodvers=(1, 0, 0, 0),
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0, 0)
  ),
  kids=[
    StringFileInfo([
      StringTable(
        '040904B0',
        [StringStruct('CompanyName', 'David (nzubechukwudavid)'),
         StringStruct('FileDescription', 'Genshin Abyss Studio - All-in-One Creator Suite'),
         StringStruct('FileVersion', '1.1.0.0'),
         StringStruct('InternalName', 'GenshinAbyssStudio'),
         StringStruct('LegalCopyright', 'Copyright (C) 2026 David. Released under MIT License.'),
         StringStruct('OriginalFilename', 'GenshinAbyssStudio.exe'),
         StringStruct('ProductName', 'Genshin Abyss Studio'),
         StringStruct('ProductVersion', '1.1.0.0')])
      ]),
    VarFileInfo([VarStruct('Translation', [1033, 1200])])
  ]
)
"""
    version_file.write_text(version_content, encoding="utf-8")
    cmd.append(f"--version-file={version_file}")

    if icon_path.exists():
        cmd.append(f"--icon={icon_path}")

    for imp in hidden_imports:
        cmd.extend(["--hidden-import", imp])

    # Include root directory in paths
    cmd.extend(["--paths", str(BASE_DIR)])
    cmd.append(str(entrypoint))

    print(f"\n[2/5] Running PyInstaller compilation...")
    result = subprocess.run(cmd, cwd=str(BASE_DIR))
    if result.returncode != 0:
        print("\n[!] PyInstaller compilation failed.")
        sys.exit(result.returncode)

    print("\n[+] PyInstaller compilation succeeded!")

    # 3. Copy Web, Asset, and Cache Folders into dist/GenshinAbyssStudio
    print("\n[3/5] Bundling application resources into standalone distribution...")

    # Copy web/
    dst_web = APP_DIST_DIR / "web"
    if dst_web.exists():
        shutil.rmtree(dst_web)
    shutil.copytree(BASE_DIR / "web", dst_web)
    print("  [+] Copied web/ directory")

    # Copy data/assets/
    dst_assets = APP_DIST_DIR / "data" / "assets"
    dst_assets.parent.mkdir(parents=True, exist_ok=True)
    if (BASE_DIR / "data" / "assets").exists():
        shutil.copytree(BASE_DIR / "data" / "assets", dst_assets, dirs_exist_ok=True)
        print("  [+] Copied data/assets/")

    # Copy data/cache catalogs
    dst_cache = APP_DIST_DIR / "data" / "cache"
    dst_cache.mkdir(parents=True, exist_ok=True)
    (APP_DIST_DIR / "data" / "output").mkdir(parents=True, exist_ok=True)
    (dst_cache / "thumbs").mkdir(parents=True, exist_ok=True)

    src_cache = BASE_DIR / "data" / "cache"
    for cfile in [
        "all_galleries.json",
        "hoyowiki_characters.json",
        "latest_abyss_chapters.json",
        "music_catalog.json",
        "lbpcascade_animeface.xml"
    ]:
        src_f = src_cache / cfile
        if src_f.exists():
            shutil.copy2(src_f, dst_cache / cfile)
            print(f"  [+] Copied data/cache/{cfile}")

    # Copy character avatar icons
    src_chars = src_cache / "characters"
    dst_chars = dst_cache / "characters"
    if src_chars.exists():
        shutil.copytree(src_chars, dst_chars, dirs_exist_ok=True)
        print(f"  [+] Copied {len(list(src_chars.glob('*.png')))} character avatars to data/cache/characters/")

    # Copy pre-cached character illustrations for 100% offline first-run
    src_thumbs = src_cache / "thumbs"
    dst_thumbs = dst_cache / "thumbs"
    if src_thumbs.exists():
        shutil.copytree(src_thumbs, dst_thumbs, dirs_exist_ok=True)
        print(f"  [+] Copied {len(list(src_thumbs.glob('*')))} pre-cached illustrations to data/cache/thumbs/")

    # 4. Create convenient launchers and documentation
    print("\n[4/5] Generating launcher batch file and instructions...")

    bat_content = """@echo off
cd /d "%~dp0"
start "" "%~dp0GenshinAbyssStudio.exe"
"""
    (APP_DIST_DIR / "Launch Genshin Abyss Studio.bat").write_text(bat_content, encoding="utf-8")

    readme_content = """====================================================================
  Genshin Impact Spiral Abyss Studio - Portable Windows Edition
====================================================================

NO INSTALLATION REQUIRED!
Zero Python, terminal commands, or dependencies required.

HOW TO RUN:
1. Double-click "GenshinAbyssStudio.exe" (or "Launch Genshin Abyss Studio.bat").
2. The Studio will open in a dedicated, high-performance desktop window.

FEATURES:
- Canva-Style 1080p Thumbnail Designer (130+ Character Roster & Official Art)
- Automated CapCut PC Video Editor (7-Cut Timeline & Loading Trimmer)
- Multi-Track BGM Engine (Audio Matcher & Dual-Track Audition Player)
- Microsecond YouTube Chapter Timestamps

Support & Updates:
https://github.com/nzubechukwudavid/genshin-abyss-studio
====================================================================
"""
    (APP_DIST_DIR / "README.txt").write_text(readme_content, encoding="utf-8")
    print("  [+] Created Launch Genshin Abyss Studio.bat and README.txt")

    # 5. Package as ZIP for GitHub Releases
    print("\n[5/5] Creating release ZIP archive...")
    zip_path = DIST_DIR / "GenshinAbyssStudio-Windows-x64.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for file in APP_DIST_DIR.rglob("*"):
            if file.is_file():
                arcname = file.relative_to(DIST_DIR)
                zipf.write(file, arcname)

    zip_size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"\n[SUCCESS] Standalone release packaged successfully!")
    print(f"  Executable Folder : {APP_DIST_DIR}")
    print(f"  Release Zip       : {zip_path} ({zip_size_mb:.1f} MB)")

    # 6. Build Inno Setup Single-File Installer (.exe) if ISCC is installed
    iscc_candidates = [
        shutil.which("iscc"),
        Path(r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe"),
        Path(r"C:\Program Files\Inno Setup 6\ISCC.exe"),
        Path(r"C:\Program Files (x86)\Inno Setup 5\ISCC.exe")
    ]
    iscc_exe = None
    for c in iscc_candidates:
        if c and Path(c).exists():
            iscc_exe = c
            break

    if iscc_exe:
        print("\n[6/6] Inno Setup compiler detected. Compiling single-click Setup.exe...")
        iss_path = BASE_DIR / "execution" / "installer.iss"
        if iss_path.exists():
            res = subprocess.run([str(iscc_exe), str(iss_path)], cwd=str(BASE_DIR / "execution"))
            setup_exe = DIST_DIR / "GenshinAbyssStudio-Setup.exe"
            if setup_exe.exists():
                setup_size_mb = setup_exe.stat().st_size / (1024 * 1024)
                print(f"  [+] Single-File Installer Created: {setup_exe} ({setup_size_mb:.1f} MB)")
    else:
        print("\n[*] Note: Inno Setup (ISCC.exe) not found locally. (Setup.exe will be compiled automatically in GitHub Actions CI/CD).")

    print("=" * 60)


if __name__ == "__main__":
    build()
