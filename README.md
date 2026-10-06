# 🛰️ CepteUydu — Uydu Bulucu / Satellite Finder

Çanak anten kurulum asistanı ve uydu frekans rehberi. Tek kod tabanı; **web sitesi (PWA)** ve
**Android uygulaması (Google Play)** olarak çalışır. Türkçe ve İngilizce, telefon ve tablet uyumlu.

*Satellite dish setup assistant and frequency guide — one codebase for the web (PWA) and Android (Google Play), in Turkish and English.*

## 📱 Ekranlar

| Ekran | Dosya | Ne yapar |
|---|---|---|
| Açılış + Ana sayfa | `index.html` | İlk açılışta tanıtım ekranı, ardından özellik kartları ve hızlı bakış (kayıtlı konum için açılar) |
| Uydu Bulucu | `hizala.html` | Azimut (gerçek + pusula), elevasyon, LNB skew görseli, mesafe; **AR kamera** ile uyduyu bulma, engel kontrolü, sesli hizalama |
| Uydu Haritası | `harita.html` | Haritaya dokunarak kurulum yerini seçme, çanağın bakacağı yönü çizgiyle gösterme |
| Konumum | `konum.html` | GPS koordinatı (ondalık + derece/dakika), doğruluk, rakım, paylaşma; buradan görünen tüm uydular |
| Pusula | `pusula.html` | Gerçek kuzeye göre pusula, seçili uydunun yönü ve "sağa/sola dön" yönlendirmesi |
| Su Terazisi | `terazi.html` | Direk/ayak için kabarcıklı terazi (kalibrasyonlu) ve çanak kolu için açı ölçer |
| Şebeke Frekansları | `sebeke.html` | Her uydunun şebeke arama (NIT) ve ana transponder frekansları (`sebeke-frekanslari.json`, GitHub'dan güncellenir); resmi frekansı olmayan uydular için veriden hesaplanan en çok kanallı transponderlar |
| Frekans Rehberi | `kanallar.html` | 77 uydu, 9.614 aktif kanal; arama ve kategori filtresi, TKGS frekansı, ayar bilgisini kopyalama |
| Alan Hesaplama | `alan.html` | Haritada arazi/çatı alanı (m², dönüm/acre, hektar) ve çevre |
| Gizlilik | `gizlilik.html` | Play Store için iki dilli gizlilik politikası |

## 🗂️ Veri: GitHub'dan

Uydu ve kanal verisi `uydulara_gore_kanallar.enc` (Base64 kodlu JSON) ve sürüm bilgisi `veri-surum.json`
dosyalarındadır. Uygulama her açılışta GitHub'daki `main` dalında `veri-surum.json`'u kontrol eder; sürüm
yeniyse veriyi indirip cihazda saklar. İnternet yoksa cihazdaki son kopya, o da yoksa uygulamayla gelen
kopya kullanılır. **Veriyi güncellemek için Play Store güncellemesi gerekmez.**

```bash
python3 scripts/veri_araci.py coz        # .enc -> kanallar.json (düzenlemek için)
python3 scripts/veri_araci.py kodla      # kanallar.json -> .enc  (+ veri-surum.json)
python3 scripts/veri_araci.py temizle    # Uydu/ülke/şifreleme adlarını standartlaştırır (+ veri-surum.json)
python3 scripts/veri_araci.py surum      # Yalnızca veri-surum.json'u yeniler
```

### Dünya geneli uydu konumları

`uydu-konumlari.json`, dünya genelindeki 148 yerdurağan uydu konumunu (yalnızca uydu adı ve yörünge konumu, frekans yok) içerir.
Uydu Bulucu, AR, pusula, harita ve "Konumum" ekranları bu listeyi kanal verisindeki konumlarla birleştirir.
Böylece Amerika ve Asya-Pasifik'teki kullanıcılar da çanak açılarını hesaplayabilir.
Liste, açık kaynak OpenPLi `satellites.xml` dosyasındaki uydu adlarından `scripts/konum_listesi.py` ile üretildi.

### Şebeke frekansı eklemek

`sebeke-frekanslari.json` dosyasına uydunun yörünge konumuyla (`konum`, Batı için negatif) bir kayıt ekleyin:

```json
{ "konum": 13.0, "ad": "Hot Bird", "frekanslar": [
  { "f": "11034", "pol": "V", "sr": "27500", "fec": "3/4", "tur": "sebeke", "not_tr": "Şebeke araması", "not_en": "Network search" }
] }
```

`tur`: `sebeke` (şebeke arama frekansı) veya `ana` (ana yayın transponderi). `main` dalına gönderildiğinde uygulamalar yeni listeyi bir sonraki açılışta alır.

## 🛠️ Teknoloji

* **HTML + Alpine.js + Tailwind CSS** (derlenmiş, CDN'siz — `vendor/`, `css/app.css`)
* **Leaflet + OpenStreetMap** (haritalar), **Font Awesome** (simgeler)
* **Capacitor 8** (Android paketi, `android/`)
* Web API'leri: Geolocation, DeviceOrientation, getUserMedia, Web Audio, Service Worker, Cache API, Wake Lock
* Açı hesapları WGS84 üzerinde vektörel (`js/uydu-hesap.js`)

## 📁 Dosya yapısı

```text
uydufrekans/
├── *.html                    # Ekranlar (yukarıdaki tablo)
├── js/
│   ├── ortak.js              # Ortak durum, TR/EN çeviri (t), üst bar + menü, konum
│   ├── dil.js                # Türkçe / İngilizce metinler
│   ├── veri.js               # GitHub'dan veri + önbellek
│   ├── uydu-hesap.js         # Azimut / elevasyon / LNB skew
│   ├── ar-yon.js             # AR motoru: sensörler, projeksiyon, bip sesi
│   ├── sensor.js             # Pusula / eğim sensörü
│   ├── harita-ortak.js       # Leaflet yardımcıları, alan hesabı
│   ├── kategoriler.js        # Kanal adından kategori tahmini
│   └── ikonlar.js            # Ana ekran simgeleri
├── css/kaynak.css → css/app.css   # Tailwind kaynak → derlenmiş stil
├── vendor/                   # Alpine, Leaflet, Font Awesome (npm'den kopyalanır)
├── android/                  # Capacitor Android projesi
├── store/                    # Play Store simgesi, öne çıkan görsel, mağaza metinleri
├── docs/GOOGLE_PLAY.md       # Play Store'a yükleme rehberi
├── scripts/                  # Veri aracı, derleme, dil kontrolü, simge üretimi
├── sw.js, manifest.webmanifest
├── uydulara_gore_kanallar.enc, veri-surum.json, sebeke-frekanslari.json, uydu-konumlari.json
└── .github/workflows/android.yml  # Her gönderimde APK + AAB derler
```

## ▶️ Çalıştırma

```bash
python3 -m http.server 8000          # http://localhost:8000
```

Geliştirme için: `npm install`, `npm run build` (vendor + CSS + www), `npm run css:watch`.
Kamera ve pusula için site HTTPS üzerinden açılmalıdır (GitHub Pages veya Android uygulaması).

## 🤖 Android / Google Play

Her gönderimde GitHub Actions telefona kurulabilen bir **test APK'sı** ve Play Console'a yüklenecek
**AAB** paketi üretir (Actions → Android derleme → Artifacts). İmzalama, mağaza girişi, veri güvenliği
formu ve kapalı test adımları için: **[docs/GOOGLE_PLAY.md](docs/GOOGLE_PLAY.md)**
