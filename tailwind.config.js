/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./*.html', './js/**/*.js'],
    theme: {
        extend: {
            colors: {
                // Görseldeki lacivert / lavanta tema
                navy: { 950: '#17163a', 900: '#1f1d4d', 800: '#282660', 700: '#343178', 600: '#45419a' },
                lav: { 50: '#f4f2ff', 100: '#e9e6ff', 200: '#d8d3fb', 400: '#a99ff5', 500: '#7c6cf2', 600: '#6252e0' },
                surface: '#eceef4',
                ink: { 900: '#1d1c33', 700: '#3b3a55', 500: '#6b6a85', 400: '#8d8ca6' },
            },
            fontFamily: {
                sans: ['"Montserrat"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
            },
            boxShadow: {
                card: '0 1px 2px rgba(23,22,58,0.06), 0 4px 14px rgba(23,22,58,0.06)',
            },
        },
    },
    plugins: [],
};
