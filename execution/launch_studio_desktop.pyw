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
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Ensure robust file logging under pythonw.exe (which lacks console streams)
LOG_FILE = BASE_DIR / "data" / "cache" / "desktop_app.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
try:
    log_stream = open(LOG_FILE, "a", encoding="utf-8", buffering=1)
    sys.stdout = log_stream
    sys.stderr = log_stream
except Exception:
    pass


def handle_exception(exc_type, exc_value, exc_traceback):
    import traceback
    err_msg = "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    try:
        print(f"[FATAL ERROR] {time.strftime('%Y-%m-%d %H:%M:%S')}\n{err_msg}", flush=True)
    except Exception:
        pass
    try:
        ctypes.windll.user32.MessageBoxW(0, f"Genshin Abyss Studio failed to start:\n\n{err_msg[:400]}", "Studio Launch Error", 0x10)
    except Exception:
        pass

sys.excepthook = handle_exception

MUTEX_NAME = "Local\\GenshinAbyssStudio_Instance_Mutex"
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


def wait_for_server(port: int, max_retries: int = 50) -> bool:
    """Polls until server is responsive."""
    for _ in range(max_retries):
        if is_server_healthy(port):
            return True
        time.sleep(0.15)
    return False


def main():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] main() entered", flush=True)

    # 1. Check Single-Instance Mutex (User Local namespace)
    mutex = None
    try:
        mutex = ctypes.windll.kernel32.CreateMutexW(None, False, MUTEX_NAME)
        last_err = ctypes.windll.kernel32.GetLastError()
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Mutex created. last_err={last_err}", flush=True)
        if last_err == ERROR_ALREADY_EXISTS:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Instance already exists. Checking port 7860...", flush=True)
            if is_server_healthy(7860):
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Port 7860 is healthy. Launching Edge window and exiting.", flush=True)
                edge_exe = find_edge_executable()
                profile_dir = BASE_DIR / "data" / "cache" / "edge_profile"
                subprocess.Popen([
                    str(edge_exe),
                    f"--app=http://127.0.0.1:7860",
                    f"--user-data-dir={profile_dir}"
                ])
                sys.exit(0)
            else:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Port 7860 not healthy, continuing startup.", flush=True)
    except Exception as e:
        print(f"[!] Mutex warning: {e}", flush=True)

    # 2. Pick Available Port
    port = find_available_port(7860)
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Chosen port: {port}", flush=True)

    # 3. Import and Start FastAPI / Uvicorn in Background Daemon Thread
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Importing uvicorn and app...", flush=True)
    import uvicorn
    from app import app
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Successfully imported app", flush=True)

    server_config = uvicorn.Config(
        app=app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False
    )
    server = uvicorn.Server(server_config)

    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting uvicorn thread...", flush=True)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    # 4. Wait for Server Health Check
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Waiting for server health check on port {port}...", flush=True)
    if not wait_for_server(port):
        err_msg = f"Genshin Abyss Studio server failed to respond on port {port} within 8 seconds."
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [!] {err_msg}", flush=True)
        try:
            ctypes.windll.user32.MessageBoxW(0, err_msg, "Studio Launch Timeout", 0x10)
        except Exception:
            pass
        sys.exit(1)

    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [+] Server is healthy. Finding Edge executable...", flush=True)

    # 5. Launch Dedicated Edge App Window
    edge_exe = find_edge_executable()
    profile_dir = BASE_DIR / "data" / "cache" / "edge_profile"
    profile_dir.mkdir(parents=True, exist_ok=True)
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Edge exe: {edge_exe}", flush=True)

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
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Spawning Edge process with args: {edge_args}", flush=True)
        proc = subprocess.Popen(edge_args)
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Edge process spawned, PID: {proc.pid}. Waiting for exit...", flush=True)
        # Block until user closes the desktop app window
        proc.wait()
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Edge process exited with code {proc.returncode}", flush=True)
    except Exception as e:
        print(f"[!] Error running Edge container: {e}", flush=True)
    finally:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Studio window closed. Shutting down server...", flush=True)
        server.should_exit = True
        if mutex:
            try:
                ctypes.windll.kernel32.ReleaseMutex(mutex)
                ctypes.windll.kernel32.CloseHandle(mutex)
            except Exception:
                pass



if __name__ == "__main__":
    main()
