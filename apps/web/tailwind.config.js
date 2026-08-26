/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        'surface-base': '#0a0a0b',
        'surface-card': '#141312',
        'surface-elevated': '#1a1918',
        'surface-code': '#1f2937',
        'surface-border': 'rgba(229, 231, 235, 0.08)',
        amber: {
          DEFAULT: '#e8a33d',
          hover: '#f0b252',
          accent: '#e8a33d',
          dim: 'rgba(232, 163, 61, 0.12)',
          border: 'rgba(232, 163, 61, 0.3)',
          light: '#fde68a',
          dark: '#b45309',
        },
        'pure-black': '#000000',
        text: {
          primary: '#f5f3ee',
          muted: '#a09f9c',
          subtle: '#4b5563',
          dark: '#000000',
        },
        border: {
          subtle: 'rgba(229, 231, 235, 0.08)',
          card: 'rgba(229, 231, 235, 0.12)',
          amber: 'rgba(232, 163, 61, 0.35)',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Instrument Serif', 'Georgia', 'serif'],
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'Fira Code',
          'Courier New',
          'monospace',
        ],
      },
      letterSpacing: {
        tightest: '-0.45px',
        mono: '0.6px',
        'mono-wide': '1px',
        'mono-wider': '1.5px',
      },
      borderRadius: {
        'radius-xs': '2px',
        'radius-sm': '4px',
        'radius-md': '6px',
        'radius-lg': '8px',
        'radius-xl': '12px',
        'radius-2xl': '16px',
        'radius-pill': '9999px',
      },
      boxShadow: {
        amber: '0 0 20px -2px rgba(232, 163, 61, 0.35)',
        'amber-sm': '0 0 10px -2px rgba(232, 163, 61, 0.25)',
        card: '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
