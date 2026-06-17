import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152034",
        muted: "#627084",
        line: "#d9e1ea",
        panel: "#f7f9fc",
        brand: "#146c63",
        accent: "#c45a2a"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(21, 32, 52, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
