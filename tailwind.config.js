/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: { DEFAULT: '#0B3B2E', deep: '#072A20', light: '#12563F' },
        chalk: '#F2F5EF',
        ink: '#10241D',
        flame: '#FF6B1A',
        bleu: '#1D6FE0',
        jaune: '#FFC400',
        rouge: '#E03131'
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        num: ['"Barlow Condensed"', 'sans-serif']
      },
      boxShadow: { board: '0 2px 0 0 rgba(0,0,0,.35)' }
    }
  },
  plugins: []
}
