#!/usr/bin/env python3
"""Enigma2 biçimindeki bir satellites.xml dosyasından küresel uydu KONUM listesi üretir.

Yalnızca uydu adları ve yörünge konumları alınır (kamuya açık bilgiler); frekanslar alınmaz.
Kullanım:  python3 scripts/konum_listesi.py satellites.xml   ->  uydu-konumlari.json
"""
import json
import re
import sys
import xml.etree.ElementTree as ET

BANT = re.compile(r"^(C|Ku|Ka|Ku/Ka|L|S)-band\s+", re.I)


def main(yol):
    konumlar = {}
    for sat in ET.parse(yol).getroot().findall("sat"):
        m = re.match(r"^\s*([\d.]+)\s*([EW])\s+(.*)$", sat.get("name", ""))
        if not m:
            continue
        lon = round(float(m.group(1)) * (-1 if m.group(2) == "W" else 1), 1)
        ad = BANT.sub("", m.group(3)).strip()
        adlar = konumlar.setdefault(lon, [])
        for parca in re.split(r"\s*(?:&|/(?=[A-Z]))\s*", ad):
            if parca and parca not in adlar:
                adlar.append(parca)
    liste = [{"konum": lon, "adlar": adlar} for lon, adlar in sorted(konumlar.items(), key=lambda x: -x[0])]
    with open("uydu-konumlari.json", "w", encoding="utf-8") as f:
        json.dump({"aciklama": "Küresel yerdurağan uydu konumları (uydu bulucu, AR ve pusula için). Frekans içermez.",
                   "uydular": liste}, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"uydu-konumlari.json: {len(liste)} konum")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "satellites.xml")
