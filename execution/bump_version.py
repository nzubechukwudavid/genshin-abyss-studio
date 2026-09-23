"""
Genshin Abyss Studio - Single Source of Truth Version Manager & Consistency Checker
DOE-VERSION: 2026.09.18

Ensures complete version alignment across backend, desktop installer,
PyInstaller executables, CI/CD release workflows, and frontend web UI.
"""

import sys
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

CONFIG_PY = BASE_DIR / "app" / "core" / "config.py"
INSTALLER_ISS = BASE_DIR / "execution" / "installer.iss"
BUILD_EXE_PY = BASE_DIR / "execution" / "build_exe.py"
RELEASE_YML = BASE_DIR / ".github" / "workflows" / "release.yml"
INDEX_HTML = BASE_DIR / "web" / "index.html"
STUDIO_JS = BASE_DIR / "web" / "studio.js"
README_MD = BASE_DIR / "README.md"
TEST_VERSION_PY = BASE_DIR / "tests" / "test_version_consistency.py"


def get_current_version():
    if not CONFIG_PY.exists():
        raise FileNotFoundError(f"Missing {CONFIG_PY}")
    txt = CONFIG_PY.read_text(encoding="utf-8")
    m = re.search(r'APP_VERSION\s*=\s*"([^"]+)"', txt)
    if not m:
        m = re.search(r"APP_VERSION\s*=\s*'([^']+)'", txt)
    if not m:
        raise ValueError("APP_VERSION definition not found in config.py")
    return m.group(1).strip()


def check_version_alignment(expected_version=None):
    if not expected_version:
        expected_version = get_current_version()

    errors = []

    # 1. Config.py
    curr_cfg = get_current_version()
    if curr_cfg != expected_version:
        errors.append(f"app/core/config.py: expected {expected_version}, got {curr_cfg}")

    # 2. Installer.iss
    if INSTALLER_ISS.exists():
        iss_txt = INSTALLER_ISS.read_text(encoding="utf-8")
        m = re.search(r'#define\s+MyAppVersion\s+"([^"]+)"', iss_txt)
        if not m or m.group(1) != expected_version:
            found = m.group(1) if m else "None"
            errors.append(f"execution/installer.iss: expected {expected_version}, got {found}")

    # 3. Release.yml
    if RELEASE_YML.exists():
        yml_txt = RELEASE_YML.read_text(encoding="utf-8")
        m = re.search(r'default:\s*"v([^"]+)"', yml_txt)
        if not m:
            m = re.search(r"default:\s*'v([^']+)'", yml_txt)
        if not m or m.group(1) != expected_version:
            found = m.group(1) if m else "None"
            errors.append(f".github/workflows/release.yml: expected v{expected_version}, got {found}")

    # 4. Index.html Cache Busters and badges
    if INDEX_HTML.exists():
        html_txt = INDEX_HTML.read_text(encoding="utf-8")
        css_m = re.search(r'style\.css\?v=([^\s">]+)', html_txt)
        if not css_m or css_m.group(1) != expected_version:
            found = css_m.group(1) if css_m else "None"
            errors.append(f"web/index.html (style.css cache buster): expected {expected_version}, got {found}")

        js_m = re.search(r'studio\.js\?v=([^\s">]+)', html_txt)
        if not js_m or js_m.group(1) != expected_version:
            found = js_m.group(1) if js_m else "None"
            errors.append(f"web/index.html (studio.js cache buster): expected {expected_version}, got {found}")

        badge_m = re.search(r'credits-version-badge[^>]*>v([^<]+)<', html_txt)
        if not badge_m or badge_m.group(1) != expected_version:
            found = badge_m.group(1) if badge_m else "None"
            errors.append(f"web/index.html (credits-version-badge): expected v{expected_version}, got {found}")

        about_m = re.search(r'about-tag-pill[^>]*>v([^<]+)<', html_txt)
        if not about_m or about_m.group(1) != expected_version:
            found = about_m.group(1) if about_m else "None"
            errors.append(f"web/index.html (about-tag-pill): expected v{expected_version}, got {found}")


    # 5. Build_exe.py
    if BUILD_EXE_PY.exists():
        exe_txt = BUILD_EXE_PY.read_text(encoding="utf-8")
        m = re.search(r'APP_VERSION = "([^"]+)"', exe_txt)
        if not m or m.group(1) != expected_version:
            found = m.group(1) if m else "None"
            errors.append(f"execution/build_exe.py: expected {expected_version}, got {found}")

    # 6. Test_version_consistency.py
    if TEST_VERSION_PY.exists():
        test_txt = TEST_VERSION_PY.read_text(encoding="utf-8")
        m = re.search(r'assert APP_VERSION == "([^"]+)"', test_txt)
        if not m or m.group(1) != expected_version:
            found = m.group(1) if m else "None"
            errors.append(f"tests/test_version_consistency.py: expected {expected_version}, got {found}")


    # 7. Readme.md
    if README_MD.exists():
        readme_txt = README_MD.read_text(encoding="utf-8")
        m = re.search(r'badge/Release-v([^\-]+)-00E5FF', readme_txt)
        if not m or m.group(1) != expected_version:
            found = m.group(1) if m else "None"
            errors.append(f"README.md (release badge): expected v{expected_version}, got v{found}")

    if errors:
        print(f"[FAIL] Version drift detected for v{expected_version}:")
        for err in errors:
            print(f"  - {err}")
        return False

    print(f"[OK] All version references are perfectly synchronized to v{expected_version}!")
    return True


