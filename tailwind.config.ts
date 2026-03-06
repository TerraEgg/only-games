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
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        accent: {
          DEFAULT: "var(--accent-500, #00ABED)",
          300: "var(--accent-300, #5CC8F2)",
          400: "var(--accent-400, #2BB8EF)",
          500: "var(--accent-500, #00ABED)",
          600: "var(--accent-600, #0091CC)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
