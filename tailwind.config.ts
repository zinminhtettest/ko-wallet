import type { Config } from "tailwindcss";

const config: Config = {
  // Use class-based dark mode so a manual toggle can override the OS default.
  // The <html> element gets `class="dark"` whenever the chosen theme resolves
  // to dark (either explicit Dark choice or System + OS prefers-dark).
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Pyidaungsu",
          "Noto Sans Myanmar",
          "Noto Sans Thai",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
