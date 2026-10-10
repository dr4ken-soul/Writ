import type { Config } from 'tailwindcss';

/**
 * Tailwind configuration for Writ.
 *
 * Every colour here is a CSS variable reference rather than a hex literal, so
 * the palette lives in exactly one place: src/styles/globals.css. Component
 * files never hardcode a colour.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Schibsted Grotesk"', 'sans-serif'],
        body: ['"Schibsted Grotesk"', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'monospace'],
      },
      maxWidth: {
        container: '1200px',
      },
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          glow: 'var(--accent-glow)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        success: 'var(--success)',
        error: 'var(--error)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        DEFAULT: 'var(--border-default)',
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;