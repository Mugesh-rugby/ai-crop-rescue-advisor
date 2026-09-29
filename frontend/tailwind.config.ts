import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: "#f2f8f0",
          100: "#dfeed9",
          200: "#bfdcb6",
          300: "#96c485",
          400: "#6ba656",
          500: "#4c8a38",
          600: "#396c2a",
          700: "#2e5523",
          800: "#28451f",
          900: "#213a1c",
          950: "#0f200d",
        },
        soil: {
          50: "#f7f4f0",
          100: "#e9e0d3",
          500: "#7a5c3e",
          700: "#4d3a27",
          900: "#2b2115",
        },
        rescue: {
          low: "#4c8a38",
          medium: "#c98a1e",
          high: "#c9581e",
          critical: "#b0231d",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
