/*
 * CepteUydu - ortak veri katmanı
 * uydulara_gore_kanallar.enc dosyasını (Base64 kodlu UTF-8 JSON) yükler ve çözer.
 * Çevrimdışı çalışma sw.js tarafından sağlanır: dosya ilk açılışta önbelleğe alınır,
 * internet yokken önbellekteki kopya kullanılır.
 */
(function (root) {
    'use strict';

    const DATA_URL = 'uydulara_gore_kanallar.enc';
    const ARCHIVE_GROUP = 'Pasif / Eski Yayınlar';

    // Türkçe karakterleri ve büyük/küçük harfi yok sayan arama anahtarı
    // ("Turkiye" ile "Türkiye", "sifresiz" ile "Şifresiz" eşleşir).
    function normalize(str) {
        return String(str || '')
            .toLocaleLowerCase('tr')
            .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
            .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function decodeBase64Utf8(str) {
        const binary = atob(str.trim());
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
    }

    async function load() {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error('Sunucu yanıtı: ' + response.status + ' ' + response.statusText);
        return JSON.parse(decodeBase64Utf8(await response.text()));
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator && location.protocol !== 'file:') {
            navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service worker kaydedilemedi:', e));
        }
    }

    root.CepteVeri = { DATA_URL, ARCHIVE_GROUP, normalize, decodeBase64Utf8, load, registerServiceWorker };
})(window);
