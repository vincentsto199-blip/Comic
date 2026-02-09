import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0b10',
          900: '#11111a',
          800: '#1a1a26',
          700: '#242433',
          600: '#2f2f44',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
