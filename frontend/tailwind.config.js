/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Command Center's own aesthetic reference: terminal/hacker-console,
        // already implied by the existing copy ("Decrypting Terminal...",
        // Cyberpunk theme, mono-set PINs/passcodes) — Space Grotesk gives
        // headers a distinctive geometric weight, JetBrains Mono replaces the
        // generic system mono stack everywhere `font-mono` is already used.
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        surfaceHover: "var(--color-surface-hover)",
        border: "var(--color-border)",
        textPrimary: "var(--color-text-primary)",
        textSecondary: "var(--color-text-secondary)",
        accent: "var(--color-accent)",
        accentHover: "var(--color-accent-hover)",
        danger: "var(--color-danger)",
        dangerBg: "var(--color-danger-bg)",
        success: "var(--color-success)",
      }
    },
  },
  plugins: [],
}