def bump_version(new_version):
    print(f"Synchronizing all project files to version: {new_version}...")

    # 1. Config.py
    if CONFIG_PY.exists():
        txt = CONFIG_PY.read_text(encoding="utf-8")
        txt = re.sub(r'APP_VERSION\s*=\s*"[^"]+"', f'APP_VERSION = "{new_version}"', txt)
        txt = re.sub(r"APP_VERSION\s*=\s*'[^']+'", f'APP_VERSION = "{new_version}"', txt)
        CONFIG_PY.write_text(txt, encoding="utf-8")
        print(f"  v Updated {CONFIG_PY.relative_to(BASE_DIR)}")

    # 2. Installer.iss
    if INSTALLER_ISS.exists():
        txt = INSTALLER_ISS.read_text(encoding="utf-8")
        txt = re.sub(r'#define\s+MyAppVersion\s+"[^"]+"', f'#define MyAppVersion "{new_version}"', txt)
        INSTALLER_ISS.write_text(txt, encoding="utf-8")
        print(f"  v Updated {INSTALLER_ISS.relative_to(BASE_DIR)}")

    # 3. Release.yml
    if RELEASE_YML.exists():
        txt = RELEASE_YML.read_text(encoding="utf-8")
        txt = re.sub(r'default:\s*"v[^"]+"', f'default: "v{new_version}"', txt)
        txt = re.sub(r"default:\s*'v[^']+'", f'default: "v{new_version}"', txt)
        txt = re.sub(r'description:\s*"Release tag \(e\.g\., v[^\)]+\)"', f'description: "Release tag (e.g., v{new_version})"', txt)
        RELEASE_YML.write_text(txt, encoding="utf-8")
        print(f"  v Updated {RELEASE_YML.relative_to(BASE_DIR)}")

    # 4. Index.html
    if INDEX_HTML.exists():
        txt = INDEX_HTML.read_text(encoding="utf-8")
        txt = re.sub(r'style\.css\?v=[^\s">]+', f'style.css?v={new_version}', txt)
        txt = re.sub(r'studio\.js\?v=[^\s">]+', f'studio.js?v={new_version}', txt)
        txt = re.sub(r'(class="credits-version-badge[^"]*">)v[^<]+(<)', rf'\g<1>v{new_version}\g<2>', txt)
        txt = re.sub(r'(class="about-tag-pill[^"]*">)v[^<]+(<)', rf'\g<1>v{new_version}\g<2>', txt)
        INDEX_HTML.write_text(txt, encoding="utf-8")
        print(f"  v Updated {INDEX_HTML.relative_to(BASE_DIR)}")

    # 5. Studio.js
    if STUDIO_JS.exists():
        txt = STUDIO_JS.read_text(encoding="utf-8")
        txt = re.sub(r'Version:\s*[\d\.]+', f'Version: {new_version}', txt, count=1)
        STUDIO_JS.write_text(txt, encoding="utf-8")
        print(f"  v Updated {STUDIO_JS.relative_to(BASE_DIR)}")


    # 5. Build_exe.py
    if BUILD_EXE_PY.exists():
        txt = BUILD_EXE_PY.read_text(encoding="utf-8")
        txt = re.sub(r'APP_VERSION = "[^"]+"', f'APP_VERSION = "{new_version}"', txt)
        BUILD_EXE_PY.write_text(txt, encoding="utf-8")
        print(f"  v Updated {BUILD_EXE_PY.relative_to(BASE_DIR)}")

    # 6. Test_version_consistency.py
    if TEST_VERSION_PY.exists():
        txt = TEST_VERSION_PY.read_text(encoding="utf-8")
        txt = re.sub(r'assert APP_VERSION == "[^"]+"', f'assert APP_VERSION == "{new_version}"', txt)
        txt = re.sub(r'assert data\["version"\] == "[^"]+"', f'assert data["version"] == "{new_version}"', txt)
        txt = re.sub(r'Expected APP_VERSION to be [^,]+,', f'Expected APP_VERSION to be {new_version},', txt)
        txt = re.sub(r'authoritative version [^\.]+\.', f'authoritative version {new_version}.', txt)
        TEST_VERSION_PY.write_text(txt, encoding="utf-8")
        print(f"  v Updated {TEST_VERSION_PY.relative_to(BASE_DIR)}")


    # 7. Readme.md
    if README_MD.exists():
        txt = README_MD.read_text(encoding="utf-8")
        txt = re.sub(r'badge/Release-v[0-9\.]+-00E5FF', f'badge/Release-v{new_version}-00E5FF', txt)
        txt = re.sub(r'### .*?Latest Highlights \(v[0-9\.]+\)', f'### 🚀 Latest Highlights (v{new_version})', txt)
        README_MD.write_text(txt, encoding="utf-8")
        print(f"  v Updated {README_MD.relative_to(BASE_DIR)}")

    return check_version_alignment(new_version)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        target = sys.argv[2] if len(sys.argv) > 2 else None
        ok = check_version_alignment(target)
        sys.exit(0 if ok else 1)
    elif len(sys.argv) > 1:
        ver = sys.argv[1].lstrip("v")
        ok = bump_version(ver)
        sys.exit(0 if ok else 1)
    else:
        print(f"Current version: {get_current_version()}")
        print("Usage:")
        print("  python execution/bump_version.py <version>    # Bump and sync all files")
        print("  python execution/bump_version.py --check       # Check current sync")