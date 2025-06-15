/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        terminalGreen: "#33FF33",
        terminalBackground: "#000000",
      },
      fontFamily: {
        mono: ["Fira Code", "monospace"],
      },
      animation: {
        glow: "glow 2s ease-in-out infinite",
        typing: "typing 3s steps(20) infinite",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        glow: {
          "0%, 100%": { textShadow: "0 0 10px #33FF33" },
          "50%": { textShadow: "0 0 20px #33FF33, 0 0 30px #33FF33" },
        },
        typing: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        blink: {
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
