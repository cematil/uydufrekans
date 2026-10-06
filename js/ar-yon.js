/*
 * CepteUydu - AR uydu bulucu motoru (metinler js/dil.js'teki 'ar.*' anahtarlarından)
 *
 * Kamera görüntüsünün üzerine, telefonun yön sensörleri (pusula + ivmeölçer + jiroskop)
 * ile hedef uydunun gökyüzündeki konumunu çizer ve hizalamaya göre bip sesi verir.
 *
 * Koordinatlar:
 *  - Dünya: x = Doğu, y = Kuzey, z = Yukarı (manyetik kuzeye göre; sensörlerin verdiği)
 *  - Cihaz: x = ekranın sağı, y = ekranın üstü, z = ekrandan kullanıcıya doğru
 *    Arka kamera cihazın -z yönüne bakar.
 *  - R: cihaz -> dünya dönüşüm matrisi (W3C DeviceOrientation, Z-X'-Y'' açıları)
 */
(function (root) {
    'use strict';

    const DEG = Math.PI / 180;
    const LOCK_DEG = 2;        // bu sapmanın altı "hizalandı"
    const BEEP_RANGE_DEG = 30; // bu sapmanın üstünde bip yok
    const SMOOTHING = 0.2;     // 0..1, küçük = daha yumuşak

    let opts = null;
    let stream = null;
    let wakeLock = null;
    let rafId = 0;
    let hudTimer = 0;
    let beepTimer = 0;
    let sensorTimer = 0;
    let listenerType = null;
    let R = null;              // yumuşatılmış dönüşüm matrisi (satır dizileri)
    let iosOffset = null;      // iOS: göreli alpha -> pusula yönü farkı
    let relativeOnly = false;  // yalnızca göreli yön (pusulasız) mı?
    let scene = null;
    let state = { heading: null, pitch: null, error: null };
    let audio = null;
    let tone = null;
    let wasLocked = false;

    // ---------------- matematik ----------------

    function rotationMatrix(alpha, beta, gamma) {
        const a = alpha * DEG, b = beta * DEG, g = gamma * DEG;
        const cA = Math.cos(a), sA = Math.sin(a);
        const cB = Math.cos(b), sB = Math.sin(b);
        const cG = Math.cos(g), sG = Math.sin(g);
        return [
            [cA * cG - sA * sB * sG, -cB * sA, cA * sG + cG * sA * sB],
            [cG * sA + cA * sB * sG, cA * cB, sA * sG - cA * cG * sB],
            [-cB * sG, sB, cB * cG],
        ];
    }

    // Matrisleri eleman bazında yumuşatıp yeniden ortonormal yapar (gimbal kilidinden etkilenmez)
    function blend(prev, next, k) {
        if (!prev) return next;
        const m = prev.map((row, i) => row.map((v, j) => v + (next[i][j] - v) * k));
        const col = j => [m[0][j], m[1][j], m[2][j]];
        const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
        const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        const c0 = nrm(col(0));
        let c1 = col(1);
        const d = dot(c0, c1);
        c1 = nrm([c1[0] - d * c0[0], c1[1] - d * c0[1], c1[2] - d * c0[2]]);
        const c2 = [c0[1] * c1[2] - c0[2] * c1[1], c0[2] * c1[0] - c0[0] * c1[2], c0[0] * c1[1] - c0[1] * c1[0]];
        return [0, 1, 2].map(i => [c0[i], c1[i], c2[i]]);
    }

    // Gerçek kuzeye göre azimut/elevasyonu, sensörlerin manyetik dünya çerçevesinde vektöre çevirir
    function worldVector(azTrue, el, correction) {
        const az = (azTrue - correction) * DEG, e = el * DEG;
        return [Math.sin(az) * Math.cos(e), Math.cos(az) * Math.cos(e), Math.sin(e)];
    }

    // Dünya vektörü -> cihaz koordinatları (R^T * t)
    function toDevice(t) {
        return [
            R[0][0] * t[0] + R[1][0] * t[1] + R[2][0] * t[2],
            R[0][1] * t[0] + R[1][1] * t[1] + R[2][1] * t[2],
            R[0][2] * t[0] + R[1][2] * t[1] + R[2][2] * t[2],
        ];
    }

    function screenAngle() {
        const a = (screen.orientation && typeof screen.orientation.angle === 'number')
            ? screen.orientation.angle : (window.orientation || 0);
        return a * DEG;
    }

    // Cihaz vektörü -> ekran pikseli. Kameranın arkasındaysa behind=true döner.
    function project(v, w, h, fovDeg) {
        const th = screenAngle();
        const sx0 = v[0] * Math.cos(th) - v[1] * Math.sin(th);
        const sy0 = v[0] * Math.sin(th) + v[1] * Math.cos(th);
        const depth = -v[2];
        const f = (Math.max(w, h) / 2) / Math.tan((fovDeg / 2) * DEG);
        if (depth < 0.05) return { behind: true, dx: sx0, dy: sy0 };
        return { behind: false, x: w / 2 + f * sx0 / depth, y: h / 2 - f * sy0 / depth, dx: sx0, dy: sy0 };
    }

    // ---------------- sensörler ----------------

    function onOrientation(e) {
        if (e.alpha === null || e.beta === null || e.gamma === null) return;
        let alpha = e.alpha;
        if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) {
            // iOS: alpha göreli; pusula yönüyle aradaki farkı yumuşatarak uygula
            const target = 360 - e.webkitCompassHeading - alpha;
            if (iosOffset === null) iosOffset = target;
            else iosOffset += (((target - iosOffset + 540) % 360) - 180) * 0.05;
            alpha += iosOffset;
            relativeOnly = false;
        } else if (listenerType === 'deviceorientation' && !e.absolute) {
            relativeOnly = true;
        }
        R = blend(R, rotationMatrix(alpha, e.beta, e.gamma), SMOOTHING);
        clearTimeout(sensorTimer);
    }

    async function requestSensorPermission() {
        const D = root.DeviceOrientationEvent;
        if (D && typeof D.requestPermission === 'function') {
            try { return (await D.requestPermission()) === 'granted'; } catch (e) { return false; }
        }
        return true;
    }

    function listenSensors() {
        listenerType = ('ondeviceorientationabsolute' in root) ? 'deviceorientationabsolute' : 'deviceorientation';
        root.addEventListener(listenerType, onOrientation);
        sensorTimer = setTimeout(() => {
            if (!R) opts && opts.onHud({ message: t('ar.noSensor') });
        }, 2500);
    }

    // ---------------- kamera ----------------

    async function startCamera(video) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return t('ar.camUnsupported');
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            });
            video.srcObject = stream;
            await video.play().catch(() => {});
            return '';
        } catch (e) {
            return e && e.name === 'NotAllowedError'
                ? t('ar.camDenied')
                : t('ar.camFailed');
        }
    }

    // ---------------- ses ----------------

    function ensureAudio() {
        if (audio) { audio.resume && audio.resume(); return; }
        const Ctx = root.AudioContext || root.webkitAudioContext;
        if (Ctx) audio = new Ctx();
    }

    function beep(freq, ms) {
        if (!audio) return;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = audio.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + ms / 1000 + 0.02);
    }

    function setTone(on) {
        if (on && !tone && audio) {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.frequency.value = 1320;
            gain.gain.value = 0.25;
            osc.connect(gain).connect(audio.destination);
            osc.start();
            tone = { osc, gain };
        } else if (!on && tone) {
            tone.osc.stop();
            tone = null;
        }
    }

    // Park sensörü mantığı: hedefe yaklaştıkça bip sıklaşır, kilitlenince sürekli ses
    function beepLoop() {
        if (!opts) return;
        const { beepOn } = opts.getSettings();
        const e = state.error;
        let next = 250;
        if (!beepOn || e === null || e > BEEP_RANGE_DEG) {
            setTone(false);
        } else if (e <= LOCK_DEG) {
            setTone(true);
        } else {
            setTone(false);
            beep(660 + (1 - e / BEEP_RANGE_DEG) * 500, 60);
            next = 70 + (e - LOCK_DEG) / (BEEP_RANGE_DEG - LOCK_DEG) * 900;
        }
        beepTimer = setTimeout(beepLoop, next);
    }

    // ---------------- çizim ----------------

    function resizeCanvas(canvas) {
        const dpr = root.devicePixelRatio || 1;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, w, h };
    }

    function drawPolyline(ctx, pts, w, h, fov, corr) {
        let open = false;
        ctx.beginPath();
        for (const p of pts) {
            const s = project(toDevice(worldVector(p.az, p.el, corr)), w, h, fov);
            if (s.behind || Math.abs(s.x) > w * 4 || Math.abs(s.y) > h * 4) { open = false; continue; }
            if (open) ctx.lineTo(s.x, s.y); else { ctx.moveTo(s.x, s.y); open = true; }
        }
        ctx.stroke();
    }

    function drawEdgeArrow(ctx, w, h, dx, dy) {
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = -dy / len;
        const margin = 48;
        const k = Math.min((w / 2 - margin) / Math.abs(ux || 1e-6), (h / 2 - margin) / Math.abs(uy || 1e-6));
        const x = w / 2 + ux * k, y = h / 2 + uy * k;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(uy, ux));
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(22, 0); ctx.lineTo(-12, -16); ctx.lineTo(-4, 0); ctx.lineTo(-12, 16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function frame() {
        rafId = requestAnimationFrame(frame);
        if (!opts) return;
        const { ctx, w, h } = resizeCanvas(opts.canvas);
        ctx.clearRect(0, 0, w, h);
        if (!scene) scene = opts.getScene();
        if (!R || !scene) return;

        const { fov } = opts.getSettings();
        const corr = scene.headingCorrection;

        // telefonun baktığı yön (kamera ekseni)
        const cam = [-R[0][2], -R[1][2], -R[2][2]];
        const headingMag = (Math.atan2(cam[0], cam[1]) / DEG + 360) % 360;
        state.heading = (headingMag + corr + 360) % 360;
        state.pitch = Math.asin(Math.max(-1, Math.min(1, cam[2]))) / DEG;
        const tv = worldVector(scene.target.az, scene.target.el, corr);
        state.error = Math.acos(Math.max(-1, Math.min(1, cam[0] * tv[0] + cam[1] * tv[1] + cam[2] * tv[2]))) / DEG;

        // ufuk çizgisi
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.setLineDash([]);
        const horizon = [];
        for (let az = 0; az <= 360; az += 3) horizon.push({ az, el: 0 });
        drawPolyline(ctx, horizon, w, h, fov, corr);

        // Clarke kuşağı
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(6,182,212,0.6)';
        ctx.setLineDash([8, 8]);
        drawPolyline(ctx, scene.belt, w, h, fov, corr);
        ctx.setLineDash([]);

        // diğer uydular
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        const ts = project(toDevice(worldVector(scene.target.az, scene.target.el, corr)), w, h, fov);
        const labelled = ts.behind ? [] : [{ x: ts.x, y: ts.y - 30 }]; // hedefin etiket alanını boş bırak
        for (const o of scene.others) {
            const s = project(toDevice(worldVector(o.az, o.el, corr)), w, h, fov);
            if (s.behind || s.x < -20 || s.x > w + 20 || s.y < -20 || s.y > h + 20) continue;
            ctx.fillStyle = 'rgba(148,163,184,0.9)';
            ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill();
            // Üst üste binen etiketleri atla (yakın konumdaki uydular)
            if (labelled.some(l => Math.abs(l.x - s.x) < 44 && Math.abs(l.y - (s.y - 8)) < 16)) continue;
            labelled.push({ x: s.x, y: s.y - 8 });
            ctx.fillText(o.label, s.x, s.y - 8);
        }

        // nişangah
        const locked = state.error <= LOCK_DEG;
        ctx.strokeStyle = locked ? '#10b981' : 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 26, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w / 2 - 40, h / 2); ctx.lineTo(w / 2 - 14, h / 2);
        ctx.moveTo(w / 2 + 14, h / 2); ctx.lineTo(w / 2 + 40, h / 2);
        ctx.moveTo(w / 2, h / 2 - 40); ctx.lineTo(w / 2, h / 2 - 14);
        ctx.moveTo(w / 2, h / 2 + 14); ctx.lineTo(w / 2, h / 2 + 40);
        ctx.stroke();

        // hedef uydu
        const s = project(toDevice(tv), w, h, fov);
        const onScreen = !s.behind && s.x > 0 && s.x < w && s.y > 0 && s.y < h;
        if (onScreen) {
            const pulse = 30 + 6 * Math.sin(performance.now() / 200);
            ctx.fillStyle = locked ? 'rgba(16,185,129,0.25)' : 'rgba(6,182,212,0.25)';
            ctx.beginPath(); ctx.arc(s.x, s.y, pulse, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = locked ? '#10b981' : '#06b6d4';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(s.x, s.y, 18, 0, Math.PI * 2); ctx.stroke();
            ctx.font = '22px system-ui, sans-serif';
            ctx.fillText('🛰️', s.x, s.y + 8);
            ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(scene.target.label, s.x, s.y - 40);
        } else {
            drawEdgeArrow(ctx, w, h, s.dx, s.dy);
        }

        if (locked && !wasLocked && navigator.vibrate) navigator.vibrate([80, 40, 80]);
        wasLocked = locked;
    }

    function pushHud() {
        if (!opts) return;
        if (!R || !scene || state.error === null) {
            opts.onHud({ heading: null, pitch: null, error: null, locked: false, guidance: t('ar.waiting') });
            return;
        }
        const dAz = ((scene.target.az - state.heading + 540) % 360) - 180;
        const dEl = scene.target.el - state.pitch;
        const locked = state.error <= LOCK_DEG;
        const parts = [];
        if (Math.abs(dAz) >= 1) parts.push(t(dAz > 0 ? 'ar.right' : 'ar.left', { n: Math.round(Math.abs(dAz)) }));
        if (Math.abs(dEl) >= 1) parts.push(t(dEl > 0 ? 'ar.up' : 'ar.down', { n: Math.round(Math.abs(dEl)) }));
        opts.onHud({
            heading: state.heading,
            pitch: state.pitch,
            error: state.error,
            locked,
            guidance: locked ? t('ar.locked') : (parts.join(' · ') || t('ar.almost')),
            message: relativeOnly ? t('ar.noAbs') : '',
        });
    }

    // ---------------- dış arayüz ----------------

    async function start(o) {
        stop();
        opts = o;
        R = null;
        iosOffset = null;
        relativeOnly = false;
        scene = null;
        state = { heading: null, pitch: null, error: null };
        wasLocked = false;

        ensureAudio(); // kullanıcı tıklaması içinde başlatılmalı
        const sensorOk = await requestSensorPermission();
        if (!sensorOk) {
            o.onHud({ message: t('ar.noPermission') });
        } else {
            listenSensors();
        }

        try {
            if (o.root.requestFullscreen) await o.root.requestFullscreen({ navigationUI: 'hide' });
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('portrait');
        } catch (e) { /* desteklenmiyorsa sorun değil */ }
        try {
            if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) { /* isteğe bağlı */ }

        rafId = requestAnimationFrame(frame);
        hudTimer = setInterval(pushHud, 120);
        beepTimer = setTimeout(beepLoop, 300);

        const camError = await startCamera(o.video);
        if (camError && opts) o.onHud({ message: camError });
    }

    function stop() {
        cancelAnimationFrame(rafId);
        clearInterval(hudTimer);
        clearTimeout(beepTimer);
        clearTimeout(sensorTimer);
        setTone(false);
        if (listenerType) root.removeEventListener(listenerType, onOrientation);
        listenerType = null;
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = null;
        if (opts && opts.video) opts.video.srcObject = null;
        if (wakeLock) wakeLock.release().catch(() => {});
        wakeLock = null;
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
        try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { /* yok say */ }
        opts = null;
    }

    // Konum/uydu/ayar değişince sahneyi yeniden hesapla
    function invalidate() {
        scene = null;
    }

    root.ArYon = { start, stop, invalidate, _internal: { rotationMatrix, project, worldVector } };
})(window);
