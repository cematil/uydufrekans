# 🛰️ CepteUydu - Modern Uydu ve Kanal Kataloğu

**CepteUydu**, modern web teknolojileriyle geliştirilmiş, uydulara göre ayrıştırılmış frekans ve kanal rehberidir. Şifrelenmiş veri dosyalarını güvenli bir şekilde çözerek kullanıcıya hızlı ve şık bir arayüz üzerinden sunar.

## 🚀 Öne Çıkan Özellikler

* **Dinamik Uydu Listeleme:** Uyduları kartlar halinde görüntüler ve toplam kayıtlı yayın sayılarını gösterir.
* **Gelişmiş Kanal Filtreleme:** Uydu içerisindeki kanalları **Aktif** veya **Pasif / Yayın Dışı** olarak filtreleme imkanı.
* **Hızlı Arama:** Hem ana sayfada genel uydu/kanal araması hem de modal içinde detaylı kanal, frekans ve ülke araması.
* **Kodlanmış Veri Dosyası:** Veriler Base64 ile kodlanmış JSON (`.enc`) olarak saklanır ve tarayıcıda çözülür. (Bu bir şifreleme değildir; yalnızca dosyanın doğrudan okunmasını zorlaştırır.)
* **Akıllı Arama:** Türkçe karakter duyarsız arama (`turkiye` → `Türkiye`, `sifresiz` → `Şifresiz`); kanal adı, frekans, ülke, şifreleme ve SID üzerinde çalışır.
* **Hızlı Liste:** Binlerce kanallı listeler sayfalı ("Daha fazla göster") yüklenir; ayar bilgisi tek tıkla panoya kopyalanır.
* **Modern Tasarım:** Tailwind CSS ile oluşturulmuş karanlık mod (Dark Mode) uyumlu uzay temalı arayüz.

## 📡 Çanak Kurulum Asistanı (`hizala.html`)

* **Açı Hesaplayıcı:** GPS, şehir listesi veya elle girilen koordinata göre seçilen uydu için azimut (gerçek ve pusula/manyetik), elevasyon, **LNB skew** açısı ve uyduya mesafe. Hesap WGS84 elipsoidi üzerinde vektörel yapılır (`js/uydu-hesap.js`).
* **LNB Görseli:** LNB'nin hangi yöne, kaç derece döndürüleceği çizimle gösterilir.
* **AR Uydu Bulucu:** Kamera görüntüsü üzerinde hedef uydu, diğer uydular, ufuk çizgisi ve Clarke kuşağı çizilir. Uydunun önüne bina/ağaç girip girmediği kurulumdan önce görülür.
* **Sesli Hizalama:** Telefon uydu yönüne yaklaştıkça bip sesi sıklaşır (park sensörü gibi), 2° içinde sürekli ses ve titreşim.
* **Kalibrasyon:** Manyetik sapma (deklinasyon), pusula ince ayarı ve kamera görüş açısı ayarlanabilir.

## 📲 Mobil Uygulama (PWA) ve Çevrimdışı Çalışma

* `manifest.webmanifest` sayesinde site telefona "Ana ekrana ekle" ile uygulama gibi kurulur.
* `sw.js` (service worker) uygulama dosyalarını ve veri dosyasını ilk açılışta önbelleğe alır; sonrasında **internetsiz** çalışır. Veri dosyası her açılışta ağdan tazelenir, ağ yoksa son kopya kullanılır.
* Kamera ve pusula erişimi için site **HTTPS** üzerinden yayınlanmalıdır (ör. GitHub Pages). iOS'ta hareket sensörü izni "AR" düğmesine basınca istenir.

## 🛰️ Diğer Özellikler

* **TKGS Sabit Kartı:** Türksat şebeke arama frekansları (12380 V 27500, alternatif 12423 H 30000) ana sayfada sabit ve tek tıkla kopyalanabilir.
* **Kategori Filtresi:** Spor, Haber, Belgesel, Film & Dizi, Çocuk, Müzik, Radyo, 4K/UHD, HD. Veride kategori alanı olmadığından kanal adından tahmin edilir (`js/kategoriler.js`).

## 🛠️ Kullanılan Teknolojiler

Projede kullanılan kütüphane ve teknolojiler:

* **HTML5 / CSS3**
* **Tailwind CSS** (Stil ve tasarım)
* **Alpine.js** (Reaktif arayüz ve uygulama mantığı)
* **FontAwesome** (İkonlar)
* **JavaScript (ES6+)** (Veri çözme, filtreleme, açı hesapları)
* **Web API'leri:** Geolocation, DeviceOrientation, getUserMedia (kamera), Web Audio, Service Worker, Wake Lock

## 📁 Proje Dosya Yapısı

```text
uydufrekans/
│
├── index.html                  # Frekans rehberi
├── hizala.html                 # Çanak kurulum asistanı ve AR uydu bulucu
├── uydulara_gore_kanallar.enc  # Base64 kodlu uydu ve kanal veri tabanı
├── js/
│   ├── veri.js                 # Veri yükleme/çözme, arama normalizasyonu
│   ├── uydu-hesap.js           # Azimut / elevasyon / LNB skew hesapları
│   ├── ar-yon.js               # AR motoru: sensörler, projeksiyon, bip sesi
│   └── kategoriler.js          # Kanal adından kategori tahmini
├── sw.js                       # Service worker (çevrimdışı önbellek)
├── manifest.webmanifest        # PWA tanımı
├── icon.svg, icons/            # Uygulama simgeleri
├── scripts/
│   └── veri_araci.py           # Veri dosyasını çözme / kodlama / temizleme aracı
└── README.md                   # Proje açıklama dosyası
```

## ▶️ Yerelde Çalıştırma

Sayfa veriyi `fetch` ile yüklediği için `index.html` dosyası doğrudan (`file://`) açılınca çalışmaz; basit bir sunucu kullanın:

```bash
python3 -m http.server 8000
# Tarayıcıda: http://localhost:8000
```

## 🗂️ Veriyi Güncelleme

```bash
python3 scripts/veri_araci.py coz        # .enc -> kanallar.json (düzenlemek için)
python3 scripts/veri_araci.py kodla      # kanallar.json -> .enc
python3 scripts/veri_araci.py temizle    # Uydu/ülke/şifreleme adlarını standartlaştırır
```

Veri dosyasındaki her kayıt şu alanları içerir: `satellite`, `name`, `country`, `frequency`, `polarization`, `symbol_rate`, `fec`, `encryption`, `sid`, `is_active`.
