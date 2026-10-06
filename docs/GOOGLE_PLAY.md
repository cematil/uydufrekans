# CepteUydu'yu Google Play'e Yükleme Rehberi

Bu proje tek bir kod tabanından üç şey üretir:

| Çıktı | Nerede | Ne için |
|---|---|---|
| Web sitesi / PWA | GitHub Pages | Tarayıcıdan kullanım, gizlilik politikası adresi |
| Test APK'sı | GitHub Actions → `cepteuydu-test-apk` | Telefona doğrudan kurup denemek |
| Play paketi (AAB) | GitHub Actions → `cepteuydu-play-aab` | Google Play Console'a yüklemek |

Android uygulaması [Capacitor](https://capacitorjs.com) ile web uygulamasını paketler. Uygulama dosyaları
telefona gömülüdür (internetsiz açılır); uydu/kanal verisi ise her açılışta **GitHub'daki `main` dalından**
kontrol edilip yenisi varsa indirilir (`js/veri.js`).

---

## 1. Test APK'sını telefona kurmak

1. GitHub'da depo → **Actions** → **Android derleme** → en son başarılı çalıştırma.
2. Sayfanın altındaki **Artifacts** bölümünden `cepteuydu-test-apk` dosyasını indirin (zip içinden `app-debug.apk` çıkar).
3. APK'yı telefona atın ve açın. Android "bilinmeyen kaynaklardan yükleme" izni isteyecektir.

> Elle derleme başlatmak için: Actions → Android derleme → **Run workflow**.

## 2. İmza anahtarı (yükleme anahtarı) oluşturmak — bir kez

Google Play, uygulamanın her sürümünün aynı anahtarla imzalanmasını ister. **Bu dosyayı ve şifreleri kaybetmeyin.**

```bash
keytool -genkeypair -v -keystore cepteuydu-upload.jks -alias cepteuydu \
        -keyalg RSA -keysize 2048 -validity 10000
```

(`keytool`, Java/Android Studio ile birlikte gelir.) Ardından dosyayı base64'e çevirin:

```bash
base64 -w0 cepteuydu-upload.jks > keystore.txt     # macOS: base64 -i cepteuydu-upload.jks -o keystore.txt
```

GitHub'da depo → **Settings → Secrets and variables → Actions → New repository secret** ile şu 4 gizli değeri ekleyin:

| Secret adı | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `keystore.txt` dosyasının içeriği |
| `ANDROID_KEYSTORE_PASSWORD` | keystore şifresi |
| `ANDROID_KEY_ALIAS` | `cepteuydu` |
| `ANDROID_KEY_PASSWORD` | anahtar şifresi |

Bundan sonra her derlemede `cepteuydu-play-aab` imzalı olarak üretilir. Sürüm numarası (versionCode)
her derlemede otomatik artar.

## 3. Google Play Console

1. https://play.google.com/console adresinden geliştirici hesabı açın (bir kerelik 25 $).
2. **Uygulama oluştur**: ad `CepteUydu`, varsayılan dil Türkçe, tür *Uygulama*, ücretsiz.
3. **Mağaza girişi**: metinler `store/listing.md` dosyasında hazır (TR + EN).
   - Uygulama simgesi: `store/play-icon-512.png`
   - Öne çıkan görsel: `store/feature-graphic-1024x500.png`
   - Ekran görüntüleri: telefonda uygulamadan alın (en az 2 adet; ana ekran, uydu bulucu, AR, pusula önerilir).
4. **Gizlilik politikası URL'si**: GitHub Pages açıldıktan sonra
   `https://cematil.github.io/uydufrekans/gizlilik.html`
5. **Veri güvenliği formu** (uygulama hiçbir veriyi sunucuya göndermez):
   - "Uygulamanız kullanıcı verisi topluyor veya paylaşıyor mu?" → **Hayır**
   - Konum ve kamera yalnızca cihazda işlenir; bu "toplama" sayılmaz.
6. **İçerik derecelendirmesi** anketi: şiddet/kumar vb. yok → "Herkes / 3+".
7. **Hedef kitle**: 13 yaş ve üzeri seçmeniz önerilir (çocuklara yönelik politika yükümlülüklerini önler).
8. **Reklam içeriyor mu?** → Hayır.

### Yeni kişisel hesaplar için kapalı test zorunluluğu

2023 sonrasında açılan **kişisel** geliştirici hesaplarında, uygulamayı herkese açmadan önce
**en az 12 test kullanıcısı ile 14 gün kesintisiz kapalı test** yapılması gerekir:

1. Test → **Kapalı test** → yeni kanal → `cepteuydu-play-aab` içindeki `app-release.aab` dosyasını yükleyin.
2. Test kullanıcılarının Gmail adreslerini ekleyin (en az 12 kişi), katılım bağlantısını gönderin.
3. 14 gün sonra **Üretim** için başvurun.

(Kurumsal/şirket hesaplarında bu koşul yoktur.)

## 4. Güncelleme yayınlamak

- **Yalnızca veri değiştiyse** (kanal/frekans): `uydulara_gore_kanallar.enc` dosyasını güncelleyip
  `python3 scripts/veri_araci.py surum` çalıştırın ve `main` dalına gönderin. Kullanıcılar Play Store
  güncellemesine gerek kalmadan yeni veriyi bir sonraki açılışta alır.
- **Uygulama değiştiyse**: `main`'e gönderin, Actions'ın ürettiği yeni AAB'yi Play Console'a yükleyin.

## 5. Harita altlığı hakkında

Harita ekranları OpenStreetMap karolarını kullanır. OSM'in [kullanım politikası](https://operations.osmfoundation.org/policies/tiles/)
yoğun trafikli uygulamaların kendi karo sağlayıcısını kullanmasını ister. Kullanıcı sayısı artarsa
MapTiler, Stadia Maps, Thunderforest gibi bir sağlayıcıdan (çoğunun ücretsiz kotası vardır) anahtar alıp
`js/harita-ortak.js` içindeki `TILE_URL` ve `TILE_ATTRIBUTION` değerlerini değiştirmeniz yeterlidir.

## 6. Yerelde geliştirme (isteğe bağlı)

```bash
npm install
npm run build          # vendor/ + css/app.css + www/
python3 -m http.server 8000   # tarayıcıda http://localhost:8000
npx cap sync android && npx cap open android   # Android Studio ile çalıştırmak için
```

CSS sınıfı eklediyseniz `npm run css` ile `css/app.css`'i yeniden üretin.
Yeni metin eklediyseniz `js/dil.js`'e iki dilde ekleyip `node scripts/dil-kontrol.mjs` çalıştırın.
