/*
 * CepteUydu - Uydu açı hesaplamaları (bağımlılıksız, tarayıcı ve Node uyumlu)
 *
 * Yerdurağan (GEO) bir uydu için gözlemcinin konumuna göre:
 *  - azimut   : gerçek kuzeyden saat yönünde yatay açı (°)
 *  - elevasyon: ufuktan yukarı dikey açı (°)
 *  - skew     : LNB polarizasyon eğimi (°). Pozitif = çanağın arkasından uyduya
 *               bakarken saat yönünde, negatif = saat yönünün tersine.
 * Hesap, WGS84 elipsoidi üzerinde ECEF -> ENU vektör dönüşümüyle yapılır;
 * bu yüzden kuzey/güney yarım küre ve doğu/batı ayrımı için özel durum gerekmez.
 */
(function (root) {
    'use strict';

    const DEG = Math.PI / 180;
    const WGS84_A = 6378137.0;
    const WGS84_F = 1 / 298.257223563;
    const WGS84_E2 = WGS84_F * (2 - WGS84_F);
    const GEO_RADIUS = 42164170.0; // yerdurağan yörünge yarıçapı (m)

    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = a => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

    function observerEcef(latDeg, lonDeg, heightM) {
        const lat = latDeg * DEG, lon = lonDeg * DEG, h = heightM || 0;
        const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * Math.sin(lat) ** 2);
        return [
            (n + h) * Math.cos(lat) * Math.cos(lon),
            (n + h) * Math.cos(lat) * Math.sin(lon),
            (n * (1 - WGS84_E2) + h) * Math.sin(lat),
        ];
    }

    function enuBasis(latDeg, lonDeg) {
        const lat = latDeg * DEG, lon = lonDeg * DEG;
        return {
            e: [-Math.sin(lon), Math.cos(lon), 0],
            n: [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)],
            u: [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)],
        };
    }

    function normalizeAngle360(a) {
        return ((a % 360) + 360) % 360;
    }

    /**
     * @param {number} lat     gözlemci enlemi (°, kuzey +)
     * @param {number} lon     gözlemci boylamı (°, doğu +)
     * @param {number} satLon  uydunun yörünge boylamı (°, doğu +; örn. Türksat 42.0, Thor -0.8)
     * @param {number} [height] gözlemci yüksekliği (m)
     */
    function lookAngles(lat, lon, satLon, height) {
        const obs = observerEcef(lat, lon, height);
        const sl = satLon * DEG;
        const sat = [GEO_RADIUS * Math.cos(sl), GEO_RADIUS * Math.sin(sl), 0];
        const d = sub(sat, obs);
        const { e, n, u } = enuBasis(lat, lon);
        const de = dot(d, e), dn = dot(d, n), du = dot(d, u);

        const azimuth = normalizeAngle360(Math.atan2(de, dn) / DEG);
        const elevation = Math.atan2(du, Math.hypot(de, dn)) / DEG;

        // LNB skew: uydunun yatay polarizasyonu ekvator düzlemine paraleldir.
        // Bu vektörün, görüş doğrultusuna dik yerel yatay eksenle yaptığı açı.
        const dir = norm(d);
        const hSat = [-Math.sin(sl), Math.cos(sl), 0];
        const hProj = norm(sub(hSat, scale(dir, dot(hSat, dir))));
        const refRaw = cross(dir, u);
        // Uydu tam tepedeyken (ekvator, aynı boylam) yatay referans tanımsızdır.
        if (Math.hypot(refRaw[0], refRaw[1], refRaw[2]) < 1e-9) {
            return { azimuth: 180, elevation, skew: 0, distanceKm: Math.hypot(d[0], d[1], d[2]) / 1000, visible: true };
        }
        const ref = norm(refRaw);
        let skew = Math.atan2(dot(cross(ref, hProj), dir), dot(ref, hProj)) / DEG;
        if (skew > 90) skew -= 180;      // polarizasyon ekseni yönsüzdür
        if (skew < -90) skew += 180;

        return {
            azimuth,
            elevation,
            skew,
            distanceKm: Math.hypot(d[0], d[1], d[2]) / 1000,
            visible: elevation > 0,
        };
    }

    /** "Türksat 4A (42.0°E)" -> 42.0, "Thor 6 (0.8°W)" -> -0.8, eşleşmezse null */
    function parseOrbitalPosition(name) {
        const m = String(name).match(/\(([\d.,]+)\s*°\s*([EWDB])\)\s*$/i);
        if (!m) return null;
        const value = parseFloat(m[1].replace(',', '.'));
        const dir = m[2].toUpperCase();
        return dir === 'W' || dir === 'B' ? -value : value;
    }

    function formatOrbitalPosition(lon) {
        return Math.abs(lon).toFixed(1) + '°' + (lon < 0 ? 'W' : 'E');
    }

    /** 16 yönlü pusula adı (Türkçe kısaltma) */
    function compassPoint(az) {
        const names = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BKB', 'KB', 'KKB'];
        return names[Math.round(normalizeAngle360(az) / 22.5) % 16];
    }

    /** İki açı arasındaki işaretli en kısa fark (b - a), -180..180 */
    function angleDiff(a, b) {
        return ((b - a + 540) % 360) - 180;
    }

    const api = { lookAngles, parseOrbitalPosition, formatOrbitalPosition, compassPoint, angleDiff, normalizeAngle360 };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.UyduHesap = api;
})(typeof window !== 'undefined' ? window : globalThis);
