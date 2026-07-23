module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        bg: "#0A0A0B",
        surface: "#131316",
        "surface-hover": "#1A1A1E",
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          hover: "rgba(255,255,255,0.14)",
        },
        text: {
          primary: "#F2F2F3",
          secondary: "#A1A1AA",
          tertiary: "#6B6B70",
        },
        accent: {
          DEFAULT: "#FF6152",
          hover: "#FF7F73",
        },
      },
    },
  },
  plugins: [],
};
