/*
 * CepteUydu - tüm sayfalarda ortak kod
 *  - CepteDurum : cihazda saklanan ayarlar (konum, seçili uydu, dil, kalibrasyon)
 *  - t()        : iki dilli (TR/EN) metinler, js/dil.js sözlüğünü kullanır
 *  - <cu-header>: görseldeki lacivert üst bar + yan menü + dil düğmesi
 *  - CepteKonum : GPS konumu, şehir listesi, manyetik sapma tahmini
 * Bu dosya <head> içinde, Alpine'den önce ve defer'siz yüklenmelidir.
 */
(function (root) {
    'use strict';

    // ---------------- Kalıcı durum ----------------
    const STORE_KEY = 'cepteuydu.durum';
    const DEFAULTS = {
        lang: null, onboarded: false,
        lat: null, lon: null, loc: null,            // loc: { type: 'gps'|'city'|'manual'|'map', acc?, name? }
        satLon: 42.0, declination: null,
        beepOn: true, trim: 0, fov: 63,
        level: { beta: 0, gamma: 0 },
    };

    function readStore() {
        try {
            const v = JSON.parse(localStorage.getItem(STORE_KEY));
            if (v) return v;
            // önceki sürümün ayarlarını taşı
            const old = JSON.parse(localStorage.getItem('cepteuydu.hizala'));
            if (old) return { lat: old.lat, lon: old.lon, satLon: old.satLon, declination: old.declination, beepOn: old.beepOn, trim: old.trim, fov: old.fov };
        } catch (e) { /* özel sekme vb. */ }
        return {};
    }

    let state = { ...DEFAULTS, ...readStore() };

    const CepteDurum = {
        get() { return { ...state }; },
        set(patch) {
            state = { ...state, ...patch };
            try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* yok say */ }
            return state;
        },
        hasLocation() {
            return Number.isFinite(state.lat) && Number.isFinite(state.lon) && Math.abs(state.lat) <= 90 && Math.abs(state.lon) <= 180;
        },
    };

    // ---------------- Dil ----------------
    function detectLang() {
        if (state.lang === 'tr' || state.lang === 'en') return state.lang;
        const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'tr';
        return /^tr/i.test(nav) ? 'tr' : 'en';
    }
    const initialLang = detectLang();
    document.documentElement.lang = initialLang;

    function currentLang() {
        const s = root.Alpine && root.Alpine.store && root.Alpine.store('app');
        return (s && s.lang) || initialLang;
    }

    /** Çeviri: t("nav.home"), t("ch.records", { n: 5 }) -> "{n}" yer tutucuları doldurulur */
    function t(key, vars) {
        const dict = root.CEPTE_DIL || {};
        const lang = currentLang();
        let s = (dict[lang] && dict[lang][key]) ?? (dict.tr && dict.tr[key]);
        if (s === undefined) {
            console.warn('Çeviri yok:', key);
            s = key;
        }
        if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
        return s;
    }

    function locale() { return currentLang() === 'tr' ? 'tr-TR' : 'en-US'; }

    /** Sayı biçimi: Türkçede virgül, İngilizcede nokta */
    function fmt(v, digits = 1) {
        if (!Number.isFinite(v)) return '—';
        return v.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    function fmtInt(v) { return Number(v || 0).toLocaleString(locale()); }
    function fmtSigned(v, digits = 1) { return (v > 0 ? '+' : '') + fmt(v, digits); }

    const POINTS = {
        tr: ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BKB', 'KB', 'KKB'],
        en: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
    };
    function compassName(az) {
        const list = POINTS[currentLang()] || POINTS.tr;
        return list[Math.round((((az % 360) + 360) % 360) / 22.5) % 16];
    }

    document.addEventListener('alpine:init', () => {
        root.Alpine.store('app', {
            lang: initialLang,
            setLang(lang) {
                this.lang = lang;
                document.documentElement.lang = lang;
                CepteDurum.set({ lang });
            },
            toggleLang() { this.setLang(this.lang === 'tr' ? 'en' : 'tr'); },
        });
    });

    // ---------------- Konum ----------------
    const CITIES = [
        ['İstanbul', 41.0082, 28.9784], ['Ankara', 39.9334, 32.8597], ['İzmir', 38.4237, 27.1428],
        ['Bursa', 40.1885, 29.0610], ['Antalya', 36.8969, 30.7133], ['Adana', 37.0000, 35.3213],
        ['Konya', 37.8746, 32.4932], ['Gaziantep', 37.0662, 37.3833], ['Kayseri', 38.7312, 35.4787],
        ['Eskişehir', 39.7767, 30.5206], ['Samsun', 41.2928, 36.3313], ['Trabzon', 41.0027, 39.7168],
        ['Erzurum', 39.9043, 41.2679], ['Diyarbakır', 37.9144, 40.2306], ['Van', 38.5012, 43.3729],
        ['Edirne', 41.6771, 26.5557], ['Lefkoşa / Nicosia', 35.1856, 33.3823], ['Bakü / Baku', 40.4093, 49.8671],
        ['Berlin', 52.5200, 13.4050], ['Amsterdam', 52.3676, 4.9041], ['London', 51.5072, -0.1276],
        ['Paris', 48.8566, 2.3522], ['Wien', 48.2082, 16.3738], ['Bruxelles', 50.8503, 4.3517],
    ].map(([name, lat, lon]) => ({ name, lat, lon }));

    // Kaba manyetik sapma tahmini (yalnızca varsayılan değer; kullanıcı düzeltebilir)
    function guessDeclination(lat, lon) {
        if (lat > 34 && lat < 43 && lon > 25 && lon < 45) return 6;   // Türkiye
        if (lat > 35 && lat < 72 && lon > -10 && lon < 25) return 3;   // Avrupa
        return 0;
    }

    function locate() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('unsupported'));
            navigator.geolocation.getCurrentPosition(pos => resolve({
                lat: Math.round(pos.coords.latitude * 1e5) / 1e5,
                lon: Math.round(pos.coords.longitude * 1e5) / 1e5,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
            }), err => reject(new Error(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable')),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
        });
    }

    /** Konumu kaydeder ve uygun manyetik sapmayı varsayılan yapar */
    function saveLocation(lat, lon, loc) {
        CepteDurum.set({ lat, lon, loc, declination: guessDeclination(lat, lon) });
    }

    function locationLabel(s) {
        const loc = s.loc;
        if (!loc) return '';
        if (loc.type === 'gps') return t('loc.gpsNote', { acc: fmtInt(Math.round(loc.acc || 0)) });
        if (loc.type === 'city') return loc.name;
        if (loc.type === 'map') return t('loc.mapNote');
        return t('loc.manualNote');
    }

    function locateErrorText(e) {
        const k = { denied: 'loc.errDenied', unsupported: 'loc.errUnsupported', timeout: 'loc.errTimeout' }[e && e.message];
        return t(k || 'loc.errUnavailable');
    }

    const CepteKonum = { CITIES, guessDeclination, locate, saveLocation, locationLabel, locateErrorText };

    // ---------------- Üst bar bileşeni ----------------
    const MENU = [
        ['index.html', 'fa-house', 'nav.home'],
        ['hizala.html', 'fa-satellite-dish', 'nav.finder'],
        ['harita.html', 'fa-map-location-dot', 'nav.map'],
        ['konum.html', 'fa-location-dot', 'nav.location'],
        ['pusula.html', 'fa-compass', 'nav.compass'],
        ['terazi.html', 'fa-ruler-horizontal', 'nav.level'],
        ['kanallar.html', 'fa-list-ul', 'nav.channels'],
        ['alan.html', 'fa-draw-polygon', 'nav.area'],
        ['gizlilik.html', 'fa-shield-halved', 'nav.privacy'],
    ];

    class CuHeader extends HTMLElement {
        connectedCallback() {
            if (this._done) return;
            this._done = true;
            const titleKey = this.getAttribute('title-key') || 'app.name';
            const back = this.hasAttribute('back');
            const menuItems = MENU.map(([href, icon, key]) => `
                <a href="${href}" class="flex items-center gap-4 px-5 py-3.5 hover:bg-lav-50 ${location.pathname.endsWith('/' + href) ? 'text-lav-600 font-semibold' : 'text-ink-700'}">
                    <i class="fa-solid ${icon} w-5 text-center text-lav-500"></i><span x-text="t('${key}')"></span>
                </a>`).join('');
            this.innerHTML = `
            <header class="app-header" x-data="{ menu: false }" x-effect="document.title = t('${titleKey}')${titleKey === 'app.name' ? '' : " + ' · CepteUydu'"}">
                <div class="app-header-inner">
                    ${back
                        ? `<a href="index.html" class="hdr-btn" :aria-label="t('nav.back')" @click.prevent="history.length > 1 && document.referrer.startsWith(location.origin) ? history.back() : (location.href = 'index.html')"><i class="fa-solid fa-arrow-left"></i></a>`
                        : `<button type="button" class="hdr-btn" :aria-label="t('nav.menu')" @click="menu = true"><i class="fa-solid fa-bars"></i></button>`}
                    <h1 class="flex-1 text-center text-lg sm:text-xl font-semibold truncate px-2" x-text="t('${titleKey}')"></h1>
                    <button type="button" class="hdr-btn relative" :aria-label="t('nav.language')" @click="$store.app.toggleLang()">
                        <i class="fa-solid fa-globe"></i>
                        <span class="absolute bottom-1 right-0.5 text-[9px] font-bold bg-lav-500 rounded px-0.5 leading-tight" x-text="$store.app.lang.toUpperCase()"></span>
                    </button>
                </div>
                <div x-show="menu" x-cloak x-transition.opacity class="fixed inset-0 z-50 bg-black/50" @click="menu = false"></div>
                <nav x-show="menu" x-cloak x-transition:enter="transition transform duration-200" x-transition:enter-start="-translate-x-full" x-transition:leave="transition transform duration-150" x-transition:leave-end="-translate-x-full"
                     class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white text-ink-900 shadow-2xl overflow-y-auto" @keydown.escape.window="menu = false">
                    <div class="bg-navy-800 text-white px-5 pb-6" style="padding-top: max(1.5rem, env(safe-area-inset-top))">
                        <img src="icon.svg" alt="" class="w-14 h-14 rounded-2xl mb-3">
                        <div class="text-lg font-bold">CepteUydu</div>
                        <div class="text-xs text-white/70" x-text="t('app.tagline')"></div>
                    </div>
                    <div class="py-2">${menuItems}</div>
                    <div class="border-t border-slate-100 px-5 py-4">
                        <div class="text-xs text-ink-500 mb-2" x-text="t('nav.language')"></div>
                        <div class="flex gap-2">
                            <button type="button" class="chip" :class="$store.app.lang === 'tr' ? 'chip-on' : 'chip-off'" @click="$store.app.setLang('tr')">Türkçe</button>
                            <button type="button" class="chip" :class="$store.app.lang === 'en' ? 'chip-on' : 'chip-off'" @click="$store.app.setLang('en')">English</button>
                        </div>
                    </div>
                </nav>
            </header>`;
        }
    }
    customElements.define('cu-header', CuHeader);

    Object.assign(root, { CepteDurum, CepteKonum, t, fmt, fmtInt, fmtSigned, compassName, currentLang });
})(window);
