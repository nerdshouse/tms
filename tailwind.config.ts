import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        background: "#f9f9f8",
        card: "#ffffff",
        accent: "#4a4fe0",
        "accent-hover": "#3f44c8",
        border: "#e5e5e3",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};
export default config;
