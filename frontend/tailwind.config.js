/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // St. Mary's / Wolastoq Casino brand palette (from stmec.com)
        navy:   { DEFAULT: '#32373C', light: '#4A5057', dark: '#1E2226' }, // charcoal nav
        gold:   { DEFAULT: '#FDD01F', light: '#FFE150', dark: '#D4AC00' }, // brand yellow
        orange: { DEFAULT: '#ED710D', light: '#F59B17', dark: '#C45E08' }, // brand orange
        stblue: { DEFAULT: '#2665A1', light: '#3A80C4', dark: '#1A4A7A' }, // St. Mary's blue
        bingo: {
          vacant:   '#22C55E',
          held:     '#F59E0B',
          mine:     '#3B82F6',
          sold:     '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
