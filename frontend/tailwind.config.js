export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f4f5f7', /* Very soft light grey */
        surface: '#ffffff',    /* Pure white surfaces */
        primary: '#111827',    /* Deep black/dark grey text */
        secondary: '#6b7280',  /* Muted grey text */
        accent: '#000000',     /* Solid black for pills and active states */
        border: '#e5e7eb',     /* Faint grey border */
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100%)' }
        }
      },
      animation: {
        ticker: 'ticker 30s linear infinite',
      }
    },
  },
  plugins: [],
}
