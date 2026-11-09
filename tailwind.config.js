/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f4f4f2',
        card: '#ffffff',
        column: '#ebebe7',
        line: '#e3e3df',
        'line-strong': '#cdcdc7',
        ink: '#111111',
        body: '#3d3d3a',
        muted: '#6e6e69',
        faint: '#9b9b95',
        accent: {
          DEFAULT: '#3f7d2e',
          fill: '#5aa344',
          hover: '#4e9339',
          soft: '#edf5e8',
          ink: '#0f1f0a',
        },
        night: {
          DEFAULT: '#111111',
          2: '#191919',
          3: '#222222',
          line: '#2c2c2c',
        },
        mint: '#86e08a',
        danger: '#c2410c',
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
