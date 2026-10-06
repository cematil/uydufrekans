#!/usr/bin/env python3
"""CepteUydu veri aracı.

Kullanım:
    python3 scripts/veri_araci.py coz      [enc] [json]   # .enc -> okunabilir JSON
    python3 scripts/veri_araci.py kodla    [json] [enc]   # JSON -> .enc
    python3 scripts/veri_araci.py temizle  [enc]          # .enc dosyasını yerinde temizler
    python3 scripts/veri_araci.py surum    [enc]          # veri-surum.json dosyasını yeniden üretir

"kodla" ve "temizle" komutları veri-surum.json dosyasını da günceller. Uygulama bu
dosyadaki "surum" alanı değişince yeni veriyi GitHub'dan indirir.

Not: .enc dosyası UTF-8 JSON'un Base64 ile kodlanmış halidir (gerçek şifreleme değildir).
"""
import base64
import hashlib
import json
from datetime import datetime, timezone
import re
import sys
from collections import OrderedDict

VARSAYILAN_ENC = "uydulara_gore_kanallar.enc"
PASIF_GRUP = "Pasif / Eski Yayınlar"  # eski sürümlerdeki arşiv grubu; temizle komutu siler
SURUM_DOSYASI = "veri-surum.json"


def oku(yol):
    with open(yol, encoding="ascii") as f:
        return json.loads(base64.b64decode(f.read()).decode("utf-8"), object_pairs_hook=OrderedDict)


