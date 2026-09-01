import type { Config } from 'tailwindcss';

/**
 * Design tokens live here and in src/app/globals.css as CSS variables so that
 * runtime theming (high contrast, large text) can override them per-user.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep teal — calm, clinical without being "hospital blue".
        brand: {
          50: '#effcf9',
          100: '#c9f5ec',
          200: '#96e8da',
          300: '#5ed4c3',
          400: '#31b9a8',
          500: '#189c8d',
          600: '#0f7d73',
          700: '#0f645d',
          800: '#10504b',
          900: '#11423f',
          950: '#032622',
        },
        // Warm sand — human, premium, used for large surfaces.
        sand: {
          50: '#fbf9f5',
          100: '#f5f0e6',
          200: '#eae0cb',
          300: '#d9c8a5',
          400: '#c6ab7c',
          500: '#b6935e',
          600: '#a37c52',
          700: '#876346',
          800: '#6f523e',
          900: '#5c4535',
        },
        ink: {
          50: '#f6f7f8',
          100: '#eceef1',
          200: '#d5d9de',
          300: '#b0b8c1',
          400: '#84909e',
          500: '#657283',
          600: '#505b6b',
          700: '#424a57',
          800: '#3a404a',
          900: '#1f242c',
          950: '#13161b',
        },
        success: '#127c4c',
        warning: '#a35b06',
        danger: '#b42318',
        info: '#175cd3',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(19,22,27,0.04), 0 8px 24px -12px rgba(19,22,27,0.12)',
        lift: '0 2px 4px rgba(19,22,27,0.05), 0 18px 40px -18px rgba(19,22,27,0.22)',
      },
      maxWidth: {
        prose: '68ch',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out both',
        'slide-up': 'slide-up .24s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
