import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "ui-serif", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
