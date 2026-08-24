import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bgBase: "#09090b",
        cardBg: "rgba(24, 24, 27, 0.6)",
        cardBorder: "rgba(255, 255, 255, 0.08)",
        accent: "#3b82f6",
      },
    },
  },
  plugins: [],
};

export default config;
