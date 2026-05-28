import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  "#fdfaf2",
          100: "#fbf3df",
          200: "#f6e4bb",
          300: "#f0d18f",
          400: "#eabc63",
          500: "#D4AF37", // Dourado Metálico principal
          600: "#c89b2c",
          700: "#a17625",
          800: "#855f24",
          900: "#704f23",
        },
        "pitch-black": "#000000",
        "dark-surface": "#0a0a0a",
        "dark-card": "#1A1A1A",
        "dark-elevated": "#262626",
        "dark-border": "#333333",
        "text-primary": "#ffffff",
        "text-secondary": "#a1a1aa",
        "text-muted": "#71717a",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-lg": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
        "nav-height": "4.5rem",
      },
      boxShadow: {
        "gold-glow": "0 0 15px rgba(212, 175, 55, 0.15)",
        "gold-glow-lg": "0 0 30px rgba(212, 175, 55, 0.25)",
        "card": "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.4)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(212, 175, 55, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.6)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #eabc63 0%, #D4AF37 50%, #c89b2c 100%)",
        "gold-gradient-h": "linear-gradient(90deg, #c89b2c 0%, #eabc63 50%, #c89b2c 100%)",
        "dark-gradient": "linear-gradient(180deg, #1A1A1A 0%, #000000 100%)",
        shimmer: "linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.05) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
