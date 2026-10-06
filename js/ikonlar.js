/* CepteUydu - ana ekran kartlarının renkli simgeleri (satır içi SVG). */
(function (root) {
    'use strict';

    const ICONS = {
        finder: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" fill="#e6f6f8"/>
            <path d="M14 26a22 22 0 0 0 24 24z" fill="#1f6f86"/>
            <path d="M16 28a19 19 0 0 0 20 20z" fill="#2aa7b8"/>
            <path d="M26 38 40 24" stroke="#1f2a44" stroke-width="3" stroke-linecap="round"/>
            <circle cx="41.5" cy="22.5" r="3.5" fill="#1f2a44"/>
            <path d="M22 48l-4 8h14l-3-8" fill="#1f2a44"/>
            <path d="M45 14a8 8 0 0 1 6 6M46 8a14 14 0 0 1 11 11" stroke="#2aa7b8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`,
        map: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="30" cy="34" r="20" fill="#5bc0eb"/>
            <path d="M18 24c6-2 8 3 13 2s5 6 0 8-4 8-9 7-7-5-6-9 0-6 2-8z" fill="#7bd389"/>
            <path d="M36 42c3-3 8-2 9 1s-3 7-7 6-4-4-2-7z" fill="#7bd389"/>
            <path d="M33 16c3-2 8 0 9 3" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
            <g transform="rotate(-35 46 16)">
                <rect x="41" y="12" width="10" height="8" rx="2" fill="#f4b740"/>
                <rect x="31" y="13.5" width="9" height="5" fill="#3a6ea5"/>
                <rect x="52" y="13.5" width="9" height="5" fill="#3a6ea5"/>
            </g>
        </svg>`,
        location: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="32" cy="55" rx="12" ry="3.5" fill="#cfd4e2"/>
            <path d="M32 6c-10.5 0-18 7.6-18 17.5C14 37 32 54 32 54s18-17 18-30.5C50 13.6 42.5 6 32 6z" fill="#1f3c88"/>
            <circle cx="32" cy="23.5" r="9" fill="#f6a13a"/>
            <circle cx="32" cy="23.5" r="4" fill="#fff"/>
        </svg>`,
        compass: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="25" fill="#1f2a44"/>
            <circle cx="32" cy="32" r="21" fill="#2c3a5c" stroke="#5a6b91" stroke-width="1"/>
            <g stroke="#9aa8c7" stroke-width="1.5">
                <path d="M32 12v4M32 48v4M12 32h4M48 32h4"/>
            </g>
            <path d="M32 15l5 17h-10z" fill="#e94b4b"/>
            <path d="M32 49l-5-17h10z" fill="#e8ecf5"/>
            <circle cx="32" cy="32" r="3" fill="#f4b740"/>
        </svg>`,
        level: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <g transform="rotate(-30 32 32)">
                <rect x="6" y="24" width="52" height="16" rx="3" fill="#f4b740"/>
                <rect x="6" y="24" width="52" height="5" rx="2" fill="#f7c968"/>
                <g stroke="#b9822a" stroke-width="1.5"><path d="M12 34v4M17 35v3M44 35v3M49 34v4M54 35v3"/></g>
                <rect x="23" y="27" width="18" height="10" rx="5" fill="#bfeec6" stroke="#2f9e57" stroke-width="1.5"/>
                <circle cx="32" cy="32" r="3" fill="#2f9e57"/>
            </g>
        </svg>`,
        channels: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="8" y="14" width="48" height="32" rx="4" fill="#3a3780"/>
            <rect x="12" y="18" width="40" height="24" rx="2" fill="#7c6cf2"/>
            <g fill="#fff"><rect x="16" y="22" width="20" height="3" rx="1.5"/><rect x="16" y="28" width="28" height="3" rx="1.5" opacity=".8"/><rect x="16" y="34" width="16" height="3" rx="1.5" opacity=".6"/></g>
            <path d="M24 50h16M32 46v4" stroke="#3a3780" stroke-width="3" stroke-linecap="round"/>
            <path d="M24 8l8 6 8-6" stroke="#3a3780" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>`,
        area: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M8 16l14-5 20 6 14-5v38l-14 5-20-6-14 5z" fill="#e8f3e2"/>
            <path d="M22 11v38M42 17v38" stroke="#b9d6a8" stroke-width="2"/>
            <path d="M8 16l14-5 20 6 14-5v38l-14 5-20-6-14 5z" fill="none" stroke="#6aa84f" stroke-width="2"/>
            <path d="M14 40l10-12 12 6 10-10" stroke="#3a86ff" stroke-width="2.5" fill="none" stroke-dasharray="3 3"/>
            <path d="M46 6c-5 0-8.5 3.6-8.5 8 0 6 8.5 13 8.5 13s8.5-7 8.5-13c0-4.4-3.5-8-8.5-8z" fill="#e94b4b"/>
            <circle cx="46" cy="14" r="3" fill="#fff"/>
        </svg>`,
        network: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M32 26 22 58h20z" fill="none" stroke="#1f2a44" stroke-width="3" stroke-linejoin="round"/>
            <path d="M26 44h12M24 51h16" stroke="#1f2a44" stroke-width="2.5"/>
            <circle cx="32" cy="22" r="5" fill="#2f9e57"/>
            <path d="M22 14a14 14 0 0 0 0 16M42 14a14 14 0 0 1 0 16" stroke="#2f9e57" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M15 8a23 23 0 0 0 0 28M49 8a23 23 0 0 1 0 28" stroke="#7bd389" stroke-width="3" fill="none" stroke-linecap="round"/>
        </svg>`,
        ar: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="18" y="6" width="28" height="52" rx="5" fill="#1f2a44"/>
            <rect x="21" y="11" width="22" height="40" rx="2" fill="#5bc0eb"/>
            <path d="M21 40c6-6 10-3 14-8s6-3 8-2v21H21z" fill="#3e8e5e"/>
            <circle cx="35" cy="20" r="5" fill="none" stroke="#fff" stroke-width="2"/>
            <path d="M35 13v3M35 24v3M28 20h3M39 20h3" stroke="#fff" stroke-width="2"/>
        </svg>`,
    };

    root.CepteIkon = name => ICONS[name] || '';
})(window);
