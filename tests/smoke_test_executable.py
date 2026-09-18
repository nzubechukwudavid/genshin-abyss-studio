"""
Smoke test runner for Genshin Abyss Studio Standalone Windows Executable.
Launches the built application executable, polls /api/health until ready,
validates runtime integrity, and terminates cleanly.
"""

import sys
import time
import subprocess
import urllib.request
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
EXE_PATH = ROOT_DIR / "dist" / "GenshinAbyssStudio" / "GenshinAbyssStudio.exe"
PORT = 7860
HEALTH_URL = f"http://127.0.0.1:{PORT}/api/health"
TIMEOUT_SECS = 20


def run_smoke_test() -> bool:
    print("=" * 60)
    print("  Genshin Abyss Studio - Executable Smoke Test")
    print("=" * 60)

    if not EXE_PATH.exists():
        print(f"[!] Executable not found at {EXE_PATH}")
        print("    Run `python execution/build_exe.py` first to generate the standalone build.")
        return False

    print(f"[*] Launching executable: {EXE_PATH}")
    proc = subprocess.Popen([str(EXE_PATH)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    start_time = time.time()
    healthy = False
    health_data = {}

    try:
        print(f"[*] Polling health probe at {HEALTH_URL} (timeout: {TIMEOUT_SECS}s)...")
        while time.time() - start_time < TIMEOUT_SECS:
            try:
                req = urllib.request.Request(HEALTH_URL, headers={"User-Agent": "SmokeTester/2.0"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status == 200:
                        raw = resp.read().decode("utf-8")
                        health_data = json.loads(raw)
                        healthy = True
                        break
            except Exception:
                time.sleep(0.5)

        if healthy:
            print("[+] Executable is HEALTHY and responding!")
            print(f"    Version: {health_data.get('version')}")
            print(f"    Status:  {health_data.get('status')}")
            print(f"    Checks:  {health_data.get('checks')}")
            return True
        else:
            print(f"[-] Health check failed after {TIMEOUT_SECS} seconds.")
            return False

    finally:
        print("[*] Terminating smoke test process...")
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        print("[+] Process terminated cleanly.")


if __name__ == "__main__":
    success = run_smoke_test()
    sys.exit(0 if success else 1)
