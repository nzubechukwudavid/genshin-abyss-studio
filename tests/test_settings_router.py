import json
import pytest
from fastapi.testclient import TestClient
from app import app
from app.core import DATA_DIR
from app.core.config import USER_SETTINGS_PATH, APP_VERSION

client = TestClient(app)

def test_get_settings_endpoint():
    res = client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "settings" in data
    assert "stats" in data
    assert "system_info" in data
    assert data["system_info"]["app_version"] == APP_VERSION
    assert "recordings_dir" in data["settings"]
    assert "music_dir" in data["settings"]
    assert "output_dir" in data["settings"]

def test_save_settings_and_persistence(tmp_path):
    orig_content = None
    if USER_SETTINGS_PATH.exists():
        orig_content = USER_SETTINGS_PATH.read_text(encoding="utf-8")
    try:
        dummy_dir = str(tmp_path.resolve()).replace("\\", "/")
        payload = {
            "recordings_dir": dummy_dir,
            "fallback_music_volume": 0.55,
            "subfolder_music_scan": True
        }
        res = client.post("/api/settings", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["settings"]["recordings_dir"] == dummy_dir
        assert data["settings"]["fallback_music_volume"] == 0.55
        
        # Verify persistence on disk
        assert USER_SETTINGS_PATH.exists()
        saved = json.loads(USER_SETTINGS_PATH.read_text(encoding="utf-8"))
        assert saved["recordings_dir"] == dummy_dir
        assert saved["fallback_music_volume"] == 0.55
    finally:
        if orig_content:
            USER_SETTINGS_PATH.write_text(orig_content, encoding="utf-8")
        elif USER_SETTINGS_PATH.exists():
            USER_SETTINGS_PATH.unlink(missing_ok=True)

def test_browse_folder_structure(monkeypatch):
    import app.routers.settings as settings_module
    monkeypatch.setattr(settings_module, "_pick_folder_thread", lambda initial_dir: {"status": "ok", "path": "C:/Mock/Path", "canceled": False})
    res = client.post("/api/settings/browse-folder", json={"initial_dir": ""})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["path"] == "C:/Mock/Path"
    assert data["canceled"] is False

def test_reset_settings_endpoint():
    res = client.post("/api/settings/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "settings" in data
    assert data["settings"]["fallback_music_volume"] == 0.40
    # Clean up
    USER_SETTINGS_PATH.unlink(missing_ok=True)


def test_rescan_music_invalid_directory():
    res = client.post("/api/settings/rescan-music", json={"music_dir": "C:/NonExistentPath_XYZ123"})
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"]


def test_rescan_music_selected_directory(tmp_path):
    orig_content = None
    if USER_SETTINGS_PATH.exists():
        orig_content = USER_SETTINGS_PATH.read_text(encoding="utf-8")
    try:
        custom_music = tmp_path / "CustomMusic"
        custom_music.mkdir()
        # Create a tiny dummy file
        (custom_music / "test.mp3").write_bytes(b"0" * 20000)

        custom_str = str(custom_music.resolve()).replace("\\", "/")
        res = client.post("/api/settings/rescan-music", json={"music_dir": custom_str, "subfolder_music_scan": True})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["music_dir"] == custom_str
        assert "stats" in data
        assert data["stats"]["music_dir_valid"] is True

        # Verify that settings persistence updated music_dir
        saved = json.loads(USER_SETTINGS_PATH.read_text(encoding="utf-8"))
        assert saved["music_dir"] == custom_str
    finally:
        if orig_content:
            USER_SETTINGS_PATH.write_text(orig_content, encoding="utf-8")
        elif USER_SETTINGS_PATH.exists():
            USER_SETTINGS_PATH.unlink(missing_ok=True)


def test_rescan_music_catalog_endpoint(tmp_path):
    custom_dir = str(tmp_path.resolve()).replace("\\", "/")
    res = client.post("/api/music-catalog/rescan", json={"music_dir": custom_dir})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["music_dir"] == custom_dir

