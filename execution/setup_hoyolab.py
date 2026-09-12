"""
HoYoLAB Connection & Setup Utility
DOE-VERSION: 2026.09.08

Interactive assistant for testing and storing HoYoLAB Battle Chronicle credentials or UID.
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv, set_key

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

if not ENV_FILE.exists():
    ENV_FILE.touch()

load_dotenv(ENV_FILE)

BOOKMARKLET_CODE = (
    "javascript:(function(){"
    "const c=document.cookie;"
    "const ltuid=(c.match(/ltuid_v2=([0-9]+)/)||c.match(/ltuid=([0-9]+)/));"
    "const ltoken=(c.match(/lttoken_v2=([^;]+)/)||c.match(/ltoken=([^;]+)/));"
    "if(ltuid && ltoken){"
    "prompt('Copy your credentials for .env:', `HOYOLAB_LTUID=${ltuid[1]}\\nHOYOLAB_LTOKEN=${ltoken[1]}`);"
    "}else{alert('Could not find HoYoLAB cookies. Make sure you are logged in on hoyolab.com!');}"
    "})();"
)

async def test_connection(uid: int, ltuid: str = None, ltoken: str = None):
    try:
        import genshin
    except ImportError:
        print("[!] genshin.py is not installed. Please run: pip install genshin")
        return False

    cookies = {}
    if ltuid and ltoken:
        cookies = {"ltuid_v2": ltuid, "lttoken_v2": ltoken}

    client = genshin.Client(cookies=cookies if cookies else None)
    print(f"[*] Testing Abyss connection for UID {uid}...")
    try:
        data = await client.get_genshin_spiral_abyss(uid)
        print(f"[✓] Success! Retrieved data: Total Stars={data.total_stars}, Total Wins={data.total_wins}")
        return True
    except Exception as e:
        print(f"[!] Test failed: {e}")
        return False


def main():
    print("=" * 65)
    print("   HoYoLAB Connection Setup (Genshin Spiral Abyss)")
    print("=" * 65)
    print("Choose an option:")
    print("1. Test existing credentials in .env")
    print("2. Set up / update Genshin UID and HoYoLAB cookies")
    print("3. Get 1-click browser bookmarklet code for hoyolab.com")
    print("4. Exit")

    choice = input("\nEnter choice [1-4]: ").strip()

    if choice == "1":
        uid = os.getenv("GENSHIN_UID")
        ltuid = os.getenv("HOYOLAB_LTUID")
        ltoken = os.getenv("HOYOLAB_LTOKEN")
        if not uid:
            print("[!] GENSHIN_UID not configured in .env.")
            return
        asyncio.run(test_connection(int(uid), ltuid, ltoken))

    elif choice == "2":
        uid = input("Enter your in-game Genshin UID: ").strip()
        ltuid = input("Enter HOYOLAB_LTUID (optional, press Enter to skip): ").strip()
        ltoken = input("Enter HOYOLAB_LTOKEN (optional, press Enter to skip): ").strip()

        if uid:
            set_key(str(ENV_FILE), "GENSHIN_UID", uid)
        if ltuid:
            set_key(str(ENV_FILE), "HOYOLAB_LTUID", ltuid)
        if ltoken:
            set_key(str(ENV_FILE), "HOYOLAB_LTOKEN", ltoken)

        print(f"\n[✓] Saved to {ENV_FILE}")
        if uid:
            asyncio.run(test_connection(int(uid), ltuid or None, ltoken or None))

    elif choice == "3":
        print("\n--- 1-Click Bookmarklet ---")
        print("Create a new bookmark in your browser (Chrome/Edge/Safari/Firefox), and paste this as the URL:")
        print("\n" + BOOKMARKLET_CODE + "\n")
        print("Then go to https://www.hoyolab.com, click the bookmark, and it will pop up your credentials!")

    else:
        print("Exiting.")


if __name__ == "__main__":
    main()
