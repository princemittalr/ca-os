import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary) / 0.1)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "hsl(var(--secondary) / 0.1)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, var(--secondary)))",
          foreground: "hsl(var(--accent-foreground, var(--secondary-foreground)))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        surface: "hsl(var(--card))",
        base: "hsl(var(--background))",
        sidebar: {
          DEFAULT: "#0F172A",
          foreground: "#CBD5E1",
          accent: "#1E293B",
          muted: "#475569",
        },
        "text-primary": "hsl(var(--foreground))",
        "text-muted": "hsl(var(--muted-foreground))",
        "primary-accent": "hsl(var(--primary))",
        "secondary-accent": "hsl(var(--secondary))",
        "success-green": "hsl(var(--chart-3))",
        "warning-amber": "hsl(var(--chart-4))",
        "error-red": "hsl(var(--chart-5))",

        // Global Design Tokens Colors
        "ca-primary": "var(--color-primary)",
        "ca-primary-hover": "var(--color-primary-hover)",
        "ca-primary-light": "var(--color-primary-light)",
        "ca-accent": "var(--color-accent)",
        "ca-accent-soft": "var(--color-accent-soft)",
        "ca-secondary": "var(--color-secondary)",
        "ca-surface": "var(--color-surface)",
        "ca-surface-hover": "var(--color-surface-hover)",
        "ca-surface-dark": "var(--color-surface-dark)",
        "ca-surface-dark-border": "var(--color-surface-dark-border)",
        "ca-border": "var(--color-border)",
        "ca-border-strong": "var(--color-border-strong)",
        "ca-success": "var(--color-success)",
        "ca-success-soft": "var(--color-success-soft)",
        "ca-warning": "var(--color-warning)",
        "ca-warning-soft": "var(--color-warning-soft)",
        "ca-error": "var(--color-error)",
        "ca-error-soft": "var(--color-error-soft)",
        "ca-info": "var(--color-info)",
        "ca-info-soft": "var(--color-info-soft)",
        "ca-text-primary": "var(--color-text-primary)",
        "ca-text-secondary": "var(--color-text-secondary)",
        "ca-text-tertiary": "var(--color-text-tertiary)",
        "ca-text-inverse": "var(--color-text-inverse)",
      },
      borderRadius: {
        lg: "24px",
        md: "16px",
        sm: "12px",
        "card-outer": "24px",
        "card-inner": "16px",
        "badge-pill": "12px",

        // Global Design Tokens Radii
        "ca-sm": "var(--radius-sm)",
        "ca-md": "var(--radius-md)",
        "ca-lg": "var(--radius-lg)",
        "ca-xl": "var(--radius-xl)",
        "ca-full": "var(--radius-full)",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      fontSize: {
        "ca-hero": "var(--font-hero)",
        "ca-page-title": "var(--font-page-title)",
        "ca-section": "var(--font-section)",
        "ca-card-title": "var(--font-card-title)",
        "ca-body": "var(--font-body)",
        "ca-label": "var(--font-label)",
        "ca-micro": "var(--font-micro)",
      },
      fontWeight: {
        "ca-black": "var(--font-weight-black)",
        "ca-bold": "var(--font-weight-bold)",
        "ca-semibold": "var(--font-weight-semibold)",
        "ca-medium": "var(--font-weight-medium)",
        "ca-regular": "var(--font-weight-regular)",
      },
      letterSpacing: {
        "ca-micro": "var(--font-tracking-micro)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        "card-hover":
          "0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        "card-lg":
          "0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.04)",
        fintech:
          "0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.06)",
        "fintech-md":
          "0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 4px 12px -4px rgba(0, 0, 0, 0.08)",
        "fintech-lg":
          "0 4px 16px -4px rgba(0, 0, 0, 0.08), 0 8px 24px -8px rgba(0, 0, 0, 0.1)",
        topbar:
          "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
        "premium-sm": "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02)",
        "premium-md": "0 8px 30px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)",
        "premium-lg": "0 20px 40px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",

        // Global Design Tokens Shadows
        "ca-card": "var(--shadow-card)",
        "ca-card-hover": "var(--shadow-card-hover)",
        "ca-dropdown": "var(--shadow-dropdown)",
        "ca-modal": "var(--shadow-modal)",
      },
      spacing: {
        "4.5": "1.125rem",
        "8.5": "2.125rem",
        "9.5": "2.375rem",
        "18": "4.5rem",
        "22": "5.5rem",

        // Global Design Tokens Spacing
        "ca-space-1": "var(--space-1)",
        "ca-space-2": "var(--space-2)",
        "ca-space-3": "var(--space-3)",
        "ca-space-4": "var(--space-4)",
        "ca-space-5": "var(--space-5)",
        "ca-space-6": "var(--space-6)",
        "ca-space-8": "var(--space-8)",
        "ca-space-10": "var(--space-10)",
        "ca-space-12": "var(--space-12)",
      },
      transitionDuration: {
        "ca-fast": "var(--transition-fast)",
        "ca-base": "var(--transition-base)",
        "ca-slow": "var(--transition-slow)",
      },
    },
  },
  plugins: [],
};
export default config;
