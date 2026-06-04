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
        neon: {
          50: "#fff0e6",
          100: "#ffe0cc",
          200: "#ffc299",
          300: "#ffa366",
          400: "#ff8533",
          500: "#FF6B00", // Laranja Neon principal
          600: "#cc5600",
          700: "#994000",
          800: "#662b00",
          900: "#331500",
        },
        "pitch-black": "#000000",
        "dark-surface": "#050505",
        "dark-card": "#0F0F11",
        "dark-elevated": "#161618",
        "dark-border": "#222224",
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
        "neon-glow": "0 0 15px rgba(255, 107, 0, 0.25)",
        "neon-glow-lg": "0 0 30px rgba(255, 107, 0, 0.4)",
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
        "pulse-neon": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(255, 107, 0, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(255, 107, 0, 0.6)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
      },
      backgroundImage: {
        "neon-gradient": "linear-gradient(135deg, #ff8533 0%, #FF6B00 50%, #cc5600 100%)",
        "neon-gradient-h": "linear-gradient(90deg, #cc5600 0%, #ff8533 50%, #cc5600 100%)",
        "dark-gradient": "linear-gradient(180deg, #0F0F11 0%, #000000 100%)",
        shimmer: "linear-gradient(90deg, transparent 0%, rgba(255, 107, 0, 0.05) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
