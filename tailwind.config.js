// tailwind.config.js
export default {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins','ui-sans-serif','system-ui','sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#1DA1F2', // biru
          light:   '#6BEAF8', // cyan muda
          dark:    '#0D2857', // biru tua gelap untuk gradient
          colors: {
  brand: {
    DEFAULT: '#208BE3',
    dark: '#0B64C0',
    light: '#7EE5FF',
  },
}

        },
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(29,161,242,.35)',
      },
      backgroundImage: {
        // latar utama app: dua radial + linear gelap
        'app-gradient':
          'radial-gradient(1200px circle at 20% -10%, rgba(13,110,253,.14), transparent 60%), radial-gradient(900px circle at 110% 0%, rgba(107,234,248,.10), transparent 45%), linear-gradient(180deg, #0B1220 0%, #0A0F1A 100%)',
        // bar header: tipis & glossy
        'header-gradient':
          'linear-gradient(180deg, rgba(9,14,25,.85) 0%, rgba(9,14,25,.60) 100%)',
        // aksen panel/card
        'panel-gradient':
          'linear-gradient(180deg, rgba(16,29,49,.6) 0%, rgba(12,21,37,.4) 100%)',
      },
    },
  },
  plugins: [],
}
