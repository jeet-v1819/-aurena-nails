/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./utils/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        aurena: {
          cream: "#FDFBF9",
          beige: "#F6EFEA",
          nude: "#EEDFD5",
          blush: "#F4D9D6",
          rose: "#C88D83",
          rosegold: "#B76E79",
          gold: "#C59B76",
          charcoal: "#221E1D",
          muted: "#6E625F",
          border: "#E8D8CE"
        }
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        luxury: "0 12px 40px -10px rgba(183, 110, 121, 0.14)",
        soft: "0 4px 20px -2px rgba(34, 30, 29, 0.06)"
      }
    }
  },
  plugins: []
};
