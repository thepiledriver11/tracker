import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: { DEFAULT: "#CBDEF0", 2: "#E9F2FA", 3: "#D3E4F2" },
        ink: { DEFAULT: "#223449", 2: "#4A6480" },
        muted: "#93A9BF",
        jade: { DEFAULT: "#43DFA2", 2: "#17BA84" },
        amber: "#FFB067",
      },
      borderRadius: {
        lg: "34px",
        md: "22px",
        sm: "15px",
      },
      fontFamily: {
        disp: ["var(--font-outfit)", "Outfit", "-apple-system", "sans-serif"],
        body: ["var(--font-manrope)", "Manrope", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        lift: "0 24px 44px -22px rgba(28,62,96,.42), 0 4px 10px -4px rgba(28,62,96,.14)",
        inner1:
          "inset 0 1px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(150,180,205,.18)",
      },
    },
  },
  plugins: [],
};

export default config;
