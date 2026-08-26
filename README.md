# 🛰️ CepteUydu - Modern Uydu ve Kanal Kataloğu

**CepteUydu**, modern web teknolojileriyle geliştirilmiş, uydulara göre ayrıştırılmış frekans ve kanal rehberidir. Şifrelenmiş veri dosyalarını güvenli bir şekilde çözerek kullanıcıya hızlı ve şık bir arayüz üzerinden sunar.

## 🚀 Öne Çıkan Özellikler

* **Dinamik Uydu Listeleme:** Uyduları kartlar halinde görüntüler ve toplam kayıtlı yayın sayılarını gösterir.
* **Gelişmiş Kanal Filtreleme:** Uydu içerisindeki kanalları **Aktif** veya **Pasif / Yayın Dışı** olarak filtreleme imkanı.
* **Hızlı Arama:** Hem ana sayfada genel uydu/kanal araması hem de modal içinde detaylı kanal, frekans ve ülke araması.
* **Güvenli Veri Yapısı:** Verileri şifrelenmiş (`.enc`) formatta saklar ve tarayıcı tarafında güvenli bir şekilde çözer.
* **Modern Tasarım:** Tailwind CSS ile oluşturulmuş karanlık mod (Dark Mode) uyumlu uzay temalı arayüz.

## 🛠️ Kullanılan Teknolojiler

Projede kullanılan kütüphane ve teknolojiler:

* **HTML5 / CSS3**
* **Tailwind CSS** (Stil ve tasarım)
* **Alpine.js** (Reaktif arayüz ve uygulama mantığı)
* **FontAwesome** (İkonlar)
* **JavaScript (ES6+)** (Şifre çözme ve filtreleme mantığı)

## 📁 Proje Dosya Yapısı

Projenin temel klasör ve dosya düzeni şu şekildedir:

```text
atilimsistem/
│
├── index.html                  # Ana arayüz ve uygulama mantığı
├── uydulara_gore_kanallar.enc  # Şifrelenmiş uydu ve kanal veri tabanı
└── README.md                   # Proje açıklama dosyası
