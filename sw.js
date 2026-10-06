/*
 * CepteUydu service worker - çevrimdışı çalışma
 *  - Uygulama dosyaları: önbellekten ver, arka planda tazele (güncelleme bir sonraki açılışta görünür)
 *  - Veri dosyası (.enc): önce ağ, ağ yoksa önbellekteki son kopya
 *  - Harita karoları (OpenStreetMap): önbellekten ver, arka planda tazele (son görülen bölge çevrimdışı da açılır)
 * Not: Uygulama içi veri güncellemesi (GitHub) js/veri.js'te ayrıca yönetilir.
 */
const VERSION = 'cepteuydu-v3';
const APP_SHELL = [
    './',
    'index.html',
    'hizala.html',
    'kanallar.html',
    'harita.html',
    'konum.html',
    'pusula.html',
    'terazi.html',
    'alan.html',
    'gizlilik.html',
    'css/app.css',
    'js/dil.js',
    'js/ortak.js',
    'js/veri.js',
    'js/uydu-hesap.js',
    'js/kategoriler.js',
    'js/ar-yon.js',
    'js/sensor.js',
    'js/ikonlar.js',
    'js/harita-ortak.js',
    'vendor/alpine.min.js',
    'vendor/leaflet/leaflet.js',
    'vendor/leaflet/leaflet.css',
    'vendor/fontawesome/css/all.min.css',
    'vendor/fontawesome/webfonts/fa-solid-900.woff2',
    'vendor/fontawesome/webfonts/fa-regular-400.woff2',
    'icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'manifest.webmanifest',
    'veri-surum.json',
];
const DATA_FILE = 'uydulara_gore_kanallar.enc';

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(VERSION);
        await cache.addAll(APP_SHELL);
        // Veri dosyası büyük; kurulumu engellemesin
        cache.add(DATA_FILE).catch(() => {});
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key !== VERSION && key !== TILE_CACHE && key !== 'cepteuydu-veri') await caches.delete(key);
        }
        await self.clients.claim();
    })());
});

async function networkFirst(request) {
    const cache = await caches.open(VERSION);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (e) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        throw e;
    }
}

const TILE_CACHE = 'cepteuydu-karolar';

async function staleWhileRevalidate(request, cacheName = VERSION) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const network = fetch(request).then(response => {
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
        return response;
    }).catch(() => cached || Response.error());
    return cached || network;
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
        if (url.pathname.endsWith(DATA_FILE) || url.pathname.endsWith('veri-surum.json') || request.mode === 'navigate') {
            event.respondWith(networkFirst(request));
        } else {
            event.respondWith(staleWhileRevalidate(request));
        }
    } else if (url.hostname === 'tile.openstreetmap.org') {
        event.respondWith(staleWhileRevalidate(request, TILE_CACHE));
    }
});
