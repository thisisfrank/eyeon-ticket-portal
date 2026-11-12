/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        column: 'rgb(var(--column) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        scrim: 'rgb(var(--scrim) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          fill: 'rgb(var(--accent-fill) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
        },
        night: {
          DEFAULT: '#111111',
          2: '#191919',
          3: '#222222',
          line: '#2c2c2c',
        },
        mint: '#86e08a',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.2em',
        tightest: '-0.035em',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 17, 17, 0.04)',
        lift: '0 14px 32px -14px rgba(17, 17, 17, 0.22)',
        glow: '0 0 0 4px rgba(90, 163, 68, 0.18)',
        cta: '0 0 0 1px rgba(134, 224, 138, 0.25), 0 10px 30px -8px rgba(90, 163, 68, 0.55)',
      },
    },
  },
  plugins: [],
};
