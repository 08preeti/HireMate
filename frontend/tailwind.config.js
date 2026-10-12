/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // HireMate brand palette (previously hard-coded as hex in inline styles)
        brand: {
          DEFAULT: "#006491",
          dark: "#004f73",
          light: "#e8f4f8",
        },
        danger: {
          DEFAULT: "#E8002A",
          dark: "#c0001f",
        },
      },
      fontFamily: {
        // body font stack from the old index.css
        app: ["Inter", "sans-serif"],
        // pages that explicitly set `font-family: sans-serif`
        plain: ["sans-serif"],
      },
      keyframes: {
        "slide-in": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".4" },
        },
        "pulse-mic": {
          "0%, 100%": {
            boxShadow: "0 0 0 8px rgba(232,0,42,.2), 0 4px 16px rgba(232,0,42,.4)",
          },
          "50%": {
            boxShadow: "0 0 0 16px rgba(232,0,42,.1), 0 4px 16px rgba(232,0,42,.4)",
          },
        },
      },
      animation: {
        "slide-in": "slide-in .3s ease",
        "slide-up": "slide-up .4s ease",
        "pulse-mic": "pulse-mic 1s ease-in-out infinite",
        "pulse-soft": "pulse-soft 1.5s infinite",
      },
    },
  },
  plugins: [],
};
