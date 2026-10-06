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
    const GLOBAL_POSITIONS_FILE = 'uydu-konumlari.json'; // dünya genelindeki uydu konumları (frekanssız)
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

    /**
     * Uydu bulucu, AR, pusula ve haritada kullanılan konum listesi:
     * kanal verisindeki konumlar + dünya genelindeki konum listesi (uydu-konumlari.json).
     */
    async function loadPositions() {
        const [raw, global] = await Promise.all([load().catch(() => null), loadJsonFile(GLOBAL_POSITIONS_FILE)]);
        const merged = new Map((raw ? positionsFrom(raw) : FALLBACK_POSITIONS).map(p => [p.lon, { ...p, names: p.names.slice() }]));
        for (const u of global.uydular || []) {
            const lon = Math.round(Number(u.konum) * 10) / 10;
            if (!Number.isFinite(lon)) continue;
            const p = merged.get(lon) || { lon, names: [] };
            for (const n of u.adlar || []) {
                const key = normalize(n).replace(/[^a-z0-9]/g, '');
                if (!p.names.some(x => normalize(x).replace(/[^a-z0-9]/g, '') === key)) p.names.push(n);
            }
            merged.set(lon, p);
        }
        return [...merged.values()]
            .sort((a, b) => b.lon - a.lon)
            .map(p => ({ ...p, label: root.UyduHesap.formatOrbitalPosition(p.lon) + ' — ' + p.names.join(', ') }));
    }

    // ---------------- Şebeke / tarama frekansları ----------------
    const NETWORK_FILE = 'sebeke-frekanslari.json';
    const POL_SHORT = { 'Horizontal (Yatay)': 'H', 'Vertical (Dikey)': 'V', 'Left (Sol)': 'L', 'Right (Sağ)': 'R' };

    /** Küçük JSON dosyaları: önce GitHub, sonra cihazdaki kopya, sonra uygulama içi kopya */
    const jsonMemo = {};
    function loadJsonFile(file) {
        if (jsonMemo[file]) return jsonMemo[file];
        jsonMemo[file] = (async () => {
            const cache = await openCache();
            try {
                const res = await fetchWithTimeout(GITHUB_RAW + file, 6000, { cache: 'no-store' });
                const json = await res.json();
                if (cache) await cache.put(file, new Response(JSON.stringify(json), { headers: { 'Content-Type': 'application/json' } }));
                return json;
            } catch (e) { /* çevrimdışı veya dosya henüz main'de yok */ }
            try {
                const cached = cache && await cache.match(file);
                if (cached) return await cached.json();
            } catch (e) { /* yok say */ }
            try { return await (await fetch(file)).json(); } catch (e) { return { uydular: [] }; }
        })();
        return jsonMemo[file];
    }
    const loadNetworkFile = () => loadJsonFile(NETWORK_FILE);

    /**
     * Yörünge konumu başına en çok aktif kanal taşıyan transponderlar.
     * Şebeke araması açıkken bu frekanslardan biriyle tarama yapmak çoğu operatörde tüm listeyi getirir.
     */
    function scanSuggestions(raw, perPosition = 3) {
        const byLon = new Map();
        for (const [name, channels] of Object.entries(raw)) {
            const lon = root.UyduHesap.parseOrbitalPosition(name);
            if (lon === null) continue;
            if (!byLon.has(lon)) byLon.set(lon, new Map());
            const tps = byLon.get(lon);
            for (const c of channels) {
                if (!c.is_active || !c.frequency) continue;
                const f = Math.round(parseFloat(String(c.frequency).replace(',', '.')));
                const pol = POL_SHORT[c.polarization] || c.polarization;
                if (!Number.isFinite(f) || !pol) continue;
                const key = f + pol + c.symbol_rate;
                const tp = tps.get(key) || { f: String(f), pol, sr: c.symbol_rate, fec: c.fec, sat: name.replace(/\s*\([^)]*\)\s*$/, ''), count: 0 };
                tp.count++;
                tps.set(key, tp);
            }
        }
        const out = new Map();
        for (const [lon, tps] of byLon) {
            out.set(lon, [...tps.values()].sort((a, b) => b.count - a.count).slice(0, perPosition));
        }
        return out;
    }

    /** Tüm konumlar için şebeke (resmi) ve önerilen tarama frekansları */
    async function loadNetworks() {
        const [raw, file] = await Promise.all([load().catch(() => ({})), loadNetworkFile()]);
        const positions = Object.keys(raw).length ? positionsFrom(raw) : FALLBACK_POSITIONS.slice();
        const suggested = scanSuggestions(raw);
        const official = new Map((file.uydular || []).map(u => [Number(u.konum), u]));
        const near = (a, b) => a.pol === b.pol && Math.abs(Number(a.f) - Number(b.f)) <= 2;
        return positions.map(p => {
            const off = official.get(p.lon);
            const list = off ? off.frekanslar.slice() : [];
            const sug = (suggested.get(p.lon) || []).filter(s => !list.some(o => near(o, s)));
            return { lon: p.lon, label: p.label, names: p.names, title: p.names.join(', '), official: list, suggested: sug };
        });
    }

    // Görünüm yardımcıları: "12380 V 27500" ve açıklama satırı
    const CepteSebeke = {
        text: tp => [tp.f, tp.pol, tp.sr].filter(Boolean).join(' '),
        note: tp => {
            const t = root.t;
            const fec = tp.fec ? ' · FEC ' + tp.fec : '';
            if (tp.tur === 'sebeke' || tp.tur === 'ana') {
                const label = t(tp.tur === 'sebeke' ? 'net.badgeNetwork' : 'net.badgeMain');
                const note = (root.currentLang() === 'en' ? tp.not_en : tp.not_tr) || '';
                return label + (note ? ' · ' + note : '') + fec;
            }
            return t('net.suggestedNote', { n: tp.count, sat: tp.sat }) + fec;
        },
    };
    root.CepteSebeke = CepteSebeke;

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
        loadNetworkFile, loadJsonFile, scanSuggestions, loadNetworks,
    };
})(window);
