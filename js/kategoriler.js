/*
 * Kanal kategorileri. Veride kategori alanı olmadığı için kanal adından tahmin edilir.
 * Desenler CepteVeri.normalize() ile küçültülmüş, Türkçe karaktersiz ada uygulanır.
 */
(function (root) {
    'use strict';

    const CATEGORIES = [
        { key: 'spor', label: 'Spor', icon: 'fa-futbol', re: /spor|sport|arena|golf|racing|\bnba\b|\bnfl\b|\bufc\b|fight|motorvision|\bmatch\b/ },
        { key: 'haber', label: 'Haber', icon: 'fa-newspaper', re: /haber|news|\bcnn|euronews|al jazeera|\bntv\b|france 24|trt world|\bnhk\b|sky tg|\bhalk tv|\btele1\b/ },
        { key: 'belgesel', label: 'Belgesel', icon: 'fa-earth-europe', re: /belgesel|docu|discovery|nat ?geo|national geographic|history|animal|planet|explore|da vinci|nature/ },
        { key: 'film', label: 'Film & Dizi', icon: 'fa-film', re: /film|movie|cinema|sinema|\bcine|dizi|series|\bhbo|\bamc\b/ },
        { key: 'cocuk', label: 'Çocuk', icon: 'fa-child', re: /cocuk|kids?\b|cartoon|disney|nick|baby|junior|minika|boomerang|jim jam|toon/ },
        { key: 'muzik', label: 'Müzik', icon: 'fa-music', re: /muzik|music|\bmtv|\bkral|\bvh1|clubbing|\bdance\b/ },
        { key: 'radyo', label: 'Radyo', icon: 'fa-radio', re: /radio|radyo|\bfm\b/ },
        { key: 'uhd', label: '4K / UHD', icon: 'fa-tv', re: /\b(4k|uhd|8k)\b/ },
        { key: 'hd', label: 'HD', icon: 'fa-tv', re: /\bhd\b|\bfhd\b/ },
    ];

    /** Normalize edilmiş kanal adından kategori anahtarları listesi döndürür. */
    function detect(normalizedName) {
        const keys = [];
        for (const c of CATEGORIES) {
            if (c.re.test(normalizedName)) keys.push(c.key);
        }
        // "UHD" kanallar HD sayılmasın
        if (keys.includes('uhd')) return keys.filter(k => k !== 'hd');
        return keys;
    }

    root.CepteKategori = { CATEGORIES, detect };
})(window);
