/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./components/**/*.html", "./pages/**/*.html", "./assets/js/**/*.js"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["Sora", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 45px rgba(15,23,42,0.12)",
        soft: "0 8px 24px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};