def yaz(veri, yol):
    ham = json.dumps(veri, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with open(yol, "w", encoding="ascii") as f:
        f.write(base64.b64encode(ham).decode("ascii"))


def surum_yaz(enc):
    """Uygulamanın güncelleme kontrolünde kullandığı küçük özet dosyasını yazar."""
    with open(enc, "rb") as f:
        ham = f.read()
    veri = json.loads(base64.b64decode(ham).decode("utf-8"))
    ozet = {
        "surum": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sha256": hashlib.sha256(ham).hexdigest(),
        "uydu": len(veri),
        "kayit": sum(map(len, veri.values())),
        "aktif": sum(1 for v in veri.values() for k in v if k.get("is_active")),
        "dosya": enc,
    }
    with open(SURUM_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(ozet, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{SURUM_DOSYASI}: sürüm {ozet['surum']}, {ozet['kayit']} kayıt")


# --- Uydu adları -----------------------------------------------------------

UYDU_ADI_DUZELT = {
    "Türkmenistan / MonacoSat (52.0°D)": "TürkmenÄlem / MonacoSat (52.0°E)",
    "TurkmenÄlem / MonacoSat (52.0°E)": "TürkmenÄlem / MonacoSat (52.0°E)",
    "BulgaristanSat (1,9°E)": "BulgariaSat (1.9°E)",
}


def uydu_adi(ad):
    ad = UYDU_ADI_DUZELT.get(ad, ad)
    # Yörünge konumunda ondalık virgülü noktaya çevir: (68,5°E) -> (68.5°E)
    ad = re.sub(r"\((\d+),(\d+)°", r"(\1.\2°", ad)
    # Türkçe/İngilizce karışık yazımları birleştir
    ad = ad.replace(" Batı ", " West ")
    ad = re.sub(r"^Turksat\b", "Türksat", ad)
    return ad


# --- Ülke adları -----------------------------------------------------------

ULKE_DUZELT = {
    "tanımlanmamış": "Bilinmiyor", "O": "Bilinmiyor", "Kuzey": "Bilinmiyor",
    "Turkiye": "Türkiye", "Çekiye": "Çekya", "Italya": "İtalya", "bulgaristan": "Bulgaristan",
    "Brezılya": "Brezilya", "Cezaır": "Cezayir", "Suudi arabistan": "Suudi Arabistan",
    "Abu Dhabi": "Abu Dabi", "Afghanistan": "Afganistan", "Argentina": "Arjantin",
    "Australia": "Avustralya", "Bahrain Emirates": "Bahreyn Emirlikleri",
    "Bangladesh": "Bangladeş", "Belarus": "Belarus", "Bolivia": "Bolivya",
    "Botswana": "Botsvana", "Cambodia": "Kamboçya", "Cameroun": "Kamerun",
    "Canada": "Kanada", "Central African Republic": "Orta Afrika Cumhuriyeti",
    "Chad": "Çad", "Colombia": "Kolombiya", "Congo": "Kongo", "Costa Rica": "Kosta Rika",
    "Cuba": "Küba", "Djibouti": "Cibuti", "Dominican Republic": "Dominik Cumhuriyeti",
    "Dubai Emirates": "Dubai Emirlikleri", "Equatorial Guinea": "Ekvator Ginesi",
    "Eritrea": "Eritre", "Estonia": "Estonya", "Ethiopia": "Etiyopya", "Gambia": "Gambiya",
    "Ghana": "Gana", "Greenland": "Grönland", "Guatemala": "Guatemala", "Guinea": "Gine",
    "Iceland": "İzlanda", "Indonesia": "Endonezya", "Ireland": "İrlanda",
    "Ivory Coast": "Fildişi Sahili", "Jamaica": "Jamaika", "Japan": "Japonya",
    "Kyrgyzstan": "Kırgızistan", "Latvia": "Letonya", "Lithuania": "Litvanya",
    "Luxemburg": "Lüksemburg", "Malawi": "Malavi", "Malaysia": "Malezya",
    "Mauritania": "Moritanya", "Mexico": "Meksika", "Mozambique": "Mozambik",
    "Nigeria": "Nijerya", "North Korea": "Kuzey Kore", "Oman": "Umman",
    "Paraguay": "Paraguay", "Philippines": "Filipinler", "Qatar": "Katar",
    "Russia": "Rusya", "Rwanda": "Ruanda", "Sharjah Emirate": "Şarika Emirliği",
    "Singapore": "Singapur", "Slovakia": "Slovakya", "Slovenia": "Slovenya",
    "Somalia": "Somali", "South Africa": "Güney Afrika", "Tajikistan": "Tacikistan",
    "Tanzania": "Tanzanya", "Thailand": "Tayland", "Turkmenistan": "Türkmenistan",
    "U.S.A.": "ABD", "Amerika": "ABD", "Ukraine": "Ukrayna",
    "United Arab Emirates": "Birleşik Arap Emirlikleri", "Vatican": "Vatikan",
    "Venezuela": "Venezuela", "Vietnam": "Vietnam", "Zambia": "Zambiya",
    "Zimbabwe": "Zimbabve", "Mesopotamia": "Mezopotamya",
}


def ulke(ad):
    ad = (ad or "").strip()
    return ULKE_DUZELT.get(ad, ad) or "Bilinmiyor"


# --- Şifreleme sistemleri --------------------------------------------------

SIFRE_SISTEMLERI = [
    "BISS-E", "BISS", "BetaCrypt", "BulCrypt", "Compunicate", "Conax", "Cryptoguard",
    "Cryptoworks", "DRE-Crypt", "DVB Scrambling", "GkWare", "HRT", "Irdeto 2", "Marlin",
    "Mediaguard 3", "Mediaguard 2", "Mediaguard", "Nagravision 3", "Panaccess", "PowerVu",
    "RedCrypter", "Roscrypt 2", "Roscrypt", "Tandberg", "Topwell", "VisionCrypt",
    "VeriMatrix", "Viaccess 2.5", "Viaccess 2.6", "Viaccess 3.0", "Viaccess 4.0",
    "Viaccess 5.0", "Viaccess 6.0", "VideoGuard", "Xcrypt", "Şifresiz",
]
SIFRE_ESANLAM = {"DRE-Kript": "DRE-Crypt", "DVB Şifreleme": "DVB Scrambling"}


def sifreleme(deger):
    s = (deger or "").strip()
    if not s or s == "Bilinmiyor":
        return "Bilinmiyor"
    for eski, yeni in SIFRE_ESANLAM.items():
        s = s.replace(eski, yeni)
    s = re.sub(r"(?i)[şs]ifresiz", "Şifresiz", s)
    bulunan, i = [], 0
    while i < len(s):
        if s[i] in " ,":
            i += 1
            continue
        for ad in SIFRE_SISTEMLERI:
            if s.startswith(ad, i):
                if ad not in bulunan:
                    bulunan.append(ad)
                i += len(ad)
                break
        else:
            return deger.strip()  # tanınmayan biçim: olduğu gibi bırak
    # "Şifresiz" başta, diğerleri ardından
    bulunan.sort(key=lambda a: a != "Şifresiz")
    return ", ".join(bulunan)


# --- Polarizasyon ----------------------------------------------------------

POLARIZASYON = {"L": "Left (Sol)", "R": "Right (Sağ)", "H": "Horizontal (Yatay)", "V": "Vertical (Dikey)"}


def temizle(veri):
    yeni = OrderedDict()
    for grup, kanallar in veri.items():
        if grup == PASIF_GRUP:
            continue  # yayın dışı / frekanssız eski kayıtlar tutulmaz
        grup_adi = uydu_adi(grup)
        hedef = yeni.setdefault(grup_adi, [])
        for k in kanallar:
            k = OrderedDict(k)
            k["satellite"] = grup_adi
            k["name"] = (k.get("name") or "").strip()
            k["country"] = ulke(k.get("country"))
            k["encryption"] = sifreleme(k.get("encryption"))
            k["polarization"] = POLARIZASYON.get(k.get("polarization", ""), k.get("polarization", ""))
            hedef.append(k)

    # Birebir aynı kayıtları ayıkla
    for grup, kanallar in yeni.items():
        gorulen, tekil = set(), []
        for k in kanallar:
            anahtar = json.dumps(k, ensure_ascii=False, sort_keys=True)
            if anahtar not in gorulen:
                gorulen.add(anahtar)
                tekil.append(k)
        kanallar[:] = sorted(tekil, key=lambda k: k["name"].casefold())
    return yeni


def main(argv):
    if len(argv) < 2 or argv[1] not in ("coz", "kodla", "temizle", "surum"):
        print(__doc__)
        return 1
    komut = argv[1]
    if komut == "coz":
        enc = argv[2] if len(argv) > 2 else VARSAYILAN_ENC
        cikti = argv[3] if len(argv) > 3 else "kanallar.json"
        with open(cikti, "w", encoding="utf-8") as f:
            json.dump(oku(enc), f, ensure_ascii=False, indent=2)
        print(f"{enc} -> {cikti}")
    elif komut == "kodla":
        girdi = argv[2] if len(argv) > 2 else "kanallar.json"
        enc = argv[3] if len(argv) > 3 else VARSAYILAN_ENC
        with open(girdi, encoding="utf-8") as f:
            yaz(json.load(f, object_pairs_hook=OrderedDict), enc)
        print(f"{girdi} -> {enc}")
        surum_yaz(enc)
    elif komut == "surum":
        surum_yaz(argv[2] if len(argv) > 2 else VARSAYILAN_ENC)
    else:
        enc = argv[2] if len(argv) > 2 else VARSAYILAN_ENC
        eski = oku(enc)
        yeni = temizle(eski)
        yaz(yeni, enc)
        once = sum(map(len, eski.values()))
        sonra = sum(map(len, yeni.values()))
        print(f"Uydu grubu: {len(eski)} -> {len(yeni)}, kayıt: {once} -> {sonra}")
        surum_yaz(enc)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
