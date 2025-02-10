/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./public/**/*.{html,js}"], // Look for Tailwind classes in our files
    theme: {
      extend: {
        colors: {
          terminalGreen: "#33FF33", // Green text for terminal style
          terminalBackground: "#000000", // Black background
        },
        fontFamily: {
          mono: ["Fira Code", "monospace"], // Use a hacker-style font
        },
      },
    },
    plugins: [],
  };
  