// Web uygulamasını Capacitor'un paketleyeceği www/ klasörüne kopyalar.
import { cpSync, mkdirSync, rmSync, readdirSync } from 'node:fs';

const OUT = 'www';
const DIRS = ['css', 'js', 'vendor', 'icons'];
const FILE_RE = /\.(html|webmanifest|svg|json|enc)$/;
const SKIP = new Set(['package.json', 'package-lock.json', 'capacitor.config.json']);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of readdirSync('.')) {
    if (FILE_RE.test(f) && !SKIP.has(f)) cpSync(f, `${OUT}/${f}`);
}
for (const d of DIRS) cpSync(d, `${OUT}/${d}`, { recursive: true, filter: src => !src.endsWith('kaynak.css') });
console.log('www/ hazır');
