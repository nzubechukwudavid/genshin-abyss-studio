"""
Enrich character catalog with rarity (5/4) and vision (element).
DOE-VERSION: 2026.09.10
"""
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CATALOG_FILE = BASE_DIR / "data" / "cache" / "hoyowiki_characters.json"
META_FILE = BASE_DIR / "data" / "cache" / "characters_metadata.json"
STANDALONE_CATALOG = BASE_DIR / "genshin-abyss-studio" / "data" / "cache" / "hoyowiki_characters.json"

CHARACTER_DATABASE = {
    # 5-Star Characters
    "Albedo": (5, "Geo"),
    "Alhaitham": (5, "Dendro"),
    "Aloy": (5, "Cryo"),
    "Arataki Itto": (5, "Geo"),
    "Itto": (5, "Geo"),
    "Arlecchino": (5, "Pyro"),
    "Baizhu": (5, "Dendro"),
    "Chasca": (5, "Anemo"),
    "Childe": (5, "Hydro"),
    "Tartaglia": (5, "Hydro"),
    "Chiori": (5, "Geo"),
    "Citlali": (5, "Cryo"),
    "Clorinde": (5, "Electro"),
    "Columbina": (5, "Hydro"),
    "Cyno": (5, "Electro"),
    "Dehya": (5, "Pyro"),
    "Diluc": (5, "Pyro"),
    "Durin": (5, "Pyro"),
    "Emilie": (5, "Dendro"),
    "Escoffier": (5, "Cryo"),
    "Eula": (5, "Cryo"),
    "Flins": (5, "Electro"),
    "Furina": (5, "Hydro"),
    "Ganyu": (5, "Cryo"),
    "Hu Tao": (5, "Pyro"),
    "Jean": (5, "Anemo"),
    "Kaedehara Kazuha": (5, "Anemo"),
    "Kazuha": (5, "Anemo"),
    "Kamisato Ayaka": (5, "Cryo"),
    "Ayaka": (5, "Cryo"),
    "Kamisato Ayato": (5, "Hydro"),
    "Ayato": (5, "Hydro"),
    "Keqing": (5, "Electro"),
    "Kinich": (5, "Dendro"),
    "Klee": (5, "Pyro"),
    "Lauma": (5, "Dendro"),
    "Linnea": (5, "Geo"),
    "Lohen": (5, "Cryo"),
    "Lyney": (5, "Pyro"),
    "Manekin": (5, "Pyro"),
    "Manekina": (5, "Pyro"),
    "Mavuika": (5, "Pyro"),
    "Mona": (5, "Hydro"),
    "Mualani": (5, "Hydro"),
    "Nahida": (5, "Dendro"),
    "Navia": (5, "Geo"),
    "Nefer": (5, "Dendro"),
    "Neuvillette": (5, "Hydro"),
    "Nicole": (5, "Pyro"),
    "Nilou": (5, "Hydro"),
    "Odette": (5, "Cryo"),
    "Qiqi": (5, "Cryo"),
    "Raiden Shogun": (5, "Electro"),
    "Raiden": (5, "Electro"),
    "Sandrone": (5, "Cryo"),
    "Sangonomiya Kokomi": (5, "Hydro"),
    "Kokomi": (5, "Hydro"),
    "Shenhe": (5, "Cryo"),
    "Sigewinne": (5, "Hydro"),
    "Skirk": (5, "Cryo"),
    "Tighnari": (5, "Dendro"),
    "Traveler": (5, "Pyro"),
    "Traveler (Anemo)": (5, "Anemo"),
    "Traveler (Geo)": (5, "Geo"),
    "Traveler (Electro)": (5, "Electro"),
    "Traveler (Dendro)": (5, "Dendro"),
    "Traveler (Hydro)": (5, "Hydro"),
    "Traveler (Pyro)": (5, "Pyro"),
    "Traveler (Cryo)": (5, "Cryo"),
    "Varesa": (5, "Electro"),
    "Varka": (5, "Anemo"),
    "Venti": (5, "Anemo"),
    "Vesna": (5, "Anemo"),
    "Vodyanitsa": (5, "Hydro"),
    "Wanderer": (5, "Anemo"),
    "Scaramouche": (5, "Anemo"),
    "Wriothesley": (5, "Cryo"),
    "Xianyun": (5, "Anemo"),
    "Xiao": (5, "Anemo"),
    "Xilonen": (5, "Geo"),
    "Yae Miko": (5, "Electro"),
    "Yelan": (5, "Hydro"),
    "Yoimiya": (5, "Pyro"),
    "Yumemizuki Mizuki": (5, "Anemo"),
    "Mizuki": (5, "Anemo"),
    "Zhongli": (5, "Geo"),
    "Zibai": (5, "Geo"),

    # 4-Star Characters
    "Aino": (4, "Hydro"),
    "Alyosha": (4, "Electro"),
    "Amber": (4, "Pyro"),
    "Barbara": (4, "Hydro"),
    "Beidou": (4, "Electro"),
    "Bennett": (4, "Pyro"),
    "Candace": (4, "Hydro"),
    "Charlotte": (4, "Cryo"),
    "Chevreuse": (4, "Pyro"),
    "Chongyun": (4, "Cryo"),
    "Collei": (4, "Dendro"),
    "Dahlia": (4, "Hydro"),
    "Diona": (4, "Cryo"),
    "Dori": (4, "Electro"),
    "Faruzan": (4, "Anemo"),
    "Fischl": (4, "Electro"),
    "Freminet": (4, "Cryo"),
    "Gaming": (4, "Pyro"),
    "Gorou": (4, "Geo"),
    "Iansan": (4, "Electro"),
    "Ifa": (4, "Anemo"),
    "Illuga": (4, "Geo"),
    "Ineffa": (4, "Electro"),
    "Jahoda": (4, "Anemo"),
    "Kachina": (4, "Geo"),
    "Kaeya": (4, "Cryo"),
    "Kaveh": (4, "Dendro"),
    "Kirara": (4, "Dendro"),
    "Kujou Sara": (4, "Electro"),
    "Sara": (4, "Electro"),
    "Kuki Shinobu": (4, "Electro"),
    "Shinobu": (4, "Electro"),
    "Lan Yan": (4, "Anemo"),
    "Layla": (4, "Cryo"),
    "Lisa": (4, "Electro"),
    "Lynette": (4, "Anemo"),
    "Mika": (4, "Cryo"),
    "Ningguang": (4, "Geo"),
    "Noelle": (4, "Geo"),
    "Ororon": (4, "Electro"),
    "Prune": (4, "Anemo"),
    "Razor": (4, "Electro"),
    "Rosaria": (4, "Cryo"),
    "Sayu": (4, "Anemo"),
    "Sethos": (4, "Electro"),
    "Shikanoin Heizou": (4, "Anemo"),
    "Heizou": (4, "Anemo"),
    "Sucrose": (4, "Anemo"),
    "Thoma": (4, "Pyro"),
    "Xiangling": (4, "Pyro"),
    "Xingqiu": (4, "Hydro"),
    "Xinyan": (4, "Pyro"),
    "Yanfei": (4, "Pyro"),
    "Yaoyao": (4, "Dendro"),
    "Yun Jin": (4, "Geo"),
    "Yunjin": (4, "Geo"),
}

def enrich():
    if not CATALOG_FILE.exists():
        print("[!] Catalog file not found")
        return

    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    enriched = {}
    for name, data in catalog.items():
        info = CHARACTER_DATABASE.get(name)
        if not info:
            for k, v in CHARACTER_DATABASE.items():
                if k.lower() == name.lower() or k.lower() in name.lower():
                    info = v
                    break
        
        rarity = info[0] if info else 5
        vision = info[1] if info else "Pyro"

        enriched[name] = {
            "id": data.get("id", ""),
            "icon": data.get("icon", ""),
            "rarity": rarity,
            "vision": vision
        }

    META_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)

    with open(CATALOG_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)

    if STANDALONE_CATALOG.parent.exists():
        STANDALONE_CATALOG.parent.mkdir(parents=True, exist_ok=True)
        with open(STANDALONE_CATALOG, "w", encoding="utf-8") as f:
            json.dump(enriched, f, indent=2, ensure_ascii=False)

    print(f"[+] Enriched {len(enriched)} characters successfully!")

if __name__ == "__main__":
    enrich()
