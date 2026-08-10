import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        line: "#e5e5e5",
        faint: "#9ca3af",
      },
    },
  },
  plugins: [],
};

export default config;
