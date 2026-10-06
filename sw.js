/*
 * CepteUydu service worker - çevrimdışı çalışma
 *  - Uygulama dosyaları: önce önbellek
 *  - Veri dosyası (.enc): önce ağ, ağ yoksa önbellekteki son kopya
 *  - CDN kütüphaneleri: önbellekten ver, arka planda tazele
 */
const VERSION = 'cepteuydu-v2';
const APP_SHELL = [
    './',
    'index.html',
    'hizala.html',
    'js/veri.js',
    'js/uydu-hesap.js',
    'js/kategoriler.js',
    'js/ar-yon.js',
    'icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'manifest.webmanifest',
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
            if (key !== VERSION) await caches.delete(key);
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

async function cacheFirst(request) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(VERSION);
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
        if (url.pathname.endsWith(DATA_FILE) || request.mode === 'navigate') {
            event.respondWith(networkFirst(request));
        } else {
            event.respondWith(cacheFirst(request));
        }
    } else if (/cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(url.hostname)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});
