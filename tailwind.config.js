/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#4A90E2",
        card: "#111111",
        bg: "#0D0D0D"
      }
    },
  },
  plugins: [],
}
