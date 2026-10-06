/*
 * CepteUydu - harita yardımcıları (Leaflet)
 * Harita altlığı OpenStreetMap'tir. Yoğun kullanımda (ör. Play Store'da çok kullanıcı)
 * OSM kullanım politikası gereği ücretli/anahtarlı bir sağlayıcıya geçmek için
 * yalnızca TILE_URL ve TILE_ATTRIBUTION değerlerini değiştirmek yeterlidir.
 */
(function (root) {
    'use strict';

    const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    const EARTH_R = 6371008.8;
    const DEG = Math.PI / 180;

    function createMap(el, center, zoom) {
        const map = L.map(el, { zoomControl: false, attributionControl: false }).setView(center, zoom);
        L.control.zoom({ position: 'topright' }).addTo(map);
        // Alt bilgi kartı haritanın altını kapladığı için atıf sağ üstte
        L.control.attribution({ position: 'topright', prefix: false }).addTo(map);
        L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
        return map;
    }

    /** Başlangıç noktasından verilen yön (°) ve mesafede (m) varılan nokta */
    function destination(lat, lon, bearingDeg, distM) {
        const d = distM / EARTH_R, th = bearingDeg * DEG, p1 = lat * DEG, l1 = lon * DEG;
        const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
        const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
        return [p2 / DEG, ((l2 / DEG + 540) % 360) - 180];
    }

    /** Küresel çokgen alanı (m²) — noktalar [[lat, lon], ...] */
    function polygonArea(points) {
        if (points.length < 3) return 0;
        let sum = 0;
        for (let i = 0; i < points.length; i++) {
            const [la1, lo1] = points[i];
            const [la2, lo2] = points[(i + 1) % points.length];
            sum += (lo2 - lo1) * DEG * (2 + Math.sin(la1 * DEG) + Math.sin(la2 * DEG));
        }
        return Math.abs(sum * EARTH_R * EARTH_R / 2);
    }

    function haversine(a, b) {
        const dp = (b[0] - a[0]) * DEG, dl = (b[1] - a[1]) * DEG;
        const h = Math.sin(dp / 2) ** 2 + Math.cos(a[0] * DEG) * Math.cos(b[0] * DEG) * Math.sin(dl / 2) ** 2;
        return 2 * EARTH_R * Math.asin(Math.sqrt(h));
    }

    function dotIcon(color) {
        return L.divIcon({
            className: '',
            html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:4px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`,
            iconSize: [22, 22], iconAnchor: [11, 11],
        });
    }

    function labelIcon(text) {
        const span = document.createElement('span');
        span.textContent = text;
        return L.divIcon({
            className: '',
            html: `<div style="transform:translate(-50%,-140%);white-space:nowrap;background:#282660;color:#fff;font:600 12px/1 system-ui,sans-serif;padding:6px 9px;border-radius:999px;box-shadow:0 1px 6px rgba(0,0,0,.3)">🛰️ ${span.innerHTML}</div>`,
            iconSize: [0, 0],
        });
    }

    root.CepteHarita = { createMap, destination, polygonArea, haversine, dotIcon, labelIcon };
})(window);
