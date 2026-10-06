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

## 🛠️ Kullanılan Teknolojiler

Projede kullanılan kütüphane ve teknolojiler:

* **HTML5 / CSS3**
* **Tailwind CSS** (Stil ve tasarım)
* **Alpine.js** (Reaktif arayüz ve uygulama mantığı)
* **FontAwesome** (İkonlar)
* **JavaScript (ES6+)** (Şifre çözme ve filtreleme mantığı)

## 📁 Proje Dosya Yapısı

```text
uydufrekans/
│
├── index.html                  # Ana arayüz ve uygulama mantığı
├── uydulara_gore_kanallar.enc  # Base64 kodlu uydu ve kanal veri tabanı
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
