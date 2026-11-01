/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          950: '#09090b',
          900: '#121215',
          850: '#1a1a1f',
          800: '#222228',
          700: '#33333d',
        },
        brand: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#ec4899',
          emerald: '#10b981',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glow: {
          '0%': { opacity: '0.4', filter: 'blur(30px)' },
          '100%': { opacity: '0.8', filter: 'blur(45px)' },
        }
      }
    },
  },
  plugins: [],
}

