// Kodda kullanılan t('...') anahtarlarının js/dil.js içinde iki dilde de bulunduğunu denetler.
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.runInNewContext(readFileSync('js/dil.js', 'utf8'), ctx);
const { tr, en } = ctx.window.CEPTE_DIL;

const files = [...readdirSync('.').filter(f => f.endsWith('.html')), ...readdirSync('js').map(f => 'js/' + f)];
const used = new Set();
for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/'((?:nav|ar|find|common|tkgs|home|cat|dir|data\.src)\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
}
// Dinamik anahtarlar
for (const k of ['github', 'cache', 'bundled']) used.add('data.src.' + k);
for (const k of ['spor', 'haber', 'belgesel', 'film', 'cocuk', 'muzik', 'radyo', 'uhd', 'hd']) used.add('cat.' + k);

used.delete('data.src.');
let bad = 0;
for (const k of [...used].sort()) {
    if (!(k in tr)) { console.log('TR eksik:', k); bad++; }
    if (!(k in en)) { console.log('EN eksik:', k); bad++; }
}
for (const k of Object.keys(tr)) if (!(k in en)) { console.log('EN eksik (sözlük):', k); bad++; }
for (const k of Object.keys(en)) if (!(k in tr)) { console.log('TR eksik (sözlük):', k); bad++; }
console.log(bad ? `${bad} sorun` : `Tamam: ${used.size} anahtar iki dilde de var`);
process.exit(bad ? 1 : 0);
