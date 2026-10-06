/*
 * CepteUydu - veri katmanı
 *
 * Veri kaynağı GitHub deposudur. Yükleme sırası:
 *   1. GitHub'daki veri-surum.json kontrol edilir (küçük dosya).
 *   2. Sürüm cihazdakinden yeniyse uydulara_gore_kanallar.enc GitHub'dan indirilir
 *      ve cihazdaki önbelleğe (Cache API) yazılır.
 *   3. İnternet yoksa önbellekteki son kopya, o da yoksa uygulamayla gelen kopya kullanılır.
 * Böylece uygulama çevrimdışı çalışır, veri ise GitHub'a yapılan her güncellemeyle tazelenir.
 */
(function (root) {
    'use strict';

    const DATA_FILE = 'uydulara_gore_kanallar.enc';
    const META_FILE = 'veri-surum.json';
    const ARCHIVE_GROUP = 'Pasif / Eski Yayınlar';
    // Verinin okunacağı GitHub deposu ve dalı
    const GITHUB_RAW = 'https://raw.githubusercontent.com/cematil/uydufrekans/main/';
    const CACHE_NAME = 'cepteuydu-veri';
    const REMOTE_TIMEOUT_MS = 8000;

    let memo = null; // aynı sayfada tekrar yüklemeyi önler

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

    async function fetchWithTimeout(url, ms, init) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), ms);
        try {
            const res = await fetch(url, { ...init, signal: ctrl.signal });
            if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
            return res;
        } finally {
            clearTimeout(timer);
        }
    }

    async function openCache() {
        try { return 'caches' in root ? await caches.open(CACHE_NAME) : null; } catch (e) { return null; }
    }

    async function readCached(cache) {
        if (!cache) return null;
        try {
            const [m, d] = await Promise.all([cache.match(META_FILE), cache.match(DATA_FILE)]);
            if (!m || !d) return null;
            return { meta: await m.json(), text: await d.text() };
        } catch (e) { return null; }
    }

    function isNewer(candidate, current) {
        if (!candidate || !candidate.sha256) return false;
        if (!current) return true;
        return candidate.sha256 !== current.sha256 && String(candidate.surum) >= String(current.surum);
    }

    /**
     * Veriyi yükler. Dönüş: { data, meta, source } — source: 'github' | 'cache' | 'bundled'
     * @param {{ onStatus?: (key: string) => void, skipRemote?: boolean }} [opts]
     */
    async function loadWithInfo(opts = {}) {
        if (memo) return memo;
        const status = opts.onStatus || (() => {});

        let bundledMeta = null;
        try { bundledMeta = await (await fetch(META_FILE, { cache: 'no-cache' })).json(); } catch (e) { /* yoksa sorun değil */ }

        const cache = await openCache();
        const cached = await readCached(cache);
        let best = cached && isNewer(cached.meta, bundledMeta)
            ? { text: cached.text, meta: cached.meta, source: 'cache' }
            : null;
        const currentMeta = best ? best.meta : bundledMeta;

        if (!opts.skipRemote && navigator.onLine !== false) {
            try {
                status('data.checking');
                const remoteMeta = await (await fetchWithTimeout(GITHUB_RAW + META_FILE, REMOTE_TIMEOUT_MS, { cache: 'no-store' })).json();
                if (isNewer(remoteMeta, currentMeta)) {
                    status('data.downloading');
                    const res = await fetchWithTimeout(GITHUB_RAW + DATA_FILE, 60000, { cache: 'no-store' });
                    const text = await res.text();
                    JSON.parse(decodeBase64Utf8(text)); // bozuk indirmeyi önbelleğe yazma
                    if (cache) {
                        await cache.put(DATA_FILE, new Response(text, { headers: { 'Content-Type': 'text/plain' } }));
                        await cache.put(META_FILE, new Response(JSON.stringify(remoteMeta), { headers: { 'Content-Type': 'application/json' } }));
                    }
                    best = { text, meta: remoteMeta, source: 'github' };
                }
            } catch (e) {
                console.info('GitHub veri kontrolü yapılamadı, yerel veri kullanılıyor:', e.message || e);
            }
        }

        if (!best) {
            status('data.loading');
            const res = await fetch(DATA_FILE);
            if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
            best = { text: await res.text(), meta: bundledMeta, source: 'bundled' };
        }

        memo = { data: JSON.parse(decodeBase64Utf8(best.text)), meta: best.meta, source: best.source };
        return memo;
    }

    async function load(opts) {
        return (await loadWithInfo(opts)).data;
    }

    /** Uydu adlarını yörünge konumuna göre gruplar (doğudan batıya). */
    function positionsFrom(raw) {
        const byLon = new Map();
        for (const name of Object.keys(raw)) {
            const lon = root.UyduHesap ? root.UyduHesap.parseOrbitalPosition(name) : null;
            if (lon === null) continue;
            const title = name.replace(/\s*\([^)]*°[^)]*\)\s*$/, '');
            if (!byLon.has(lon)) byLon.set(lon, []);
            byLon.get(lon).push(title);
        }
        return [...byLon.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([lon, names]) => ({ lon, names, label: root.UyduHesap.formatOrbitalPosition(lon) + ' — ' + names.join(', ') }));
    }

    // Veri yüklenemezse kullanılacak temel liste
    const FALLBACK_POSITIONS = [
        [42.0, 'Türksat 4A, Türksat 5B, Türksat 6A'], [31.0, 'Türksat 5A'], [28.2, 'Astra 2E, Astra 2F, Astra 2G'],
        [19.2, 'Astra 1N, Astra 1P'], [13.0, 'Hot Bird 13F, Hot Bird 13G'], [7.0, 'Eutelsat 7C'],
        [-0.8, 'Thor 5, Thor 6, Thor 7'], [-7.0, 'Nilesat 201, Nilesat 301, Eutelsat 7 West A'],
    ].map(([lon, names]) => ({ lon, names: names.split(', '), label: root.UyduHesap.formatOrbitalPosition(lon) + ' — ' + names }));

    async function loadPositions() {
        try { return positionsFrom(await load()); } catch (e) { return FALLBACK_POSITIONS.slice(); }
    }

    function registerServiceWorker() {
        // Uygulama (Capacitor) içinde dosyalar zaten cihazda; service worker yalnızca web için.
        if (root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform()) return;
        if (!('serviceWorker' in navigator)) return;
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
        navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service worker kaydedilemedi:', e));
    }

    root.CepteVeri = {
        DATA_FILE, ARCHIVE_GROUP, GITHUB_RAW, FALLBACK_POSITIONS,
        normalize, decodeBase64Utf8, load, loadWithInfo, positionsFrom, loadPositions, registerServiceWorker,
    };
})(window);
