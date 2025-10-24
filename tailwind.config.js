
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#7C3AED',
          fg: '#A78BFA',
        },
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(124, 58, 237, 0.3)',
      }
    },
  },
  plugins: [],
}
