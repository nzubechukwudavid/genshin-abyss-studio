from pathlib import Path
from app.core.config import APP_VERSION

def test_version_consistency_across_repository():
    """Verify that APP_VERSION is uniformly defined across all configuration, UI, and release files."""
    repo_root = Path(__file__).resolve().parent.parent

    # 1. Config version
    assert APP_VERSION == "2.5.2", f"Expected APP_VERSION to be 2.5.2, got {APP_VERSION}"

    # 2. web/index.html
    html_file = repo_root / "web" / "index.html"
    assert html_file.exists()
    html_content = html_file.read_text(encoding="utf-8")
    assert f">v{APP_VERSION}<" in html_content, "Version badge missing in web/index.html"
    assert f"?v={APP_VERSION}" in html_content, "Cache-busting version query missing in web/index.html"

    # 3. execution/installer.iss
    iss_file = repo_root / "execution" / "installer.iss"
    assert iss_file.exists()
    iss_content = iss_file.read_text(encoding="utf-8")
    assert f'#define MyAppVersion "{APP_VERSION}"' in iss_content, "Version mismatch in installer.iss"

    # 4. .github/workflows/release.yml
    wf_file = repo_root / ".github" / "workflows" / "release.yml"
    assert wf_file.exists()
    wf_content = wf_file.read_text(encoding="utf-8")
    assert f'default: "v{APP_VERSION}"' in wf_content, "Default tag mismatch in release.yml"

    # 5. execution/build_exe.py
    build_file = repo_root / "execution" / "build_exe.py"
    assert build_file.exists()
    build_content = build_file.read_text(encoding="utf-8")
    assert f'APP_VERSION = "{APP_VERSION}"' in build_content, "Version mismatch in build_exe.py"

def test_health_check_returns_v250():
    """Verify that /api/health reports authoritative version 2.5.2.5.0."""
    from fastapi.testclient import TestClient
    from app import app
    client = TestClient(app)
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["version"] == APP_VERSION
    assert data["version"] == "2.5.2"
