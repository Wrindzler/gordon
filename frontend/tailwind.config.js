/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* ULVİS: Ana aksiyon #006D77 · Vurgu #83C5BE · Arka plan #F8F9FA · Metin #212529 */
        primary: {
          50: '#e8f6f4',
          100: '#d0ebe8',
          200: '#a8d9d4',
          300: '#83C5BE',
          400: '#4a9e9e',
          500: '#008a94',
          600: '#006D77',
          700: '#005c64',
          800: '#004a52',
          900: '#003840',
          950: '#00262b',
        },
        brand: {
          action: '#006D77',
          'action-dark': '#005c64',
          mint: '#83C5BE',
          'mint-soft': '#e8f6f4',
          canvas: '#F8F9FA',
          ink: '#212529',
          'ink-muted': '#495057',
          warning: '#FFB703',
          danger: '#D90429',
        },
        surface: {
          50: '#F8F9FA',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(15, 23, 42, 0.08), 0 4px 16px -4px rgba(15, 23, 42, 0.06)',
        'soft-lg': '0 4px 20px -4px rgba(15, 23, 42, 0.1), 0 8px 32px -8px rgba(15, 23, 42, 0.08)',
        'glow': '0 0 40px -8px rgba(99, 102, 241, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(at 20% 20%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%), radial-gradient(at 80% 50%, rgba(59, 130, 246, 0.12) 0px, transparent 50%)',
      }
    },
  },
  plugins: [],
}
