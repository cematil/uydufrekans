/*
 * CepteUydu - yön ve eğim sensörü yardımcısı (pusula ve su terazisi sayfaları için)
 *
 * CepteSensor.start(callback) -> stop()
 * callback({ heading, beta, gamma, absolute })
 *   heading : manyetik kuzeye göre yön (°). Telefon düzken üst kenarın, dik tutulurken
 *             arka kameranın baktığı yön.
 *   beta    : öne/arkaya eğim (°), gamma: sağa/sola eğim (°)
 *   absolute: false ise cihaz gerçek pusula verisi vermiyor demektir.
 */
(function (root) {
    'use strict';

    const DEG = Math.PI / 180;

    function headingFromEuler(alpha, beta, gamma) {
        const a = alpha * DEG, b = beta * DEG, g = gamma * DEG;
        const cA = Math.cos(a), sA = Math.sin(a), cB = Math.cos(b), sB = Math.sin(b), cG = Math.cos(g), sG = Math.sin(g);
        // R'nin 2. sütunu (cihaz y ekseni) ve 3. sütunu (cihaz z ekseni) dünya koordinatlarında
        const y = [-cB * sA, cA * cB, sB];
        const z = [cA * sG + cG * sA * sB, sA * sG - cA * cG * sB, cB * cG];
        const flat = Math.abs(z[2]) > 0.7;
        const v = flat ? y : [-z[0], -z[1]];
        return ((Math.atan2(v[0], v[1]) / DEG) + 360) % 360;
    }

    async function requestPermission() {
        const D = root.DeviceOrientationEvent;
        if (D && typeof D.requestPermission === 'function') {
            try { return (await D.requestPermission()) === 'granted'; } catch (e) { return false; }
        }
        return true;
    }

    function start(callback) {
        const type = ('ondeviceorientationabsolute' in root) ? 'deviceorientationabsolute' : 'deviceorientation';
        let smooth = null;
        const handler = e => {
            if (e.beta === null || e.gamma === null) return;
            let heading = null;
            let absolute = true;
            if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) {
                heading = e.webkitCompassHeading; // iOS
            } else if (e.alpha !== null) {
                heading = headingFromEuler(e.alpha, e.beta, e.gamma);
                absolute = type === 'deviceorientationabsolute' || !!e.absolute;
            }
            if (heading !== null) {
                // dairesel yumuşatma (359° -> 1° geçişinde sıçramasın)
                smooth = smooth === null ? heading : (smooth + (((heading - smooth + 540) % 360) - 180) * 0.25 + 360) % 360;
            }
            callback({ heading: smooth, beta: e.beta, gamma: e.gamma, absolute });
        };
        root.addEventListener(type, handler);
        return () => root.removeEventListener(type, handler);
    }

    root.CepteSensor = { start, requestPermission, headingFromEuler };
})(window);
