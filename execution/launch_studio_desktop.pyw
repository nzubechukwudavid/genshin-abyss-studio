"""
Genshin Abyss Studio - Native Desktop App Launcher (Option A - WebView2 Container)
DOE-VERSION: 2026.09.12

Starts the unified Genshin Abyss Studio in an isolated, borderless native Windows
application window with dedicated taskbar branding, zero browser bars, hardware-accelerated
multimedia playback, and clean process lifecycle management.
"""

import os
import sys
import time
import socket
import ctypes
import urllib.request
import threading
import subprocess
from pathlib import Path

# Adjust path to find app.py and execution modules
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

MUTEX_NAME = "Global\\GenshinAbyssStudio_Instance_Mutex"
ERROR_ALREADY_EXISTS = 183


def find_edge_executable() -> Path:
    """Finds installed Microsoft Edge executable."""
    candidates = [
        Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
        Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Edge" / "Application" / "msedge.exe"
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError("Microsoft Edge executable not found. Edge is required for WebView2 desktop container.")


def find_available_port(preferred: int = 7860) -> int:
    """Finds an open loopback port, trying preferred port first."""
    for p in range(preferred, preferred + 30):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    # Fallback to ephemeral port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def is_server_healthy(port: int) -> bool:
    """Checks if server on port is responding to health checks."""
    try:
        url = f"http://127.0.0.1:{port}/api/health"
        with urllib.request.urlopen(url, timeout=0.8) as resp:
            return resp.status == 200
    except Exception:
        return False


def wait_for_server(port: int, max_retries: int = 40) -> bool:
    """Polls until server is responsive."""
    for _ in range(max_retries):
        if is_server_healthy(port):
            return True
        time.sleep(0.15)
    return False


def main():
    # 1. Check Single-Instance Mutex
    mutex = None
    try:
        mutex = ctypes.windll.kernel32.CreateMutexW(None, False, MUTEX_NAME)
        last_err = ctypes.windll.kernel32.GetLastError()
        if last_err == ERROR_ALREADY_EXISTS:
            # Another instance is already running!
            # Check if port 7860 is responsive and launch window to bring it to focus
            if is_server_healthy(7860):
                edge_exe = find_edge_executable()
                profile_dir = BASE_DIR / "data" / "cache" / "edge_profile"
                subprocess.Popen([
                    str(edge_exe),
                    f"--app=http://127.0.0.1:7860",
                    f"--user-data-dir={profile_dir}"
                ])
                sys.exit(0)
    except Exception as e:
        print(f"[!] Mutex warning: {e}", flush=True)

    # 2. Pick Available Port
    port = find_available_port(7860)
    print(f"[*] Starting Genshin Studio Desktop Server on 127.0.0.1:{port}...", flush=True)

    # 3. Import and Start FastAPI / Uvicorn in Background Daemon Thread
    import uvicorn
    from app import app

    server_config = uvicorn.Config(
        app=app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False
    )
    server = uvicorn.Server(server_config)

    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    # 4. Wait for Server Health Check
    if not wait_for_server(port):
        print(f"[!] Server failed to respond on port {port}", flush=True)
        sys.exit(1)

    print(f"[+] Server is healthy. Launching Native Edge App Window...", flush=True)

    # 5. Launch Dedicated Edge App Window
    edge_exe = find_edge_executable()
    profile_dir = BASE_DIR / "data" / "cache" / "edge_profile"
    profile_dir.mkdir(parents=True, exist_ok=True)

    edge_args = [
        str(edge_exe),
        f"--app=http://127.0.0.1:{port}",
        "--window-size=1540,940",
        f"--user-data-dir={profile_dir}",
        "--disable-features=Translate",
        "--no-first-run",
        "--no-default-browser-check",
        "--enable-features=HardwareMediaKeyHandling"
    ]

    try:
        proc = subprocess.Popen(edge_args)
        # Block until user closes the desktop app window
        proc.wait()
    except Exception as e:
        print(f"[!] Error running Edge container: {e}", flush=True)
    finally:
        print("[*] Studio window closed by user. Shutting down server...", flush=True)
        server.should_exit = True
        if mutex:
            try:
                ctypes.windll.kernel32.ReleaseMutex(mutex)
                ctypes.windll.kernel32.CloseHandle(mutex)
            except Exception:
                pass


if __name__ == "__main__":
    main()
