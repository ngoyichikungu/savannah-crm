/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        savannah: {
          50: '#fbf9f5',
          100: '#f6f1e8',
          200: '#ebdcc7',
          500: '#b88a44',
          600: '#9b6c2d',
          700: '#7e5323',
          800: '#674220',
          900: '#54361d',
        }
      }
    },
  },
  plugins: [],
}
