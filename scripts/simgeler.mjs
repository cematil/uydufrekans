// Android simgeleri, açılış ekranları ve Play Store görsellerini icon.svg'den üretir.
// Çalıştırmak için Playwright gerekir:  npx playwright@1 install chromium  (bir kez)
//                                        node scripts/simgeler.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const icon = readFileSync('icon.svg', 'utf8');
// Uyarlanabilir simge ön planı: yalnızca çanak şekli, beyaz, şeffaf zemin, güvenli alan içinde
const glyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <g transform="translate(54 56) scale(0.155) translate(-291 -245)" fill="#ffffff" stroke="#ffffff">
    <path d="M150 190 a150 150 0 0 0 172 172 z" stroke="none"/>
    <path d="M236 276 L330 182" stroke-width="22" stroke-linecap="round" fill="none"/>
    <circle cx="338" cy="174" r="22" stroke="none"/>
    <path d="M190 362 L170 410 L280 410 L258 362" stroke="none"/>
    <path d="M352 120 a60 60 0 0 1 40 40" stroke="#7fe3f2" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M356 80 a100 100 0 0 1 76 76" stroke="#7fe3f2" stroke-width="16" fill="none" stroke-linecap="round"/>
  </g></svg>`;

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const RES = 'android/app/src/main/res';

const b = await chromium.launch();
async function render(html, w, h, path, transparent = false) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<html><body style="margin:0;${transparent ? 'background:transparent' : ''}">${html}</body></html>`);
    await p.screenshot({ path, omitBackground: transparent });
    await p.close();
}
const sized = (svg, w, h) => svg.replace('<svg ', `<svg width="${w}" height="${h}" `);

for (const [d, k] of Object.entries(DENS)) {
    const dir = `${RES}/mipmap-${d}`;
    const legacy = Math.round(48 * k), fg = Math.round(108 * k);
    await render(sized(icon, legacy, legacy), legacy, legacy, `${dir}/ic_launcher.png`, true);
    await render(`<div style="width:${legacy}px;height:${legacy}px;border-radius:50%;overflow:hidden">${sized(icon, legacy, legacy)}</div>`, legacy, legacy, `${dir}/ic_launcher_round.png`, true);
    await render(sized(glyph, fg, fg), fg, fg, `${dir}/ic_launcher_foreground.png`, true);
}

// Açılış ekranı: lacivert zemin + ortada simge
const splash = (w, h) => {
    const s = Math.round(Math.min(w, h) * 0.32);
    return `<div style="width:${w}px;height:${h}px;background:#1f1d4d;display:flex;align-items:center;justify-content:center">${sized(icon, s, s)}</div>`;
};
const SPLASH = {
    'drawable': [480, 320],
    'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
    'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
    'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
};
for (const [dir, [w, h]] of Object.entries(SPLASH)) await render(splash(w, h), w, h, `${RES}/${dir}/splash.png`);

// Play Store: 512x512 simge ve 1024x500 öne çıkan görsel
mkdirSync('store', { recursive: true });
await render(sized(icon, 512, 512), 512, 512, 'store/play-icon-512.png');
await render(`<div style="width:1024px;height:500px;background:linear-gradient(135deg,#282660,#17163a);display:flex;align-items:center;gap:48px;padding:0 80px;box-sizing:border-box;font-family:Montserrat,system-ui,sans-serif;color:#fff">
    ${sized(icon, 240, 240)}
    <div><div style="font-size:72px;font-weight:800;letter-spacing:1px">CepteUydu</div>
    <div style="font-size:30px;color:#d8d3fb;margin-top:12px">Uydu Bulucu · Satellite Finder</div>
    <div style="font-size:22px;color:#a99ff5;margin-top:18px">AR · Pusula · Su Terazisi · Frekans Rehberi</div></div></div>`, 1024, 500, 'store/feature-graphic-1024x500.png');
await b.close();
console.log('Simgeler ve görseller üretildi');
