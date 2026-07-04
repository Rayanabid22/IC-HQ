import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0B",
        elevated: "#111113",
        card: "#18181B",
        hairline: "rgba(255,255,255,0.06)",
        ic: {
          blue: "var(--ic-blue)",
          green: "#30D158",
          amber: "#FFD60A",
          red: "#FF453A",
          purple: "#BF5AF2",
        },
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        heading: "-0.02em",
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(0,0,0,0.4)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "check-pop": {
          "0%": { transform: "scale(0.6)" },
          "55%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite",
        "check-pop": "check-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      },
    },
  },
  plugins: [],
};
export default config;
