// node_modules'teki kütüphaneleri vendor/ klasörüne kopyalar (CDN'siz, çevrimdışı çalışma için).
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const NM = 'node_modules';
rmSync('vendor', { recursive: true, force: true });
mkdirSync('vendor/leaflet', { recursive: true });
mkdirSync('vendor/fontawesome/css', { recursive: true });

cpSync(`${NM}/alpinejs/dist/cdn.min.js`, 'vendor/alpine.min.js');
cpSync(`${NM}/leaflet/dist/leaflet.js`, 'vendor/leaflet/leaflet.js');
cpSync(`${NM}/leaflet/dist/leaflet.css`, 'vendor/leaflet/leaflet.css');
cpSync(`${NM}/leaflet/dist/images`, 'vendor/leaflet/images', { recursive: true });
cpSync(`${NM}/@fortawesome/fontawesome-free/css/all.min.css`, 'vendor/fontawesome/css/all.min.css');
cpSync(`${NM}/@fortawesome/fontawesome-free/webfonts`, 'vendor/fontawesome/webfonts', { recursive: true });
cpSync(`${NM}/@fortawesome/fontawesome-free/LICENSE.txt`, 'vendor/fontawesome/LICENSE.txt');
console.log('vendor/ güncellendi');
